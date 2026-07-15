---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-User", "Модель User (Пользователь)"]
related: ["[[Model-Homework]]", "[[Model-Purchase]]", "[[Model-LiveSession]]", "[[Model-Message]]", "[[Model-SolvedPuzzle]]", "[[Model-Notification]]"]
---

# Модель User (Пользователь)
> Сердце системы "64 линии". Хранит данные учетных записей, рейтинги, игровые лимиты и состояние Premium-подписки. Имеет самореферентную связь для отношений Тренер ↔ Ученики.

## Расположение в коде
`prisma/schema.prisma (model User)`

## Детали
- `id` (String, cuid, PK) — Уникальный ID.
- `name` (String?) — Отображаемое имя.
- `email` (String, UK) — Электронная почта.
- `passwordHash` (String) — Хэш пароля.
- `role` (Role, Default STUDENT) — Роль: ADMIN, TEACHER, STUDENT.
- `rating` (Int, Default 1500) — Elo-рейтинг решения задач.
- `isPremium` (Boolean, Default false) — Наличие Premium.
- `premiumUntil` (DateTime?) — Срок действия подписки.
- `teacherId` (String?) — ID привязанного тренера (FK на User.id).
- `puzzlesSolvedToday` (Int, Default 0) — Количество решенных задач за сегодня.
- `lastPuzzleDate` (DateTime?) — Дата решения последней задачи (сбрасывает суточный счетчик).
- `puzzlesSolvedTotal` (Int, Default 0) — Всего решено задач.
- `puzzlesAttempted` (Int, Default 0) — Всего попыток решений.
- `activityStreak` (Int, Default 0) — Текущая серия дней активности.
- `lastActivityDate` (DateTime?) — Дата последней активности.

## Связи
- Использует: [[Model-Homework]], [[Model-Purchase]], [[Model-LiveSession]], [[Model-Message]], [[Model-SolvedPuzzle]], [[Model-Notification]]
- Используется в: [[API-Auth]], [[API-Profile]], [[API-Students]], [[API-Users-and-Teachers]], [[teacher-hub]]

## Заметки / особенности
Поле `teacherId` связывает ученика с тренером через отношение `TeacherStudents` (один учитель имеет много учеников).
