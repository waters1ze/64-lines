---
type: integration
status: done
tags: [integration, email, smtp]
aliases: ["nodemailer", "Отправка почты"]
related: ["[[API-Auth]]"]
---

# Отправка писем через nodemailer
> SMTP-интеграция для отправки сервисных писем пользователям (подтверждение регистрации, восстановление доступа, чеки об оплате).

## Расположение в коде
`lib/mail.ts`

## Детали
- Использует библиотеку `nodemailer`.
- Конфигурация SMTP считывается из переменных окружения:
  - `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`.
- Отправка писем происходит в асинхронном режиме.
- Пример функций:
  - `sendVerificationEmail(email, token)` — отправка ссылки с токеном для подтверждения email.
  - `sendResetPasswordEmail(email, token)` — ссылка для сброса пароля.

## Связи
- Использует: [[Переменные-окружения-и-конфигурация]]
- Используется в: [[API-Auth]] (маршруты register, verify)

## Заметки / особенности
В среде разработки для тестирования писем можно использовать тестовые SMTP заглушки (например, Mailtrap или Ethereal Email), чтобы не отправлять реальные письма на личные ящики разработчиков.
