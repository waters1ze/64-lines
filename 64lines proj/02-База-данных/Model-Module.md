---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-Module", "Модель Module (Модуль)"]
related: ["[[Model-Lesson]]", "[[Model-ModuleAccess]]", "[[Model-Purchase]]"]
---

# Модель Module (Модуль)
> Логический раздел/блок в программе обучения. Модули состоят из отдельных уроков (Lesson). Доступ к модулю может быть платным.

## Расположение в коде
`prisma/schema.prisma (model Module)`

## Детали
- `id` (String, cuid, PK) — Уникальный ID.
- `title` (String) — Название модуля.
- `description` (String?) — Описание.
- `tags` (String[]) — Список тегов.
- `visibility` (String, Default "ALL") — Видимость ("ALL" / "PREMIUM" / "HIDDEN").
- `price` (Int, Default 0) — Стоимость модуля отдельно.
- `order` (Int, Default 0) — Порядковый номер при сортировке.
- `createdAt` (DateTime, now()) — Дата создания.

## Связи
- Использует: [[Model-Lesson]], [[Model-ModuleAccess]], [[Model-Purchase]]
- Используется в: [[API-Courses-Modules-Lessons]] (api/modules)

## Заметки / особенности
Модули позволяют продавать обучение по частям. Покупка модуля дает запись в [[Model-ModuleAccess]].
