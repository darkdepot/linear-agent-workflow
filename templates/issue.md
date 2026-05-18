# Issue Template

Use Russian for Linear Issue description.

Required sections:

```markdown
# Прочитать сначала

# Цель PR

# Что сделать

# Покрытие PRD/Spec

# Где менять

# Как проверить

# Критерии приемки

# Что не входит

# Связи

# Снимок контекста

# Ревью-гейт
```

Rules:

- Issue is a one-PR execution contract.
- Include `Прочитать сначала` links or chips for Project, PRD, Tech Spec, and relevant repo docs.
- Include Linear chips/entity mentions for Project, PRD, and Tech Spec where available.
- Add PRD and Tech Spec as Linear resources/links when the connector supports it.
- Do not use raw document URLs in the body when Linear chips can represent those entities.
- Include an implementation-critical context snapshot.
- Do not copy PRD or Tech Spec wholesale into the Issue. Pull only the context needed for one PR.
- Map the Issue scope to PRD requirement IDs and Tech Spec surfaces when available.
- Include concrete validation, acceptance criteria, and non-goals.
- Acceptance criteria should be checkable by another implementation agent without reading the whole discovery conversation.
- Do not attach PRD or Tech Spec docs to the Issue.
- Include validation commands or exact manual checks.
- Include risk classification, whether `linear-review` was required/advisory/skipped, verdict, review evidence or comment link, finding disposition, owner workflow, and next step.
- Split only into vertical slices with dependencies when one PR is truly too large.
