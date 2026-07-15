---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Settings", "API Системных Настроек"]
related: ["[[Model-Settings]]"]
---

# API Системных Настроек
> Предоставляет доступ к глобальной конфигурации цен платформы и проверяет правильность настроек вебхука платежей.

## Расположение в коде
`app/api/settings/route.ts, app/api/settings/check/route.ts`

## Детали
1. **GET/POST `/api/settings`**:
   - GET: Возвращает глобальные цены подписки и анализа из [[Model-Settings]] (запись "global").
   - POST: Позволяет изменить цены (требует роль `ADMIN`).
2. **GET `/api/settings/check`**:
   - Проверяет наличие переменной окружения `YOOMONEY_SECRET` на сервере. Возвращает `{ yoomoneyConfigured: boolean }`.

## Связи
- Использует: [[Model-Settings]]
- Используется в: [[teacher-hub]] (раздел SettingsPanel, Sales)

## Заметки / особенности
Используется для визуального информирования администратора о состоянии платежного шлюза.
