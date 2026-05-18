# PRD Template

Use Russian for Linear PRD content.

Default sections:

```markdown
## Кратко

## Проблема

## Оператор и контекст

## Целевой workflow

## Сценарии

## Требования

## Примеры приемки

## Критерии успеха

## Что не входит в MVP

## Связи
```

Rules:

- PRD defines WHAT: user/operator behavior, scope boundaries, requirements, and success criteria.
- Treat this as a lightweight PRD without PRD ceremony. Include what the Tech Spec and Issue need; skip sections that add no value for the current scope.
- Resolve product decisions here. Do not make the Tech Spec invent product behavior, actors, or acceptance.
- Use stable requirement IDs for Standard or Deep work: `R1.`, `R2.`, `R3.`. Lightweight PRD-lite may use plain bullets when there are only 1-3 obvious requirements.
- Use acceptance examples when behavior depends on state or sequence. In default Russian output, use: `AE1. Покрывает R1, R2. Дано ..., когда ..., тогда ...`. Adapt the wording to the consumer config language.
- Success criteria should cover both the human/operator outcome and handoff quality, so Tech Spec and Issue slicing can proceed without inventing product behavior.
- Do not describe implementation architecture, schemas, file layouts, library choices, or rollout mechanics.
- If discovery workflows were skipped, mark the document as PRD-lite and call out lower confidence.
- Before finalizing, ask: what would `linear-spec` still have to invent if this PRD ended here? Fix those gaps in the PRD.
