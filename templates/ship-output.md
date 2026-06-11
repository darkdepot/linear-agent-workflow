# Ship Output Template

Default user-facing response:

```text
<Outcome sentence in human language. Say whether the PR is ready for deploy, blocked, timed out, or waiting for a named decision.>

PR: [#<number>](<url>)
Linear Issue: `<key>` - <current Linear status>

Статус ревью:
- Preflight: <ready/blocked/drift-candidate/needs-human/not run>; <кратко о локальной готовности>.
- Кто/что ревьюил: <pre-ship review + внешний авто-ревьюер PR — run/skipped/not configured; итог>.
- Documentation workflow: <run/skipped/not configured>; <изменил ли head — yes/no + итог>.
- Bug/perf proof: <not applicable or original symptom/baseline + fix proof + regression proof/gap>.
- Что нашли и что починили: <краткий список исправлений или «нет»>.
- Нерешённые треды: <количество/статус>.

Проверки CI:
- <блокирующая проверка>: <состояние>.
- <прочие релевантные проверки>: <состояние или «блокирующих нет»>.

Проверено:
- <Linear/PR/ревью/проверки/docs — что реально смотрели>.

Не проверено:
- <ручное QA/браузер/прод/мобайл/деплой и т.д. — что не запускали, или `none known`>.

Linear status:
- <issue/project sync outcome>.
- <comments/resources/status updates outcome>.

Что дальше:
1. <рекомендуемый следующий шаг, обычно `linear-deploy` при зелёном>.
2. <альтернативный следующий шаг, когда полезно>.
```

Optional internal summary for logs or Linear comments:

```text
Linear ship verdict: <green|needs-human|blocked|timed-out>

PR:
Linear Issue:
Latest head SHA:
Phases run:
Rounds run:
Checks status:
Greptile status:
Review status:
Documentation workflow:
Resolver used:
Commits pushed:
Fixes applied: <none or concise list with commit SHA>
Merge state: <clean/blocked/conflict/unknown>
Unresolved feedback:
linear-ship green certificate: <recorded/not recorded + reason>
Next: <linear-deploy | needs-human | blocked>
Notes:
```

Verdicts:

- `green`: PR is stable after documentation, review feedback, and a green review/check wait; `linear-ship green certificate` was recorded and the next workflow is `linear-deploy`.
- `needs-human`: a product, UX, business, scope, resolver, dirty-worktree, deploy-approval, or external-head-change decision is needed.
- `blocked`: required context, auth, tools, PR state, or Linear state is unavailable.
- `timed-out`: checks, reviews, Greptile, or review readiness did not settle within the wall-clock limit.

Verdict-to-human translation:

- Для `green`: «PR готов к `linear-deploy`; `linear-ship` не мержил и не деплоил.»
- Для `needs-human` при зелёном ревью/CI, но с явным deploy approval: «PR готов к деплою, жду твоего подтверждения.» Не звучит как блокер.
- Для `needs-human` при нерешённом ревью-фидбеке: «Нужно решение по ревью-фидбеку» и список конкретных нерешённых пунктов.
- Для `blocked`: назови отсутствующий пресреквизит и точный следующий unblock-шаг.
- Для `timed-out`: назови, что не устаканилось, и известно ли, что PR в целом безопасен.
