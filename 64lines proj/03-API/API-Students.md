---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Students", "API Управления Учениками"]
related: ["[[Model-User]]"]
---

# API Управления Учениками
> Позволяет тренерам управлять составом своих учеников, искать новых учеников в базе и разрывать учебные связки.

## Расположение в коде
`app/api/students/route.ts, app/api/students/[id]/route.ts, app/api/students/search/route.ts`

## Детали
1. **GET `/api/students`**:
   - Возвращает список учеников текущего авторизованного тренера.
2. **GET `/api/students/[id]`**:
   - Детальный профиль ученика (решенные ДЗ, рейтинг, статистика).
3. **DELETE `/api/students/[id]`**:
   - Тренер удаляет ученика из своего списка (у ученика обнуляется `teacherId`).
4. **GET `/api/students/search`**:
   - Поиск пользователей с ролью STUDENT по email/имени для отправки приглашения.

## Связи
- Использует: [[Model-User]]
- Используется в: [[teacher-hub]] (раздел Students, StudentProfile), [[InviteComponents]]

## Заметки / особенности
Связь ученика с тренером является мягкой (SetNull при удалении).
