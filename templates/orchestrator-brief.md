# Шаблоны оркестратора: бриф и статус

User-facing shapes for `linear-orchestrate`. User-visible text is Russian per
project config (`languages.linear`).

## Бриф решения (Decision Brief)

```text
Нужно твоё решение: <ISSUE-KEY или пакет> — <тип: scope | дизайн | риск | deploy>

Что решаем: <одно предложение в терминах продукта, не реализации>
Почему сейчас: <что именно блокируется этим решением>
Что уже доказано: <тесты, autoreview, CI, сертификаты — что применимо>
Рекомендация: <вариант> — <одна строка почему>

Варианты:
1. <вариант A> — рекомендую
2. <вариант B>
3. <свой ответ>
```

Design questions: prepare side-by-side variants first (`/design-html` when the
runtime provides it), open them, then ask. Never decide visual questions
silently and never ask them text-only when the difference is visual.

## Статус (Status Update)

```text
Статус (<продукт>, <N> задач):
- <ISSUE-KEY> — <стадия> — <одна строка состояния>

Решил сам: <решения с прошлого апдейта, по строке с причиной, или «ничего»>
Нужно от тебя: <брифы по форме выше, или «нет»>
Воркеры: <spawned/advanced/respawned, или «без изменений»>
Linear: <применённые мутации и сертификаты, или «без изменений»>
```
