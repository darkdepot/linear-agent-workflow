---
name: linear-deploy
description: Use after linear-ship reports green to merge/deploy through the configured deploy workflow, verify delivery, close Linear, and record durable learnings.
---

# Linear Deploy

Use this skill after `linear-ship` has created a deploy-ready PR and recorded a `linear-ship green certificate`.

`linear-deploy` owns merge/deploy delegation, deploy evidence, post-ship Linear closeout, and durable operational learning capture. It must not create the PR, run local branch preflight, or perform initial implementation.

Requires `linear-ship green certificate` before any merge or deploy action.

Read first:

1. `AGENTS.md`
2. `skills/linear-ship/SKILL.md`
3. `skills/linear-check/SKILL.md`
4. `references/artifact-rules.md`
5. `references/readiness-gates.md`
6. `references/execution-quality.md`
7. `references/install.md`
8. `references/human-friendly-output.md`
9. `templates/deploy-output.md`

Workflow:

1. `prepare`: fetch fresh Linear Issue, Project, PRD, Tech Spec, PR, and project config.
2. `prepare`: read the latest `linear-ship green certificate` from Linear comments or resources. If no certificate exists, route to `linear-ship`.
3. `prepare`: verify the PR URL/number and current PR head SHA match the certificate. If the head changed, route back to `linear-ship` for review stabilization.
4. `prepare`: confirm required checks, Greptile/review state, unresolved review threads, and merge state are still compatible with the certificate.
5. `approve`: if deploy requires explicit user approval and no approval is recorded, stop with `needs-human`.
6. `deploy`: delegate merge/deploy to the configured Deploy workflow. Default Zeni/GStack workflow is `gstack land-and-deploy`.
7. `verify`: capture merge SHA, deployment URL/environment, deploy status, and verification evidence from the Deploy workflow.
8. `post-ship`: run or report `linear-check post-ship` after deploy evidence is known.
9. `linear-closeout`: update the Linear Issue to `Done` only after verified deploy or an explicit accepted delivery policy says merge is delivery for this repo.
10. `learn`: record durable operational discoveries with `gstack-learnings-log` when they would save future time.
11. Return the concise report in `templates/deploy-output.md`.

Deploy workflow config:

- Read `workflows.deploy` from `.agents/linear-workflow.config.json` when present.
- Treat missing, placeholder, or `None` Deploy workflow as `blocked`; do not invent a merge/deploy path.
- Do not accept `Land workflow` as a compatibility alias. Projects must migrate to `workflows.deploy`.

Learning capture:

- Use the gstack operational learning pattern, not interactive `/learn`.
- Record only durable discoveries such as deploy config quirks, merge queue behavior, branch cleanup pitfalls, review-loop facts, or repo-specific verification commands.
- Do not run `/learn prune`, `/learn export`, `/learn stats`, or any interactive learning-management command automatically.
- Include `Learnings recorded: <none|keys>` in the deploy report and Linear closeout comment.

Deploy closeout shape:

When recording this closeout as a Linear comment, open with the Russian human lead above the machine block. The first Russian sentence must state the shipped product outcome and verification environment:

```text
Выкатили: <что получили пользователи>; проверено на <среда>.
<опционально: одно дополнительное предложение — итог или следующий шаг>

linear-deploy closeout
Deploy: <deployed|blocked|needs-human|timed-out>
Issue(s): <keys>
PR: <number/url>
Reviewed head SHA: <sha from linear-ship green certificate>
Merged SHA: <sha or none>
Deploy workflow: <name>
Deploy target: <url/environment or none>
Deploy verification: <passed/failed/unavailable + evidence>
Post-ship check: <PASS/FAIL/BLOCKED + meaning>
Linear closeout: <Done/not done + reason>
Learnings recorded: <none/list>
Checked: <states inspected>
Not checked: <manual/browser/mobile/prod surfaces not inspected>
```

The Russian product-outcome lead is required in Linear; the machine core below the marker is never translated or summarized away.

Verdicts:

- `deployed`: deploy workflow completed, delivery evidence was captured, post-ship check ran or was reported, and Linear closeout completed.
- `needs-human`: explicit deploy approval, product/risk acceptance, external access, or delivery policy decision is required.
- `blocked`: required config, tools, auth, certificate, PR state, deploy target, or Linear context is unavailable.
- `timed-out`: merge, deploy, or deploy verification did not settle within the configured wait.

Rules:

- Do not create or update the PR except through the configured Deploy workflow.
- Do not merge or deploy without a current `linear-ship green certificate`.
- Do not deploy if the current PR head SHA differs from the certificate head SHA.
- Do not run repo documentation workflow here; repo documentation must happen in `linear-ship` before final green certification.
- Do not close Linear as `Done` before deploy evidence exists, unless the project policy explicitly says merge is delivery and that acceptance is recorded.
- Do not use Project Updates as a required gate; record closeout in Linear comments/resources and status.
- Keep Linear-facing comments in the project config language; use Russian when no project config is present.
- Include checked/not-checked boundaries. Deploy success does not imply manual browser QA, mobile QA, or production smoke unless those actually ran.

Final response must include:

- Deploy verdict.
- PR URL, reviewed head SHA, and merged SHA when present.
- Deploy workflow and target.
- Verification evidence.
- Linear closeout outcome.
- Learnings recorded.
- Checked and not-checked boundary.
