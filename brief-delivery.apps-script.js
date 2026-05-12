const SCRIPT_PROPERTY_KEYS = {
  TELEGRAM_BOT_TOKEN: "TELEGRAM_BOT_TOKEN",
  TELEGRAM_CHAT_ID: "TELEGRAM_CHAT_ID"
};

function doPost(event) {
  try {
    const payload = parseBriefPayload(event);
    const deliverySettings = readDeliverySettings();
    deliverBriefToTelegram(payload, deliverySettings);

    return jsonResponse({
      ok: true,
      deliveredTo: "telegram"
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error && error.message ? error.message : "Brief delivery failed."
    });
  }
}

function parseBriefPayload(event) {
  const rawBody = event && event.postData && event.postData.contents;
  if (!rawBody) {
    throw new Error("Request body is empty.");
  }

  const payload = JSON.parse(rawBody);
  if (!payload.contacts || !payload.sections || !payload.report) {
    throw new Error("Brief payload has an unexpected format.");
  }

  return payload;
}

function readDeliverySettings() {
  const properties = PropertiesService.getScriptProperties();
  return {
    telegramBotToken: properties.getProperty(SCRIPT_PROPERTY_KEYS.TELEGRAM_BOT_TOKEN),
    telegramChatId: properties.getProperty(SCRIPT_PROPERTY_KEYS.TELEGRAM_CHAT_ID)
  };
}

function deliverBriefToTelegram(payload, deliverySettings) {
  if (!deliverySettings.telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  if (!deliverySettings.telegramChatId) {
    throw new Error("TELEGRAM_CHAT_ID is not configured.");
  }

  sendBriefTelegramDocument(payload, deliverySettings.telegramBotToken, deliverySettings.telegramChatId);
}

function sendBriefTelegramDocument(payload, botToken, chatId) {
  const apiUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;
  const reportHtml = payload.report.html || buildPlainTextBrief(payload);
  const reportFileName = ensureHtmlFileName(payload.report.fileName);
  const reportBlob = Utilities.newBlob(reportHtml, "text/html", reportFileName);

  const response = UrlFetchApp.fetch(apiUrl, {
    method: "post",
    muteHttpExceptions: true,
    payload: {
      chat_id: chatId,
      caption: buildTelegramCaption(payload),
      document: reportBlob
    }
  });

  const statusCode = response.getResponseCode();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Telegram document delivery failed with status ${statusCode}.`);
  }
}

function buildBriefSubject(payload) {
  const companyName = normalizeText(payload.contacts.companyName);
  const clientName = normalizeText(payload.contacts.clientName);
  const projectName = companyName !== "—" ? companyName : clientName;
  return `Новый бриф на сайт: ${projectName}`;
}

function buildTelegramCaption(payload) {
  const contacts = payload.contacts || {};
  const lines = [
    buildBriefSubject(payload),
    `Компания: ${normalizeText(contacts.companyName)}`,
    `Имя: ${normalizeText(contacts.clientName)}`,
    `Телефон: ${normalizeText(contacts.phone)}`,
    `Email: ${normalizeText(contacts.email)}`
  ];

  return truncateTelegramCaption(lines.join("\n"));
}

function buildPlainTextBrief(payload) {
  const contacts = payload.contacts || {};
  const lines = [
    buildBriefSubject(payload),
    "",
    `Дата отправки: ${formatDate(payload.submittedAt)}`,
    `Источник: ${normalizeText(payload.source && payload.source.url)}`,
    "",
    "Контакты",
    `Имя: ${normalizeText(contacts.clientName)}`,
    `Компания: ${normalizeText(contacts.companyName)}`,
    `Телефон: ${normalizeText(contacts.phone)}`,
    `Email: ${normalizeText(contacts.email)}`,
    "",
    "Ответы"
  ];

  (payload.sections || []).forEach((section) => {
    lines.push("", section.title);
    (section.fields || []).forEach((field) => {
      lines.push(`${field.label}: ${normalizeText(field.displayValue)}`);
    });
  });

  return lines.join("\n");
}

function normalizeText(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "—";
  }
  if (value === null || value === undefined || String(value).trim() === "") {
    return "—";
  }
  return String(value).trim();
}

function formatDate(isoDate) {
  const date = isoDate ? new Date(isoDate) : new Date();
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd.MM.yyyy HH:mm");
}

function ensureHtmlFileName(fileName) {
  const safeFileName = normalizeText(fileName);
  if (safeFileName === "—") {
    return "brief.html";
  }
  return /\.html?$/i.test(safeFileName) ? safeFileName : `${safeFileName}.html`;
}

function truncateTelegramCaption(text) {
  const maxLength = 1024;
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
