---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-SolvedPuzzle", "Модель SolvedPuzzle (Решенная задача)"]
related: ["[[Model-User]]", "[[Model-Puzzle]]"]
---

# Модель SolvedPuzzle (Решенная задача)
> Служит журналом решенных задач для каждого ученика. Предотвращает повторную выдачу одной и той же задачи пользователю.

## Расположение в коде
`prisma/schema.prisma (model SolvedPuzzle)`

## Детали
- `id` (String, cuid, PK) — ID записи.
- `userId` (String, FK на User.id) — Кто решил.
- `puzzleId` (String, FK на Puzzle.id) — Какую задачу решил.
- `solvedAt` (DateTime, now()) — Время решения.

## Связи
- Использует: [[Model-User]], [[Model-Puzzle]]
- Используется в: [[API-Puzzles]], [[Puzzles]]

## Заметки / особенности
Уникальный индекс наложен на составной ключ `[userId, puzzleId]`.
