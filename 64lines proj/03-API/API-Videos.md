---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Videos", "API Управления Видеотекой"]
related: ["[[Model-Video]]"]
---

# API Управления Видеотекой
> Позволяет тренерам и администраторам пополнять видеотеку школы новыми лекциями и вебинарами.

## Расположение в коде
`app/api/videos/create/route.ts, app/api/videos/[id]/route.ts`

## Детали
- **POST `/api/videos/create`**: Добавление видеозаписи [[Model-Video]] (название, метаданные, URL-видео, флаг `isPremium`).
- **PUT/DELETE `/api/videos/[id]`**: Редактирование или удаление видео.

## Связи
- Использует: [[Model-Video]]
- Используется в: [[teacher-hub]] (раздел VideosSection)

## Заметки / особенности
Эндпоинт используется совместно с [[API-Upload]] для предварительной загрузки медиа-файлов.
