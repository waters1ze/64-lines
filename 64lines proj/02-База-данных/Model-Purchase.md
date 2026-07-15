---
type: model
status: done
tags: [prisma, database, model]
aliases: ["Model-Purchase", "Модель Purchase (Покупка)"]
related: ["[[Model-User]]", "[[Model-Course]]", "[[Model-Module]]"]
---

# Модель Purchase (Покупка)
> Регистрирует счета пользователей, платежи и покупки (подписки, курсы, модули, разовые анализы партий). Связан с платежным шлюзом YooMoney.

## Расположение в коде
`prisma/schema.prisma (model Purchase)`

## Детали
- `id` (String, cuid, PK) — Уникальный ID счета (служит транзакционным ID для YooMoney).
- `userId` (String, FK на User.id) — Кто покупает.
- `courseId` (String?, FK на Course.id) — Приобретаемый курс (если курс).
- `moduleId` (String?, FK на Module.id) — Приобретаемый модуль (если модуль).
- `type` (String, Default "COURSE") — Тип покупки: COURSE, MODULE, SUBSCRIPTION, ANALYSIS.
- `amount` (Int?) — Сумма покупки в рублях.
- `createdAt` (DateTime, now()) — Время создания счета.
- `status` (String, Default "PENDING") — Статус счета: PENDING (Ожидает оплаты), APPROVED (Оплачен), REJECTED (Отклонен).
- `paymentMethod` (String, Default "sbp") — Способ оплаты (sbp, card, yoomoney).
- `comment` (String?) — Комментарий покупателя / описание.
- `senderName` (String?) — Имя плательщика (для ручной верификации).

## Связи
- Использует: [[Model-User]], [[Model-Course]], [[Model-Module]]
- Используется в: [[API-Payments-and-YooMoney]], [[teacher-hub]] (раздел Sales, Shop)

## Заметки / особенности
Автоматически переходит в APPROVED при получении валидного вебхука от YooMoney. Администраторы также могут подтверждать/отклонять счета вручную в панели управления.
