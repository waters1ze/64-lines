---
type: api
status: done
tags: [api, endpoint, route]
aliases: ["API-Live-Lessons", "API Живых Уроков"]
related: ["[[Model-LiveSession]]", "[[Model-User]]"]
---

# API Живых Уроков
> Обеспечивает создание и синхронизацию состояния интерактивной шахматной доски во время живого урока в реальном времени.

## Расположение в коде
`app/api/live/route.ts`

## Детали
- **GET `/api/live`**: Получение текущего состояния активного урока [[Model-LiveSession]] (FEN доски, PGN партии, активный ход, статус звонка).
- **POST `/api/live`**: Старт нового урока тренером (создает запись [[Model-LiveSession]], генерирует случайное имя комнаты Jitsi `jitsiRoomName`).
- **PUT `/api/live`**: Синхронизация: обновление `currentFen`, `pgn` и `activeMoveId` при ходах тренера на доске.

## Связи
- Использует: [[Model-LiveSession]], [[Model-User]]
- Используется в: [[LiveLessonBoard]], [[teacher-hub]] (раздел live)

## Заметки / особенности
Интеграция Jitsi не требует бэкенд ключей — имя комнаты генерируется случайно, а iframe инициализируется на фронтенде.
