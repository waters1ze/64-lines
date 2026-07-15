---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Analysis", "API Запросов Анализа"]
related: ["[[Model-GameAnalysisRequest]]", "[[Model-User]]"]
---

# API Запросов Анализа
> Управляет циклом отправки партий учениками на разбор тренеру и сохранением результатов анализа.

## Расположение в коде
`app/api/analysis/route.ts`

## Детали
- **GET `/api/analysis`**: Получает список запросов анализа. Если роль STUDENT — только свои запросы. Если TEACHER/ADMIN — все запросы школы.
- **POST `/api/analysis`**:
  - Создание нового запроса учеником (передает PGN, тему, комментарий).
  - Ответ тренера (передает `answerPgn`, `teacherComment`, меняет статус на COMPLETED).

## Связи
- Использует: [[Model-GameAnalysisRequest]], [[Model-User]]
- Используется в: [[teacher-hub]] (раздел AnalysisRequests)

## Заметки / особенности
Перед отправкой запроса на анализ ученик должен оплатить его, если это предусмотрено глобальным тарифом.
