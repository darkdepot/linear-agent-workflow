# Check Output Template

Pass:

```text
PASS - Linear <mode> ready
Смысл: <по-русски, например: посмотрел нужные артефакты, блокеров не нашёл; ручную проверку это не заменяет>

Проверено:
Не проверено:
Заметки:
```

Blocked:

```text
BLOCKED - Linear <mode> not ready
Смысл: <по-русски, например: нужные артефакты не удалось прочитать или обновить, готовность неизвестна>

Чего не хватает:
Расхождения:
Риск:
Проверено:
Не проверено:
Следующий unblock:
```

Fail:

```text
FAIL - Linear <mode> not ready
Смысл: <по-русски, например: нарушен жёсткий контракт или пропущен обязательный артефакт/этап>

Нарушение контракта:
Доказательство:
Проверено:
Не проверено:
Как починить:
```

Правила:

- `PASS` means the agent inspected required state and found no blocking drift.
- `PASS` is not deterministic proof. The `Смысл:` line must say what was and was not proven.
- `FAIL` means the workflow violated a hard contract or skipped a required artifact. The `Нарушение контракта:` and `Как починить:` lines must be present.
- `BLOCKED` must include the smallest useful next action in `Следующий unblock:`.
- Every result should include a compact "not checked" boundary (`Не проверено:`) when manual QA, browser QA, production smoke, deploy verification, or user acceptance did not run.
