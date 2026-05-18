# PRD Template

Use Russian for Linear PRD content.

Default sections:

```markdown
## Кратко

## Акторы

## Целевой оператор

## Проблема

## Оператор и контекст

## Текущий процесс

## Целевой процесс

## Сценарии

## Требования

## Примеры приемки

## Критерии успеха

## Что не входит в MVP

## Допущения

## Открытые вопросы

## Связи
```

Rules:

- PRD defines WHAT: user/operator behavior, scope boundaries, requirements, and success criteria.
- Treat this as a lightweight PRD without PRD ceremony. Include what the Tech Spec and Issue need; skip sections that add no value for the current scope.
- Resolve product decisions here. Do not make the Tech Spec invent product behavior, actors, or acceptance.
- Use stable actor IDs (`A1`, `A2`, ...), flow IDs (`F1`, `F2`, ...), requirement IDs (`R1`, `R2`, ...), and acceptance example IDs (`AE1`, `AE2`, ...).
- Lightweight PRD-lite may use plain bullets when there are only 1-3 obvious requirements.
- Requirements must be observable or structural with an explicit reason.
- Use acceptance examples when behavior depends on state or sequence. In default Russian output, use: `AE1. Покрывает R1, R2. Дано ..., когда ..., тогда ...`. Adapt the wording to the consumer config language.
- Success criteria should cover both the human/operator outcome and handoff quality, so Tech Spec and Issue slicing can proceed without inventing product behavior.
- Scope boundaries must prevent downstream agents from inventing adjacent product behavior.
- Do not describe implementation architecture, schemas, file layouts, library choices, or rollout mechanics.
- If discovery workflows were skipped, mark the document as PRD-lite and call out lower confidence.
- Before finalizing, ask: what would `linear-spec` still have to invent if this PRD ended here? Fix those gaps in the PRD.
