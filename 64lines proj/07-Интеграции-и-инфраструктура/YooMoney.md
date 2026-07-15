---
type: integration
status: done
tags: [integration, payments, yoomoney]
aliases: ["YooMoney", "Интеграция ЮMoney"]
related: ["[[API-Payments-and-YooMoney]]", "[[Model-Purchase]]", "[[Покупка-курса-модуля]]"]
---

# Интеграция платежной системы YooMoney
> Настройка приема платежей через форму ЮMoney Quickpay (кошелек физического лица или счет компании) и вебхуки уведомлений.

## Расположение в коде
- Коллбек обработчик: `app/api/yoomoney/callback/route.ts`
- Создание платежа: `app/api/payments/create/route.ts`
- Локальный mock-тест: `scripts/test-yoomoney-webhook.js`

## Детали
1. **Создание формы**: При создании платежа сервер формирует POST запрос к форме Quickpay YooMoney:
   - `receiver` — номер вашего кошелька ЮMoney.
   - `quickpay-form` — тип формы (shop).
   - `targets` — описание платежа (например, "Купить модуль Испанская партия").
   - `paymentType` — тип оплаты (SB, AC, PC).
   - `sum` — сумма.
   - `label` — уникальный ID заказа из таблицы [[Model-Purchase]].
2. **Обработка вебхука**: ЮMoney отправляет POST запрос на наш callback URL.
   - Сервер берет параметры запроса и формирует контрольную строку.
   - Контрольная строка подписывается с помощью секретного слова `YOOMONEY_SECRET` методом SHA-1.
   - Полученный хэш сверяется с пришедшим в заголовке `sha1_hash`.
   - Если хэши совпадают, покупка переходит в статус APPROVED, предоставляя доступ к услуге.

## Связи
- Использует: [[Model-Purchase]], [[Model-User]], [[Model-ModuleAccess]]
- Используется в: [[API-Payments-and-YooMoney]], [[Покупка-курса-модуля]]

## Заметки / особенности
> [!important] Локальное тестирование вебхуков\n> Поскольку YooMoney не может отправлять запросы на `localhost`, для локального тестирования необходимо использовать ngrok-тоннель или запускать скрипт-симулятор `scripts/test-yoomoney-webhook.js`, который считывает `YOOMONEY_SECRET` из локального `.env` и имитирует вебхук.
