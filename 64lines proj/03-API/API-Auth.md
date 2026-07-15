---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Auth", "API Авторизации и Регистрации"]
related: ["[[Model-User]]", "[[Model-InviteLink]]", "[[NextAuth]]", "[[Почта-nodemailer]]"]
---

# API Авторизации и Регистрации
> Набор эндпоинтов, обеспечивающих регистрацию пользователей, верификацию email и инициализацию сессии NextAuth.

## Расположение в коде
`app/api/register/route.ts, app/api/verify/route.ts, app/api/auth/[...nextauth]/route.ts`

## Детали
1. **POST `/api/register`**:
   - Принимает `email`, `name`, `password` и реферальный токен `inviteToken` (опционально).
   - Проверяет уникальность email, хэширует пароль через `bcrypt`.
   - Если указан `inviteToken`, находит [[Model-InviteLink]] и привязывает пользователя к соответствующей роли/тренеру.
   - Отправляет проверочный код на email и возвращает созданного пользователя.
2. **GET/POST `/api/verify`**:
   - GET: Валидация токена верификации из ссылки в письме. При совпадении обновляет `emailVerified = new Date()`.
   - POST: Повторная отправка токена верификации на email.
3. **`/api/auth/[...nextauth]`**:
   - Инициализирует NextAuth Credentials Provider.
   - Валидирует пароль при логине, генерирует JWT токен, вшивая в сессию `id`, `email`, `name` и `role`.

## Связи
- Использует: [[Model-User]], [[Model-InviteLink]], [[NextAuth]], [[Почта-nodemailer]]
- Используется в: [[Login-page]], [[Register-page]], [[providers]]

## Заметки / особенности
При успешной авторизации сессия хранится на клиенте и передается в заголовках Cookie. Срок действия сессии настраивается в NextAuth параметрах.
