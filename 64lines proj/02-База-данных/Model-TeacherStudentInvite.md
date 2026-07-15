---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-TeacherStudentInvite", "Модель TeacherStudentInvite (Запросы связки)"]
related: ["[[Model-User]]"]
---

# Модель TeacherStudentInvite (Запросы связки)
> Регулирует двусторонний процесс добавления учеников к тренеру. Хранит статус приглашения.

## Расположение в коде
`prisma/schema.prisma (model TeacherStudentInvite)`

## Детали
- `id` (String, cuid, PK) — ID запроса.
- `teacherId` (String, FK на User.id) — ID тренера.
- `studentId` (String, FK на User.id) — ID ученика.
- `direction` (String) — Направление запроса: "TEACHER_INVITED" или "STUDENT_REQUESTED".
- `status` (String, Default "PENDING") — Статус: PENDING, ACCEPTED, REJECTED.
- `createdAt` (DateTime, now()) — Время создания.

## Связи
- Использует: [[Model-User]]
- Используется в: [[API-Invites]], [[InviteComponents]]

## Заметки / особенности
При одобрении запроса (статус ACCEPTED) в модели [[Model-User]] поле `teacherId` у ученика заполняется соответствующим `teacherId` из инвайта.
