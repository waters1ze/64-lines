---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Homework", "API Домашних Заданий"]
related: ["[[Model-Homework]]", "[[Model-User]]"]
---

# API Домашних Заданий
> Позволяет тренерам создавать и назначать ДЗ на основе PGN, а ученикам — отправлять прогресс решения.

## Расположение в коде
`app/api/homework/route.ts, app/api/homework/[id]/route.ts`

## Детали
1. **GET `/api/homework`**:
   - Для ученика: возвращает назначенные ему задания.
   - Для тренера: возвращает задания, назначенные его ученикам.
2. **POST `/api/homework`**:
   - Назначение нового задания ученику (запись [[Model-Homework]]). Требует роль `TEACHER` или `ADMIN`.
3. **PUT `/api/homework/[id]`**:
   - Ученик отправляет результат прохождения: `progress` (0-100), `solved` (true/false), `attempts`.
4. **DELETE `/api/homework/[id]`**:
   - Удаление задания тренером.

## Связи
- Использует: [[Model-Homework]], [[Model-User]]
- Используется в: [[teacher-hub]] (раздел Homework, StudentProfile, HomeworkPuzzle)

## Заметки / особенности
При создании задания тренер может прикрепить текстовую подсказку `teacherNote`.
