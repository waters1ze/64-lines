---
type: component
status: done
tags: [react, component, UI]
aliases: ["teacher-hub", "Компонент teacher-hub (Личный кабинет)"]
related: ["[[ChatComponent]]", "[[LiveLessonBoard]]", "[[InviteComponents]]", "[[ResizableBoard]]", "[[Puzzles]]", "[[admin-puzzles]]"]
---

# Компонент teacher-hub (Личный кабинет)
> Главный и самый объемный компонент приложения (более 4000 строк). Он является монолитным пультом управления для всех ролей пользователей (ADMIN, TEACHER, STUDENT) и переключает подразделы интерфейса на основе параметров URL.

## Расположение в коде
`components/teacher-hub.tsx`

## Детали
### Принимаемые пропсы (Props):
- `initialRole` (String) — Текущая роль ("ADMIN", "Учитель", "Ученик", "Гость").
- `userName` (String) — Имя пользователя.
- `userRating` (Number) — Текущий Elo-рейтинг пользователя.
- `userRank` (Number) — Место пользователя в лидерборде.
- `isPremium` (Boolean) — Наличие Premium-статуса.
- `puzzlesSolvedTotal` (Number) — Сколько задач решено за все время.
- `puzzlesAttempted` (Number) — Попыток решения задач.
- `activityStreak` (Number) — Серия дней активности.
- `initialStudents` (Array) — Исходный список учеников (для тренера).
- `initialHomeworks` (Array) — Исходный список домашних заданий.
- `initialCourses` (Array) — Загруженный список курсов.
- `initialVideos` (Array) — Видеотека.
- `initialOpenings` (Array) — Дебюты.
- `initialPurchases` (Array) — Список счетов (для админа/истории).

### Внутренние разделы (Sub-components):
- `TeacherOverview` / `StudentOverview`: Панель сводки со статистикой.
- `Students`: Проводник по списку учеников для тренера.
- `StudentProfile`: Профиль ученика глазами тренера (назначение ДЗ, удаление).
- `HomeworkList`: Список ДЗ.
- `HomeworkPuzzle`: Решатель конкретного ДЗ на интерактивной доске.
- `VideosSection`: Видеотека школы.
- `PgnBoard`: Модуль разбора дебютов (PGN) с деревом вариантов.
- `ModulesEditor`: Редактор учебного плана (уроки, модули).
- `MyLibrary`: Купленные и бесплатные учебные материалы.
- `ShopSection` / `ModulesView` / `Storefront`: Витрины магазина курсов.
- `Sales`: Бухгалтерия счетов (для ADMIN).
- `AnalysisRequests`: Панель отправки партий тренеру на разбор.
- `SettingsPanel`: Редактирование профиля и покупка услуг.
- `Leaderboard`: Таблица рейтингов учеников.
- `UsersManager`: Управление ролями пользователей БД.

## Связи
- Использует: [[ChatComponent]], [[LiveLessonBoard]], [[InviteComponents]], [[ResizableBoard]], [[Puzzles]], [[admin-puzzles]]
- Используется в: [[Главная-page]] (app/page.tsx)

## Заметки / особенности
Для отрисовки досок и PGN-деревьев внутри `teacher-hub` используются динамические импорты (Next Dynamic) библиотек `react-chessboard` и `@uiw/react-md-editor` с отключенным SSR, чтобы избежать падения сборки.
