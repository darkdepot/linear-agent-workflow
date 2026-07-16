# PRD Template

Use Russian for Linear PRD content.

Default sections:

```markdown
## Кратко

## Акторы

## Проблема

## Текущий процесс

## Целевой процесс

## Сценарии

## Требования

## Примеры приемки

## Что должна доказать проверка

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
- Actor entries carry the operator's context inline: `A1. <кто> — <контекст/боль>`. Multi-operator products list one line per actor.
- Use actor -> capability -> benefit as a coverage check for scenarios and requirements. Do not add a long user-story section by default; make sure each meaningful requirement has a clear operator, capability, and reason.
- Lightweight PRD-lite may use plain bullets when there are only 1-3 obvious requirements.
- Requirements must be observable or structural with an explicit reason.
- Use acceptance examples when behavior depends on state or sequence. In default Russian output, use: `AE1 (безопасное сохранение). Покрывает R1 (частичное сохранение), R2. Дано ..., когда ..., тогда ...`. Bare IDs remain the canonical machine key; the Russian slug in parentheses is additive for human readability. Adapt the wording to the project config language.
- `Что должна доказать проверка` names the user-visible behaviors that Tech Spec and Issue validation must prove. It must not include commands, file paths, test filenames, or implementation details.
- Success criteria should cover both the human/operator outcome and handoff quality, so Tech Spec and Issue slicing can proceed without inventing product behavior.
- Scope boundaries must prevent downstream agents from inventing adjacent product behavior.
- Do not describe implementation architecture, schemas, file layouts, library choices, or rollout mechanics.
- If discovery workflows were skipped, mark the document as PRD-lite and call out lower confidence.
- Before finalizing, ask: what would `mono-spec` still have to invent if this PRD ended here? Fix those gaps in the PRD.
