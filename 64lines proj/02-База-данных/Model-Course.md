---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-Course", "Модель Course (Курс)"]
related: ["[[Model-Purchase]]"]
---

# Модель Course (Курс)
> Обучающий курс, который может содержать обучающие файлы, шахматные PGN базы партий и быть выставлен на продажу в магазине.

## Расположение в коде
`prisma/schema.prisma (model Course)`

## Детали
- `id` (String, cuid, PK) — Уникальный ID.
- `name` (String) — Название курса.
- `description` (String) — Описание курса.
- `price` (Int) — Стоимость в рублях (если 0, курс бесплатный).
- `imageUrl` (String?) — Ссылка на обложку курса.
- `fileUrl` (String?) — Ссылка на загруженный PDF/материал курса.
- `pgn` (String?) — PGN-база партий для интерактивного просмотра.
- `isPremium` (Boolean, Default false) — Доступен ли бесплатно для обладателей Premium-подписки.
- `createdAt` (DateTime, Default now()) — Дата создания.

## Связи
- Использует: [[Model-Purchase]]
- Используется в: [[API-Courses-Modules-Lessons]], [[teacher-hub]] (раздел Storefront, MyLibrary)

## Заметки / особенности
Курс может покупаться отдельно напрямую учеником, создавая запись [[Model-Purchase]].
