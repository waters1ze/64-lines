---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Invites", "API Приглашений и Связей"]
related: ["[[Model-TeacherStudentInvite]]", "[[Model-InviteLink]]", "[[Model-User]]"]
---

# API Приглашений и Связей
> Управляет процессом приглашений между тренером и учеником, реферальными ссылками и привязкой пользователей.

## Расположение в коде
`app/api/invite/route.ts, app/api/invites/route.ts`

## Детали
1. **POST `/api/invite`**:
   - Применяет реферальное приглашение при регистрации или авторизации. Связывает аккаунт ученика с тренером в БД.
2. **GET/POST `/api/invites`**:
   - GET: Выгружает все активные и ожидающие подтверждения приглашения [[Model-TeacherStudentInvite]] для текущего пользователя.
   - POST: Создает новый запрос связывания или реферальную ссылку (роль `TEACHER` или `ADMIN`).

## Связи
- Использует: [[Model-TeacherStudentInvite]], [[Model-InviteLink]], [[Model-User]]
- Используется в: [[InviteComponents]], [[Invite-token-page]], [[Приглашение-ученик-учитель]]

## Заметки / особенности
Позволяет организовывать классы учеников для групповой работы.
