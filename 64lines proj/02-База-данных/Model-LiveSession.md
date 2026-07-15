---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-LiveSession", "Модель LiveSession (Живой урок)"]
related: ["[[Model-User]]"]
---

# Модель LiveSession (Живой урок)
> Управляет активными онлайн-уроками в виртуальном классе между тренером и учеником. Связывает видеокомнату Jitsi и синхронизированную интерактивную шахматную доску.

## Расположение в коде
`prisma/schema.prisma (model LiveSession)`

## Детали
- `id` (String, cuid, PK) — Уникальный ID сессии.
- `teacherId` (String, FK на User.id) — Учитель, ведущий урок.
- `studentId` (String, FK на User.id) — Подключенный ученик.
- `status` (String, Default "ACTIVE") — Статус: ACTIVE (идет урок), ENDED (завершен).
- `jitsiRoomName` (String) — Имя комнаты на сервере Jitsi.
- `pgn` (String?) — Текущая PGN база урока (загруженная позиция/партия).
- `currentFen` (String?) — Текущее состояние шахматной доски (FEN строка).
- `activeMoveId` (String?) — Текущий активный ход в PGN-дереве.
- `lastUpdated` (DateTime, now()) — Время последнего изменения (для отслеживания активности).
- `createdAt` (DateTime, now()) — Время старта.

## Связи
- Использует: [[Model-User]]
- Используется в: [[API-Live-Lessons]], [[LiveLessonBoard]]

## Заметки / особенности
Доска регулярно опрашивает API (long polling) на изменения полей `currentFen` и `pgn`, благодаря чему ученик видит ходы тренера мгновенно.
