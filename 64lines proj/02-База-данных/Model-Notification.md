---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-Notification", "Модель Notification (Уведомление)"]
related: ["[[Model-User]]"]
---

# Модель Notification (Уведомление)
> Запись во внутренней системе уведомлений пользователя (сообщает ученикам о новых домашних заданиях, а тренерам — о новых запросах анализа или оплатах).

## Расположение в коде
`prisma/schema.prisma (model Notification)`

## Детали
- `id` (String, cuid, PK) — Уникальный ID.
- `userId` (String, FK на User.id) — Кому предназначено уведомление.
- `title` (String) — Заголовок оповещения.
- `message` (String) — Текст сообщения.
- `isRead` (Boolean, Default false) — Прочитано ли пользователем.
- `link` (String?) — Ссылка на переход при клике (например, `/?section=homework`).
- `createdAt` (DateTime, now()) — Время создания.

## Связи
- Использует: [[Model-User]]
- Используется в: [[API-Chat-and-Notifications]], [[NotificationBanner]]

## Заметки / особенности
Позволяет пользователям быстро реагировать на события платформы.
