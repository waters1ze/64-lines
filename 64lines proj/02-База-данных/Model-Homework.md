---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-Homework", "Модель Homework (Домашнее задание)"]
related: ["[[Model-User]]"]
---

# Модель Homework (Домашнее задание)
> Хранит информацию о домашних заданиях, назначаемых тренером ученику. Каждое задание содержит PGN шахматной партии или позиции для анализа.

## Расположение в коде
`prisma/schema.prisma (model Homework)`

## Детали
- `id` (String, cuid, PK) — Уникальный ID.
- `title` (String) — Тема/Название задания.
- `pgn` (String) — PGN строка партии (содержит начальный FEN и ходы).
- `assignedAt` (DateTime, Default now()) — Дата назначения.
- `dueDate` (DateTime?) — Крайний срок сдачи.
- `progress` (Int, Default 0) — Процент прохождения задания (0-100).
- `solved` (Boolean, Default false) — Завершено ли задание.
- `attempts` (Int, Default 0) — Число попыток решения.
- `teacherNote` (String?) — Заметка или подсказка от тренера.
- `studentId` (String, FK на User.id) — Ссылка на ученика.
- `rating` (Int?) — Сложность задания в Elo.

## Связи
- Использует: [[Model-User]]
- Используется в: [[API-Homework]], [[teacher-hub]] (раздел Homework, HomeworkPuzzle)

## Заметки / особенности
При наступлении дедлайна (`dueDate < now()`), просроченные домашние задания автоматически очищаются на стороне клиента и сервера при обращении к API или главной странице.
