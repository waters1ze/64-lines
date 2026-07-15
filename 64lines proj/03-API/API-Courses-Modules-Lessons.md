---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Courses-Modules-Lessons", "API Обучающего Контента"]
related: ["[[Model-Course]]", "[[Model-Module]]", "[[Model-Lesson]]", "[[Model-ModuleAccess]]", "[[Model-User]]"]
---

# API Обучающего Контента
> Набор CRUD-эндпоинтов для управления курсами, модулями, уроками и правами доступа учеников к ним.

## Расположение в коде
`app/api/courses/..., app/api/modules/..., app/api/lessons/...`

## Детали
1. **Курсы (`/api/courses` и `/api/courses/[id]`)**:
   - GET: Выводит список всех курсов.
   - POST/PUT/DELETE: Создание, изменение, удаление курса (требуется роль `ADMIN`).
2. **Модули (`/api/modules` и `/api/modules/[id]`)**:
   - GET: Список модулей, отфильтрованный по покупкам текущего пользователя (или без фильтра, если у пользователя Premium).
   - POST/PUT/DELETE: Администрирование модулей.
3. **Уроки (`/api/modules/[id]/lessons` и `/api/lessons/[id]`)**:
   - Позволяет добавлять уроки [[Model-Lesson]] в модуль, сортировать их (`order`) и редактировать видео-ссылки.
4. **Доступы (`/api/modules/[id]/access`)**:
   - Управление записями [[Model-ModuleAccess]] (назначение модулей тренером конкретным ученикам).

## Связи
- Использует: [[Model-Course]], [[Model-Module]], [[Model-Lesson]], [[Model-ModuleAccess]], [[Model-User]]
- Используется в: [[teacher-hub]] (разделы ShopSection, MyLibrary, ModulesEditor, CourseViewer)

## Заметки / особенности
Если модуль или курс бесплатный (цена = 0), к нему автоматически имеют доступ все пользователи.
