---
type: component
status: done
tags: [react, component, UI]
aliases: ["NotificationBanner", "Компонент NotificationBanner (Баннер уведомлений)"]
related: ["[[API-Chat-and-Notifications]]", "[[Model-Notification]]"]
---

# Компонент NotificationBanner (Баннер уведомлений)
> Компонент верхней информационной панели, отображающий всплывающие уведомления о важных событиях для пользователя.

## Расположение в коде
`components/NotificationBanner.tsx`

## Детали
- Подгружает список непрочитанных уведомлений из `/api/notifications`.
- Отображает плашку с анимацией в шапке сайта.
- При нажатии на уведомление автоматически делает POST запрос на `/api/notifications/read` и перенаправляет пользователя по ссылке `link` (например, на страницу нового домашнего задания).

## Связи
- Использует: [[API-Chat-and-Notifications]], [[Model-Notification]]
- Используется в: [[teacher-hub]]

## Заметки / особенности
Скрывается через 5 секунд после отображения, если пользователь не навел на него курсор.
