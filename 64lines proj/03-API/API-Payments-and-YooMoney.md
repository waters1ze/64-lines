---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Payments-and-YooMoney", "API Платежей и YooMoney"]
related: ["[[Model-Purchase]]", "[[Model-User]]", "[[Model-ModuleAccess]]", "[[YooMoney]]"]
---

# API Платежей и YooMoney
> Регулирует создание счетов оплаты, ручную модерацию платежей и автоматическое подтверждение оплаты через вебхук YooMoney.

## Расположение в коде
`app/api/payments/..., app/api/yoomoney/callback/route.ts, app/api/purchases/route.ts`

## Детали
1. **POST `/api/payments/create`**:
   - Принимает `type` (COURSE, MODULE, SUBSCRIPTION, ANALYSIS) и соответствующий ID сущности.
   - Инициализирует запись [[Model-Purchase]] в статусе `PENDING`.
   - Генерирует платежную ссылку на YooMoney Quickpay с передачей ID покупки в параметре `label`. Возвращает ссылку на клиенту.
2. **POST `/api/yoomoney/callback`**:
   - Публичный вебхук, вызываемый сервером YooMoney.
   - Проверяет SHA-1 сигнатуру запроса с помощью секретного слова `YOOMONEY_SECRET`.
   - Извлекает ID покупки из `label`. Меняет статус покупки на `APPROVED`.
   - В зависимости от типа покупки: активирует Premium-подписку пользователю (`isPremium = true`), выдает доступ к модулю ([[Model-ModuleAccess]]) или открывает доступ к курсу.
3. **POST `/api/payments/approve` и `/api/payments/reject`**:
   - Ручное подтверждение или отклонение покупки администратором.

## Связи
- Использует: [[Model-Purchase]], [[Model-User]], [[Model-ModuleAccess]], [[YooMoney]]
- Используется в: [[teacher-hub]] (разделы ShopSection, Sales), [[Покупка-курса-модуля]]

## Заметки / особенности
Локальное тестирование вебхука осуществляется через скрипт `scripts/test-yoomoney-webhook.js`.
