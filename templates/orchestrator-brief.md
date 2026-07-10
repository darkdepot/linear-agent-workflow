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

Package-approval briefs: include an option that explicitly bundles
implementation start («это одновременно approval на старт кода») so the
bundled-approval rule from `linear-implement` applies and the orchestrator
does not re-ask before dispatching workers.

Design questions: prepare side-by-side variants first (`/design-html` when the
runtime provides it), open them, then ask. Never decide visual questions
silently and never ask them text-only when the difference is visual.

## UX-чекпоинт (UX Checkpoint Brief)

```text
UX-чекпоинт: <проект> — прототип готов к твоему фидбэку

Что смотрим: <ссылка/файл прототипа — near-production, уже прошёл внутренний design review>
Контекст: <одно предложение — какую часть продукта это меняет>
Решил сам: <ключевые product/UX-решения внутри прототипа, по строке с причиной>

Нужно твоё решение:
1. <контестный UX-вопрос: вариант A — рекомендую, почему / вариант B>
2. <…или «только общий фидбэк по прототипу»>
```

The prototype must be near-production before the checkpoint: realistic
product content, correct states, side-by-side variants where a genuine choice
exists (`/design-html` when the runtime provides it), and an internal
design-review pass already applied. Never bring a first draft.

## Статус (Status Update)

```text
Статус (<продукт>, <N> задач):
- <ISSUE-KEY> — <стадия> — <одна строка состояния> — цена: ~N тыс. out-токенов, M циклов ревью

Решил сам: <решения с прошлого апдейта, по строке с причиной, или «ничего»>
Нужно от тебя: <брифы по форме выше, или «нет»>
Воркеры: <spawned/advanced/respawned, или «без изменений»>
Linear: <применённые мутации и сертификаты, или «без изменений»>
Простои и отклонения: <простои >5 мин с причиной и длительностью; отклонения от контракта с причиной; или «нет»>
Контекст: ~N%
```

«Простои и отклонения:» is mandatory in every status update: every
orchestrator idle or stall longer than 5 minutes with its cause and
duration, and every deviation from the orchestration contract with its
reason; write «нет» when the period was clean. The final wave report
carries the same section covering the whole wave. These are async-visible
records for the owner, not blocking notifications (owner decision Q5) —
they never interrupt or page the user.

«Контекст: ~N%» reports orchestrator session context usage per the
Context Budget policy in `references/orchestration.md`.

The per-Issue cost tail «— цена: ~N тыс. out-токенов, M циклов ревью» is
compact telemetry per the Cost Telemetry policy in
`references/orchestration.md`: include it only when the data is
available; write «цена: н/д» otherwise. Cost lines are async-visible
records for the owner — never blocking, never a gate, never a reason to
interrupt work.

## Цена волны (Wave Cost Summary)

The final wave report includes a «Цена волны» summary block — per-feature
tokens, review cycles, and wall-clock, plus wave totals:

```text
Цена волны:
- <ISSUE-KEY> — ~N тыс. out-токенов (in ~N тыс., cached ~N%), M циклов ревью, wall-clock <часы:минуты>
- …
Итого: ~N тыс. out-токенов, M циклов ревью, wall-clock <часы:минуты>
```

Numbers come from the per-stage ledger entries recorded at stage close
(Cost Telemetry in `references/orchestration.md`); a feature with missing
data gets «н/д» for the missing field instead of a guess. Like «Простои и
отклонения:», this block is async-visible and never blocking.
