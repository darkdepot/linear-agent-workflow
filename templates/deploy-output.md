# Deploy Output Template

Default user-facing response:

```text
<Outcome sentence in human language. Say whether the PR was deployed, blocked, timed out, or waiting for a named decision.>

PR: [#<number>](<url>)
Linear Issue: `<key>` - <current Linear status>

Deploy status:
- Ship certificate: <found/missing/stale>; reviewed head SHA `<sha>`.
- Current PR head SHA: `<sha>`; match: <yes/no>.
- Deploy workflow: <name or missing>.
- Merged SHA: <sha or none>.
- Deploy target: <url/environment or none>.
- Deploy verification: <passed/failed/unavailable + evidence>.
- Post-ship check: <PASS/FAIL/BLOCKED + human meaning>.
- Linear closeout: <Done/not done + reason>.
- Learnings recorded: <none or keys>.

Проверено:
- <PR/merge/deploy/Linear/learning state actually inspected>.

Не проверено:
- <manual QA/browser/prod/mobile surface/etc. that did not run, or `none known`>.

Что дальше:
1. <recommended next action, when one exists>.
2. <alternative next action, when useful>.
```

Optional internal summary for logs or Linear comments:

```text
Linear deploy verdict: <deployed|needs-human|blocked|timed-out>

PR:
Linear Issue:
Reviewed head SHA:
Current head SHA:
Deploy workflow:
Merged SHA:
Deploy target:
Verification:
Post-ship check:
Linear closeout:
Learnings recorded:
Notes:
```

Verdicts:

- `deployed`: deploy workflow completed, delivery evidence was captured, post-ship check ran or was reported, and Linear closeout completed.
- `needs-human`: explicit deploy approval, product/risk acceptance, external access, or delivery policy decision is required.
- `blocked`: required config, tools, auth, certificate, PR state, deploy target, or Linear context is unavailable.
- `timed-out`: merge, deploy, or deploy verification did not settle within the configured wait.

Verdict-to-human translation:

- Для `deployed`: напиши точно, что было смержено/задеплоено и как обновился Linear.
- Для stale certificates: «PR изменился после ревью; прогони `linear-ship` ещё раз перед деплоем.»
- Для отсутствующего Deploy workflow: «Deploy workflow не настроен; укажи `Deploy workflow` или запусти deploy-путь репозитория вручную.»
- Для `timed-out`: назови, что не устаканилось — merge, deploy, верификация или Linear closeout.
