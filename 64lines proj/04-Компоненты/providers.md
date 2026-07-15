---
type: component
status: done
tags: [react, component, UI]
aliases: ["providers", "Контекст-Провайдеры (Providers)"]
related: ["[[NextAuth]]"]
---

# Контекст-Провайдеры (Providers)
> Глобальная обертка приложения React-контекстами для обеспечения сессии NextAuth и глобальных состояний темы.

## Расположение в коде
`components/providers.tsx`

## Детали
- Подключает `SessionProvider` от `next-auth/react`, предоставляющий хук `useSession()` всем дочерним компонентам.
- Подключает провайдеры UI-тем (если применимо).

## Связи
- Использует: [[NextAuth]]
- Используется в: `app/layout.tsx` (корневой макет)

## Заметки / особенности
Имеет директиву "use client" в начале файла. Находится в файле `app/layout.tsx`.
