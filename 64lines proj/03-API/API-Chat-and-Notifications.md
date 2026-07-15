---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Chat-and-Notifications", "API Чата и Уведомлений"]
related: ["[[Model-Message]]", "[[Model-Notification]]", "[[Model-User]]"]
---

# API Чата и Уведомлений
> Обеспечивает работу системы обмена сообщениями между тренером и учеником, а также генерацию и прочтение системных уведомлений.

## Расположение в коде
`app/api/chat/route.ts, app/api/notifications/route.ts, app/api/notifications/read/route.ts`

## Детали
1. **GET `/api/chat`**:
   - Возвращает сообщения между текущим пользователем и собеседником (`?with=userId`).
   - Если пользователь не Premium, фильтрует сообщения, возвращая историю только за последние 30 дней.
   - Возвращает список активных диалогов (контактов) с текстом последнего сообщения.
2. **POST `/api/chat`**:
   - Отправляет новое сообщение: создает запись [[Model-Message]].
3. **GET `/api/notifications`**:
   - Получает список системных уведомлений [[Model-Notification]] текущего пользователя.
4. **POST `/api/notifications/read`**:
   - Помечает уведомление как прочитанное (`isRead = true`).

## Связи
- Использует: [[Model-Message]], [[Model-Notification]], [[Model-User]]
- Используется в: [[ChatComponent]], [[NotificationBanner]], [[teacher-hub]]

## Заметки / особенности
Интерфейс чата использует периодический опрос (polling) каждые 2 секунды для получения новых сообщений.
