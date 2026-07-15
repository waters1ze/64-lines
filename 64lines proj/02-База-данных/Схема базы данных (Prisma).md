---
type: index
status: done
tags: [database, schema, prisma]
aliases: ["Схема базы данных (Prisma)", "Спецификация моделей"]
related: ["[[00-ER-диаграмма]]"]
---

# Схема базы данных (Prisma Specification)

База данных проекта построена на PostgreSQL и администрируется с помощью Prisma ORM.

## Файл схемы
`prisma/schema.prisma`

---

## 🗂️ Список всех моделей

| Модель | Назначение | Документ с деталями |
|---|---|---|
| `User` | Пользователи системы (ученики, тренеры, админы) | [[Model-User]] |
| `Homework` | Домашние задания, привязанные к ученикам | [[Model-Homework]] |
| `Course` | Учебные курсы (покупаются целиком) | [[Model-Course]] |
| `Module` | Модули курсов, содержащие уроки | [[Model-Module]] |
| `Lesson` | Конкретные видео/текстовые уроки внутри модуля | [[Model-Lesson]] |
| `ModuleAccess` | Права доступа учеников к конкретным модулям | [[Model-ModuleAccess]] |
| `Purchase` | История транзакций и счетов (с ЮMoney) | [[Model-Purchase]] |
| `Video` | Ролики видеотеки (Free / Premium) | [[Model-Video]] |
| `Opening` | Дебютные библиотеки PGN | [[Model-Opening]] |
| `InviteLink` | Реферальные ссылки для регистрации | [[Model-InviteLink]] |
| `TeacherStudentInvite` | Приглашения на связку ученик-тренер | [[Model-TeacherStudentInvite]] |
| `Message` | Сообщения внутреннего чата | [[Model-Message]] |
| `LiveSession` | Сессии онлайн уроков тренера и ученика | [[Model-LiveSession]] |
| `Settings` | Цены подписок и лимиты | [[Model-Settings]] |
| `GameAnalysisRequest` | Шахматный анализ партий от тренера | [[Model-GameAnalysisRequest]] |
| `Puzzle` | Шахматные тактические задачи | [[Model-Puzzle]] |
| `SolvedPuzzle` | Записи о решенных задачах пользователями | [[Model-SolvedPuzzle]] |
| `Notification` | Уведомления пользователей | [[Model-Notification]] |

---

## 🔗 Связанные заметки
- Интерактивная визуализация схемы связей: [[00-ER-диаграмма]].
- Скрипты инициализации и изменения базы данных: [[00-Индекс-скриптов]].
