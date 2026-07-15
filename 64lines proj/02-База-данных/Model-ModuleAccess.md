---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-ModuleAccess", "Модель ModuleAccess (Доступ к модулю)"]
related: ["[[Model-User]]", "[[Model-Module]]"]
---

# Модель ModuleAccess (Доступ к модулю)
> Таблица-связка для предоставления доступа конкретному пользователю к платному модулю курса.

## Расположение в коде
`prisma/schema.prisma (model ModuleAccess)`

## Детали
- `id` (String, cuid, PK) — Уникальный ID.
- `userId` (String, FK на User.id) — Ссылка на ученика.
- `moduleId` (String, FK на Module.id) — Ссылка на модуль.
- `grantedAt` (DateTime, now()) — Дата предоставления доступа.

## Связи
- Использует: [[Model-User]], [[Model-Module]]
- Используется в: [[API-Courses-Modules-Lessons]] (api/modules/[id]/access)

## Заметки / особенности
Наложен уникальный индекс на связку `[userId, moduleId]`.
