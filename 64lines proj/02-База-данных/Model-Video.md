---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-Video", "Модель Video (Видеозапись)"]
related: ["нет прямых связей в БД"]
---

# Модель Video (Видеозапись)
> Запись в видеотеке школы. Может быть помечена как Premium-материал.

## Расположение в коде
`prisma/schema.prisma (model Video)`

## Детали
- `id` (String, cuid, PK) — Уникальный ID.
- `title` (String) — Название видео.
- `meta` (String) — Метаданные / Описание видео.
- `url` (String) — Ссылка на видеофайл (YouTube, Vimeo, Vercel Blob).
- `isPremium` (Boolean, Default false) — Заблокировано ли видео для пользователей без Premium подписки.
- `createdAt` (DateTime, now()) — Время добавления.

## Связи
- Использует: нет прямых связей в БД
- Используется в: [[API-Videos]], [[teacher-hub]] (раздел VideosSection)

## Заметки / особенности
Проверка прав на воспроизведение премиальных видео происходит на клиенте и сервере по флагу `isPremium` у текущего [[Model-User]].
