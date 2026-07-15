---
type: integration
status: done
tags: [integration, video, live, jitsi]
aliases: ["Jitsi Meet", "Видеосвязь Jitsi"]
related: ["[[LiveLessonBoard]]", "[[API-Live-Lessons]]"]
---

# Интеграция видеосвязи Jitsi Meet
> Бесплатный сервис видеоконференций с открытым исходным кодом, встраиваемый непосредственно на страницу живого урока с помощью Iframe API.

## Расположение в коде
`components/LiveLessonBoard.tsx`

## Детали
- Инициализация происходит на стороне клиента:
  - Загружается JS-библиотека `https://8x8.vc/external_api.js` (публичный сервер Jitsi Meet).
  - Создается объект класса `JitsiMeetExternalAPI` с параметрами:
    - `roomName`: уникальный ID сессии из [[Model-LiveSession]] (поле `jitsiRoomName`).
    - `parentNode`: DOM элемент на странице урока.
    - `configOverwrite`: переопределение настроек (отключение рекламы, ограничение интерфейса, скрытие лишних кнопок).
    - `interfaceConfigOverwrite`: скрытие логотипов Jitsi, настройка цветовой схемы.

## Связи
- Использует: [[Model-LiveSession]]
- Используется в: [[LiveLessonBoard]], [[Живой-урок]]

## Заметки / особенности
Публичный сервер `8x8.vc` или `meet.jit.si` предоставляется бесплатно, но имеет ограничения на число одновременных участников (до 100 человек) и качество связи. При расширении школы рекомендуется развернуть собственный выделенный сервер Jitsi Meet.
