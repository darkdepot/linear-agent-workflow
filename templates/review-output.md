# Review Output Template

Use Russian for Linear-facing review comments or summaries when no consumer config overrides language.

```text
Ревью Linear: <ready|advisory-ready|needs-fixes|blocked>
Коротко: <human meaning of the verdict and whether the next stage is safe, needs fixes, or is blocked>

Режим: <handoff|pre-ship|artifact|issue|delivery>
Риск: <tiny|standard|deep|risky>
Ревью-гейт: <required|advisory>

Проверено:
- Проект:
- PRD:
- Техспек:
- Задачи:
- PR/ветка:

Не проверено:
- <manual QA/browser/prod/mobile/deploy surface/etc. that did not run, or `none known`>

Блокирующие замечания:
- <none or findings>

Предложенные исправления:
- <none or findings>

Решения:
- <none or findings>

К сведению:
- <none or findings>

Рекомендуемый следующий шаг:
```

Формат замечания:

```text
[<tier>] <artifact> - <title>
Доказательство:
Влияние:
Рекомендация:
Ответственный workflow:
```

Rules:

- Do not use `PASS`, `FAIL`, or `BLOCKED` as the review status.
- Do not mutate Linear artifacts from `linear-review`.
- Translate the review status into the `Коротко` line before listing findings.
- Include `Не проверено` so the user can distinguish review confidence from manual QA or deploy confidence.
- When review is required and blocking findings remain, verdict is `needs-fixes`.
- When required artifacts cannot be inspected, verdict is `blocked`.
- When review is advisory and no blocking risk exists, verdict is `advisory-ready`.
