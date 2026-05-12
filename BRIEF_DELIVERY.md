# Настройка отправки брифа

Проект остается статическим HTML-файлом для GitHub Pages. Отправка работает через Google Apps Script Web App: публичный `index.html` отправляет структурированный JSON на endpoint, а Apps Script передает HTML-файл брифа Telegram-боту. Бот отправляет файл в указанную группу Telegram.

## Что где хранится

- `index.html`: единственное место для публичного `endpointUrl` Google Apps Script Web App.
- Google Apps Script Properties: единственное место для Telegram token и Telegram chat ID.
- `brief-delivery.apps-script.js`: код Web App без секретов.

Новых npm/pip-зависимостей нет.

## Деплой Google Apps Script

1. Откройте [script.google.com](https://script.google.com/) и создайте новый проект.
2. Вставьте содержимое `brief-delivery.apps-script.js` в файл `Code.gs`.
3. Откройте `Project Settings` → `Script properties` и добавьте:
   - `TELEGRAM_BOT_TOKEN`: токен Telegram-бота от BotFather.
   - `TELEGRAM_CHAT_ID`: chat ID группы, куда бот должен отправлять файл брифа.
4. Нажмите `Deploy` → `New deployment` → тип `Web app`.
5. Укажите:
   - `Execute as`: `Me`.
   - `Who has access`: `Anyone`.
6. Скопируйте Web App URL, который заканчивается на `/exec`.
7. В `index.html` вставьте URL в единственное место настройки:

```js
const briefDeliverySettings = {
  endpointUrl: "https://script.google.com/macros/s/XXXXX/exec"
};
```

## Telegram

Секреты Telegram нельзя хранить в публичном frontend-коде. Токен бота и `chat_id` должны быть только в Google Apps Script Properties.

Добавьте бота в нужную Telegram-группу и убедитесь, что ему разрешено отправлять документы.

Чтобы получить `chat_id` группы, добавьте бота в группу, отправьте любое сообщение в группу, затем откройте:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
```

Найдите `chat.id` в ответе и сохраните его как `TELEGRAM_CHAT_ID`. Для групп значение обычно отрицательное, для супергрупп часто начинается с `-100`.

## Проверка

1. Заполните бриф на опубликованной странице.
2. На финальном шаге нажмите `Отправить бриф`.
3. Убедитесь, что появился статус успешной отправки.
4. Проверьте группу Telegram: бот должен отправить HTML-файл брифа с коротким описанием.
5. Если отправка не настроена или сервис недоступен, пользователь увидит ошибку и сможет нажать кнопку повторно.

Кнопка `Сохранить HTML-копию` остается запасным ручным способом сохранить заполненный бриф на устройстве.
