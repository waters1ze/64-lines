---
type: index
status: done
tags: [api, index, routes]
aliases: ["Индекс API эндпоинтов", "Список роутов"]
related: ["[[00-Главная]]", "[[01-Карта-архитектуры]]"]
---

# Индекс API Эндпоинтов проекта "64 линии"

В таблице ниже собраны все API-маршруты Next.js (App Router), расположенные в папке `app/api/`.

| Метод | Путь | Назначение | Требуемая роль | Документация |
|---|---|---|---|---|
| **POST** | `/api/register` | Регистрация нового аккаунта | Любой (Гость) | [[API-Auth]] |
| **GET/POST** | `/api/verify` | Верификация почты по токену | Любой (Гость) | [[API-Auth]] |
| **ANY** | `/api/auth/*` | NextAuth обработчик сессий и логина | Любой | [[API-Auth]] |
| **GET** | `/api/profile` | Получение личных данных сессии | Авторизован | [[API-Profile]] |
| **GET/POST** | `/api/chat` | Чтение чата (последние 30д без Prem) / отправка сообщений | Авторизован | [[API-Chat-and-Notifications]] |
| **DELETE** | `/api/chat` | Полное удаление переписки с пользователем | Авторизован | [[API-Chat-and-Notifications]] |
| **GET** | `/api/cron/cleanup-messages` | Cron: Удаление чатов >30 дней для не-Premium | Cron / Admin | [[API-Cron]] |
| **GET/POST** | `/api/puzzles` | Выдача случайного пазла с учетом Elo / создание | Авторизован / Admin | [[API-Puzzles]] |
| **POST** | `/api/puzzles/submit` | Отправка решения задачи, пересчет Elo, лимиты | Авторизован | [[API-Puzzles]] |
| **GET/POST** | `/api/courses` | Получение списка курсов / создание курса | Авторизован / Admin | [[API-Courses-Modules-Lessons]] |
| **GET/PUT/DEL**| `/api/courses/[id]` | Работа с конкретным курсом | Авторизован / Admin | [[API-Courses-Modules-Lessons]] |
| **GET/POST** | `/api/modules` | Получение модулей / создание модуля | Авторизован / Admin | [[API-Courses-Modules-Lessons]] |
| **GET/PUT/DEL**| `/api/modules/[id]` | Работа с конкретным модулем | Авторизован / Admin | [[API-Courses-Modules-Lessons]] |
| **GET/POST** | `/api/modules/[id]/lessons` | Управление списком уроков в модуле | Учитель / Admin | [[API-Courses-Modules-Lessons]] |
| **GET/POST** | `/api/modules/[id]/access` | Управление доступами к модулю | Учитель / Admin | [[API-Courses-Modules-Lessons]] |
| **GET/PUT/DEL**| `/api/lessons/[id]` | Управление конкретным уроком | Учитель / Admin | [[API-Courses-Modules-Lessons]] |
| **GET/POST** | `/api/homework` | Получение ДЗ ученика / Назначение ДЗ тренером | Авторизован | [[API-Homework]] |
| **GET/PUT/DEL**| `/api/homework/[id]` | Получение деталей ДЗ / отправка прогресса / удаление | Авторизован | [[API-Homework]] |
| **GET/POST** | `/api/live` | Получение состояния урока / старт LiveSession | Авторизован | [[API-Live-Lessons]] |
| **PUT** | `/api/live` | Синхронизация FEN / PGN в живом уроке | Учитель / Admin | [[API-Live-Lessons]] |
| **POST** | `/api/payments/create` | Создание заказа (Purchase) и ссылки на YooMoney | Авторизован | [[API-Payments-and-YooMoney]] |
| **POST** | `/api/yoomoney/callback` | Callback вебхук YooMoney: авто-активация покупок | Любой (YooMoney) | [[API-Payments-and-YooMoney]] |
| **GET** | `/api/purchases` | Получение списка всех покупок | Учитель / Admin | [[API-Payments-and-YooMoney]] |
| **POST** | `/api/payments/approve` | Ручное одобрение покупки администратором | Admin | [[API-Payments-and-YooMoney]] |
| **POST** | `/api/payments/reject` | Ручное отклонение покупки администратором | Admin | [[API-Payments-and-YooMoney]] |
| **GET** | `/api/students` | Получение списка учеников тренера | Учитель / Admin | [[API-Students]] |
| **GET/DEL** | `/api/students/[id]` | Профиль ученика / удаление связки с тренером | Учитель / Admin | [[API-Students]] |
| **GET** | `/api/students/search` | Поиск учеников по email/имени | Учитель / Admin | [[API-Students]] |
| **GET/POST** | `/api/users` | Получение списка пользователей / управление ими | Admin | [[API-Users-and-Teachers]] |
| **GET** | `/api/users/teachers` | Список всех тренеров школы | Авторизован | [[API-Users-and-Teachers]] |
| **GET/POST** | `/api/openings` | Получение дебютов / загрузка новых PGN | Авторизован | [[API-Openings]] |
| **GET/PUT/DEL**| `/api/openings/[id]` | Работа с дебютом | Авторизован / Admin | [[API-Openings]] |
| **POST** | `/api/videos/create` | Загрузка видеозаписи в видеотеку | Admin / Teacher | [[API-Videos]] |
| **GET/PUT/DEL**| `/api/videos/[id]` | Редактирование / удаление видеозаписи | Admin / Teacher | [[API-Videos]] |
| **GET/POST** | `/api/settings` | Чтение настроек / изменение настроек цен | Авторизован / Admin | [[API-Settings]] |
| **GET** | `/api/settings/check` | Проверка конфигурации YooMoney | Admin | [[API-Settings]] |
| **GET/POST** | `/api/analysis` | Чтение запросов анализа / отправка новой партии | Авторизован | [[API-Analysis]] |
| **POST** | `/api/upload` | Загрузка файлов (PDF/PNG) на сервер | Учитель / Admin | [[API-Upload]] |
| **POST** | `/api/invite` | Присоединение к тренеру по токену | Авторизован | [[API-Invites]] |
| **GET/POST** | `/api/invites` | Получение / создание приглашений тренера | Авторизован | [[API-Invites]] |

---

## 🔐 Уровни доступа
- **Все пользователи**: Любые запросы требуют наличия JWT-сессии NextAuth (проверяется через `getServerSession(authOptions)`), за исключением маршрутов регистрации (`/api/register`), верификации (`/api/verify`) и вебхука YooMoney (`/api/yoomoney/callback`).
- **Специфические роли**: Эндпоинты администрирования (`/api/users`, `/api/payments/approve`) делают жесткую проверку `session.user.role === 'ADMIN'`. Роуты управления учениками требуют роли `TEACHER` или `ADMIN`.
