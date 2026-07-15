---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-Puzzle", "Модель Puzzle (Тактическая задача)"]
related: ["[[Model-SolvedPuzzle]]"]
---

# Модель Puzzle (Тактическая задача)
> Хранит базу шахматных тактических задач, импортированных из Lichess или добавленных администратором.

## Расположение в коде
`prisma/schema.prisma (model Puzzle)`

## Детали
- `id` (String, PK) — Строковый ID задачи (из базы Lichess).
- `fen` (String) — FEN начального расположения фигур.
- `moves` (String) — Строка правильных ходов решения (в нотации SAN/UCI, разделенных пробелом).
- `rating` (Int) — Сложность задачи (Elo рейтинг).
- `ratingDeviation` (Int, Default 0) — Погрешность рейтинга задачи.
- `themes` (String) — Теги/темы задачи (разделенные пробелом, например: "mateIn2 pinning short").
- `openingTags` (String?) — Теги дебюта (если применимо).

## Связи
- Использует: [[Model-SolvedPuzzle]]
- Используется в: [[API-Puzzles]], [[Puzzles]], [[admin-puzzles]]

## Заметки / особенности
Используется для генерации ежедневных тренировок в зависимости от текущего рейтинга Elo ученика.
