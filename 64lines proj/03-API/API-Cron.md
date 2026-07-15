---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Cron", "API Cron очистки сообщений"]
related: ["[[Model-Message]]", "[[Model-User]]"]
---

# API Cron очистки сообщений
> Серверный скрипт для регулярного удаления старых сообщений чата между пользователями без Premium-подписки.

## Расположение в коде
`app/api/cron/cleanup-messages/route.ts`

## Детали
- **GET/POST `/api/cron/cleanup-messages`**:
  - Находит все сообщения [[Model-Message]] старше 30 дней.
  - Удаляет их только в том случае, если И отправитель, И получатель имеют статус `isPremium === false` в таблице [[Model-User]].

## Связи
- Использует: [[Model-Message]], [[Model-User]]
- Используется в: Вызывается внешним планировщиком Cron (например, Vercel Cron Jobs)

## Заметки / особенности
Маршрут должен быть защищен от публичного вызова (например, проверкой специального заголовка авторизации Cron).
