---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-Settings", "Модель Settings (Глобальные настройки)"]
related: ["нет настроек"]
---

# Модель Settings (Глобальные настройки)
> Хранит глобальные финансовые тарифы и настройки платформы. Имеет одну константную запись с ID "global".

## Расположение в коде
`prisma/schema.prisma (model Settings)`

## Детали
- `id` (String, PK, Default "global") — Единственный ключ.
- `subscriptionPrice` (Int, Default 300) — Цена Premium-подписки на месяц в рублях.
- `analysisPrice` (Int, Default 70) — Цена за один запрос анализа партии.

## Связи
- Использует: нет настроек
- Используется в: [[API-Settings]], [[teacher-hub]] (раздел SettingsPanel для ADMIN)

## Заметки / особенности
Редактируется только Администраторами системы.
