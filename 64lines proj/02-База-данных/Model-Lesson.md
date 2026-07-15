---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-Lesson", "Модель Lesson (Урок)"]
related: ["[[Model-Module]]"]
---

# Модель Lesson (Урок)
> Одиночный урок (видеолекция или теоретический материал), входящий в состав конкретного модуля.

## Расположение в коде
`prisma/schema.prisma (model Lesson)`

## Детали
- `id` (String, cuid, PK) — Уникальный ID.
- `title` (String) — Заголовок урока.
- `videoUrl` (String?) — Ссылка на видеофайл / YouTube.
- `fileUrl` (String?) — Дополнительный файл к уроку (PDF, PGN и т.д.).
- `order` (Int, Default 0) — Порядковый номер урока внутри модуля.
- `moduleId` (String, FK на Module.id) — Родительский модуль.

## Связи
- Использует: [[Model-Module]]
- Используется в: [[API-Courses-Modules-Lessons]] (api/lessons)

## Заметки / особенности
Удаление модуля каскадно удаляет все входящие в него уроки.
