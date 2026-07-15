---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-Message", "Модель Message (Сообщение)"]
related: ["[[Model-User]]"]
---

# Модель Message (Сообщение)
> Хранит историю переписки во внутреннем чате между пользователями платформы (тренерами и их учениками).

## Расположение в коде
`prisma/schema.prisma (model Message)`

## Детали
- `id` (String, cuid, PK) — Уникальный ID сообщения.
- `senderId` (String, FK на User.id) — Отправитель.
- `receiverId` (String, FK на User.id) — Получатель.
- `content` (String) — Текст сообщения.
- `createdAt` (DateTime, now()) — Дата отправки.

## Связи
- Использует: [[Model-User]]
- Используется в: [[API-Chat-and-Notifications]], [[API-Cron]], [[ChatComponent]]

## Заметки / особенности
Для пользователей без Premium при получении чата отображаются сообщения только за последние 30 дней. Cron скрипт [[Cron-очистка-сообщений]] физически очищает сообщения старше 30 дней, если оба участника переписки не имеют Premium-статуса.
