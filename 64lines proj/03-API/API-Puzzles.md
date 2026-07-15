---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Puzzles", "API Шахматных Задач"]
related: ["[[Model-Puzzle]]", "[[Model-SolvedPuzzle]]", "[[Model-User]]"]
---

# API Шахматных Задач
> Обрабатывает логику получения случайных задач по рейтингу пользователя, фиксацию решений и изменение рейтинга Elo.

## Расположение в коде
`app/api/puzzles/route.ts, app/api/puzzles/submit/route.ts, app/api/puzzles/create/route.ts`

## Детали
1. **GET `/api/puzzles`**:
   - Принимает `difficulty` (easy, normal, hard) и `themes` (фильтр по темам Lichess).
   - Проверяет суточный лимит решенных задач для не-Premium пользователей (лимит — 5 задач). Если лимит исчерпан, возвращает 403 `LIMIT_REACHED`.
   - Ищет задачи в таблице [[Model-Puzzle]] с учетом целевого диапазона рейтинга пользователя. Исключает уже решенные задачи из [[Model-SolvedPuzzle]].
2. **POST `/api/puzzles/submit`**:
   - Принимает `puzzleId`, `isCorrect` и `puzzleRating`.
   - Пересчитывает Elo-рейтинг пользователя по стандартной формуле шахматного рейтинга (коэффициент K=32).
   - Инкрементирует счетчик решенных задач за сегодня и общий счетчик.
   - Фиксирует задачу в [[Model-SolvedPuzzle]].
   - Пересчитывает серию активности пользователя (activityStreak).
3. **POST `/api/puzzles/create`**:
   - Создание новой задачи администратором.

## Связи
- Использует: [[Model-Puzzle]], [[Model-SolvedPuzzle]], [[Model-User]]
- Используется в: [[Puzzles]], [[admin-puzzles]], [[teacher-hub]]

## Заметки / особенности
Суточный лимит 5 задач сбрасывается, если текущая дата не совпадает по дню с `lastPuzzleDate`.
