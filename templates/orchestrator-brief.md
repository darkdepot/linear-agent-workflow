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

## Целостность брифа (Brief Integrity)

These rules bind every Decision Brief and UX checkpoint that asks
numbered questions against a board or prototype. Wave-1 precedent: a
brief numbered 7 questions against a 5-section board; the owner's
«2) B» decoded to one option under brief numbering and to a different
one under board numbering — a possibly inverted product decision — and
the contested question was then closed by silence after a fallback line.

- Board-aligned IDs: question IDs mirror board section IDs exactly.
  Multiple questions inside one section get section-scoped suffixes
  (1a, 1b). Cross-section renumbering is forbidden: a question with no
  board section gets its own explicitly labeled block, never a number
  shifted from another section.
- Self-identifying tokens: every option carries a token rendered on
  both the board and the brief, e.g. «1a-КАРТОЧКА / 1a-МОДАЛКА». An
  answer is valid without its number when the token or the verbatim
  option text identifies it.
- Echo-back: before acting on the answers, post a mapping table
  «вопрос → выбранный вариант (дословно)». An answer whose text does
  not match the addressed question's option set is a numbering fault —
  a mandatory one-line re-confirm precedes any work on that item.
- No closure by silence: an item routed to a checkpoint as contested is
  never closed by silence — no answer means asked again, not resolved.
  A fallback line («если не ответишь — делаю X») does not resolve a
  contested item.
- Post-approval delta: any spec change after a package approval that
  alters user-visible behavior appears as an explicit
  «Изменилось после твоего одобрения:» delta list at the next owner
  touch — never only as a fait-accompli status line.

Echo-back shape (posted before acting on the answers):

```text
Сверка ответов — вопрос → выбранный вариант (дословно):
- 1a: «<текст выбранного варианта>»
- 2: «<текст выбранного варианта>»
Если где-то не то — поправь одной строкой; спорные пункты в работу не беру до подтверждения.
```

Post-approval delta shape (at the next owner touch):

```text
Изменилось после твоего одобрения:
- <что изменилось в видимом пользователю поведении> — <почему>
```

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
