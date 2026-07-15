---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-GameAnalysisRequest", "Модель GameAnalysisRequest (Запрос на анализ партии)"]
related: ["[[Model-User]]"]
---

# Модель GameAnalysisRequest (Запрос на анализ партии)
> Регистрирует заявки учеников на профессиональный разбор их шахматных партий тренером. Это платная функция (или доступная по условиям подписки).

## Расположение в коде
`prisma/schema.prisma (model GameAnalysisRequest)`

## Детали
- `id` (String, cuid, PK) — ID запроса.
- `userId` (String, FK на User.id) — Ссылка на ученика.
- `title` (String?) — Название партии / Тема.
- `pgn` (String) — Исходный PGN сыгранной партии ученика.
- `comment` (String?) — Вопросы или комментарии ученика к партии.
- `status` (String, Default "PENDING") — Статус разбора: PENDING (ожидает тренера), COMPLETED (разбор выполнен).
- `answerPgn` (String?) — Результирующий PGN с разбором тренера (варианты, оценки, стрелки).
- `answerVideo` (String?) — Ссылка на видеоразбор (например, Jitsi запись или YouTube).
- `teacherComment` (String?) — Итоговый текстовый комментарий тренера.
- `createdAt` (DateTime, now()) — Время создания.
- `updatedAt` (DateTime, updated) — Время обновления.

## Связи
- Использует: [[Model-User]]
- Используется в: [[API-Analysis]], [[teacher-hub]] (раздел AnalysisRequests)

## Заметки / особенности
Запросы на анализ оплачиваются по тарифу, заданному в [[Model-Settings]], через покупку типа ANALYSIS в [[Model-Purchase]].
