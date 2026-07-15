---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-Opening", "Модель Opening (Дебют)"]
related: ["нет прямых связей в БД (Prisma)"]
---

# Модель Opening (Дебют)
> Хранит дебютные схемы и варианты в виде PGN-файлов с разметкой для интерактивного изучения дебютной теории тренерами и учениками.

## Расположение в коде
`prisma/schema.prisma (model Opening)`

## Детали
- `id` (String, cuid, PK) — Уникальный ID дебюта.
- `title` (String) — Название дебюта (например, "Испанская партия").
- `pgn` (String) — База ходов с разветвлениями и текстовыми комментариями.
- `createdAt` (DateTime, now()) — Время добавления.

## Связи
- Использует: нет прямых связей в БД (Prisma)
- Используется в: [[API-Openings]], [[teacher-hub]] (раздел Openings)

## Заметки / особенности
Интерфейс для работы с дебютами использует специальный PGN-парсер в компоненте [[teacher-hub|PgnBoard]].
