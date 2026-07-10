# Tech Spec Template

Use Russian for Linear Tech Spec content and section headings. Keep code
identifiers, file paths, commands, product labels, and UI copy in their native
language.

Default sections:

```markdown
## Кратко

## Исходные требования

## Цели и не цели

## Архитектура

## Контракты и границы

### Реальные ответы бэкенда

<выборка реальных ответов с деплоя: домены enum, формы объектов, крайние записи; дата выборки и SHA/версия деплоя>

## Единицы реализации

## Влияние на остальную систему

## Риски и защита

## Что может сломаться и как защищаемся

## Файлы и поверхности

## Валидация

## Релиз и откат

## Связи
```

Rules:

- Tech Spec defines HOW for the approved PRD. It must not redefine WHAT.
- Use PRD requirement IDs when available. Important design choices should say which `R` or `AE` IDs they support, or explicitly mark themselves as cross-cutting technical support. On the first mention of an ID per section, add the Russian slug in parentheses: `R2 (частичное сохранение)` — the bare ID remains the canonical machine key; the slug aids human review.
- Use stable implementation unit IDs (`U1`, `U2`, ...). Do not renumber existing unit IDs after splits or reordering.
- Each implementation unit should include goal, requirements covered, dependencies, files or surfaces, approach, test scenarios, and verification.
- The `Влияние на остальную систему` section should cover affected interfaces, error propagation, state lifecycle risks, and unchanged invariants when relevant.
- Capture architecture, contracts, boundaries, validation, rollout, rollback, and failure modes.
- `Реальные ответы бэкенда` is required when the feature integrates with an existing API or backend: sampled real responses from the deployed instance covering enum value domains, object shapes, and edge records, plus the sampling date and deployed SHA/version. An endpoint list alone does not verify the contract. If the deployed instance was unreachable, say so and reference the contract-verification spike Issue that goes first in the wave. Omit the subsection when there is no existing backend to integrate with.
- For deep or risky work, identify the stable interface or seam that callers and tests should exercise. Avoid shallow pass-through modules and hypothetical seams with only one real adapter.
- Keep plan-time and implementation-time unknowns separate. If something depends on touching real code or seeing test failures, mark it as deferred implementation detail instead of pretending it is settled.
- Directional pseudo-code or diagrams are allowed when they clarify shape. Do not include copy-paste implementation code or shell choreography.
- Avoid transcript summaries and historical repair language.
- Keep concrete enough for a zero-context implementation agent.
- Keep workflow mechanics internal. Do not add visible sections such as
  `Skill contracts`, `linear-check design`, lifecycle status, readiness checks,
  or instructions about when to create Issues/PRs.
- Before finalizing, ask: does every HOW decision trace back to the PRD, and did we introduce any product behavior that belongs in PRD instead?
