# Issue Template

Use Russian for Linear Issue description.

Required sections:

```markdown
# Цель PR

# Что сделать

# Покрытие PRD/Spec

# Где менять

# Как проверить

# Критерии приемки

# Что не входит

# Связи

# Снимок контекста
```

Rules:

- Issue is a one-PR execution contract.
- Include Linear chips/entity mentions for Project, PRD, and Tech Spec where available.
- Add PRD and Tech Spec as Linear resources/links when the connector supports it.
- Do not use raw document URLs in the body when Linear chips can represent those entities.
- Include an implementation-critical context snapshot.
- Do not copy PRD or Tech Spec wholesale into the Issue. Pull only the context needed for one PR.
- Map the Issue scope to PRD requirement IDs and Tech Spec surfaces when available.
- Acceptance criteria should be checkable by another implementation agent without reading the whole discovery conversation.
- Do not attach PRD or Tech Spec docs to the Issue.
- Split only into vertical slices with dependencies when one PR is truly too large.
