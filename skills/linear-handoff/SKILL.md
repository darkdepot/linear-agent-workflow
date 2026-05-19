---
name: linear-handoff
description: Use after discovery or plan reviews to turn shaped work into Linear Project, PRD, Tech Spec, and execution Issue(s). This is the primary post-discovery route.
---

# Linear Handoff

Use this skill after discovery and reviews to turn shaped work into a Linear-backed execution package.

`linear-handoff` is the primary bridge from thinking to execution. It packages discovery output into Linear source-of-truth artifacts, gets user approval, creates Issue contracts, and only then hands off to implementation.

Read first:

1. `AGENTS.md`
2. `skills/linear-project/SKILL.md`
3. `skills/linear-prd/SKILL.md`
4. `skills/linear-spec/SKILL.md`
5. `skills/linear-issue/SKILL.md`
6. `skills/linear-review/SKILL.md`
7. `skills/linear-check/SKILL.md`
8. `references/artifact-rules.md`
9. `references/artifact-quality.md`
10. `references/readiness-gates.md`
11. `references/execution-quality.md`
12. `references/questioning.md`
13. `references/lifecycle.md`
14. `references/human-friendly-output.md`

When to use:

- After `/office-hours` or `/brainstorming`.
- After `/plan-design-review` or `/plan-eng-review`.
- When a discovery or review session produced an implementation plan and the user wants to proceed through Linear.
- When shaped context exists but Linear Project, PRD, Tech Spec, and Issues are not yet current.

Inputs to gather:

- Linear Project link or id from `linear-idea`.
- Current conversation discovery decisions.
- Relevant `/office-hours`, `/brainstorming`, `/plan-design-review`, and `/plan-eng-review` outputs.
- Existing Linear Project, PRD, Tech Spec, and Issues.
- Latest `linear-review` report when one already exists.
- Minimal repo context needed to verify scope, interfaces, and validation.

Quality bar:

- Use the strongest upstream artifact shape available:
  - Superpowers-style route discipline: shaping must produce an approved spec before implementation planning.
  - gstack-style premise and alternatives discipline: important choices are surfaced to the user before they land in durable artifacts.
  - Compound-style WHAT/HOW split: PRD answers WHAT, Tech Spec answers HOW, Issue answers one-PR execution.
- Handoff should make the next agent invent less, not more.
- Prefer fewer, stronger artifacts over verbose workflow transcripts.
- Do not rely on lint scripts to make artifacts good. The skill must produce clean artifacts by construction.

User-facing handoff UX:

- Assume the user already knows the idea. Do not re-explain discovery back to them unless the package changes the interpretation.
- Be confident and artifact-oriented: show how approved discovery maps into Project, PRD, Tech Spec, and Issue(s).
- Put Project first, then documents, then Issue(s). The Issue is execution detail, not the primary container of the work.
- Explain each artifact by job: Project is the product brief and lifecycle container, PRD is WHAT, Tech Spec is HOW, Issue is the first one-PR execution slice.
- Say clearly whether anything has been written to Linear yet. Draft approval and completion have different tones.
- Keep capability caveats small and decision-relevant. Do not center the response on connector limitations unless they block the next step.

Draft package approval UX:

- The pre-write approval screen must be a package map, not an idea recap.
- It must include:
  - "Nothing written yet" or the exact mutation boundary.
  - Project brief shape.
  - PRD product decisions.
  - PRD actor -> capability -> benefit coverage and behavior-validation intent.
  - Tech Spec implementation decisions.
  - Issue slicing, `AFK`/`HITL` readiness, dependencies, and why this split is right.
  - Review gate, risk, and validation plan.
  - Decision options.
- If there is one recommended path, name it plainly.

Draft package example:

```text
Готов handoff draft. В Linear пока ничего не записывал.

Я разложил approved discovery в пакет так:

Project
Короткий product brief: привести Settings initial loading к structural skeletons. Без workflow-шума, без списков документов и без статуса реализации в body.

PRD
Фиксирует продуктовые правила: все Settings pages, только initial page load, skeleton structural-not-literal, route-known chrome остается стабильным, mobile/a11y не ломаются, background refresh и redesign не входят.

Tech Spec
Фиксирует реализацию: небольшой Settings skeleton kit в `src/components/settings`, route-family mapping для form/table/list/detail/logs pages, reuse текущих `Skeleton`, `Card`, `SettingsShell`, `SettingsSectionNav` и logs skeleton direction.

Issue
Один PR: `Привести initial skeleton состояний Settings к structural kit`.
Я бы не дробил это на несколько issues: изменение широкое по routes, но цель одна. Если резать по страницам, выше риск получить разный skeleton language в одном разделе.

Review gate
Risk: `standard`, потому что touched surface широкий: много Settings routes и визуальное качество. Перед Issue будет handoff review; перед PR нужен pre-ship review.

Validation
Static: `pnpm typecheck`, lint/targeted tests по факту diff.
Visual: desktop/mobile smoke на representative routes: general, profile, integrations, provider detail, import detail, accounts, counterparties, logs.

Что делаем?
1. Зафиксировать пакет в Linear и остановиться перед кодом. Рекомендую, если хочешь сначала увидеть durable PRD/Spec/Issue.
2. Зафиксировать пакет и сразу после readiness gate начать реализацию.
3. Поправить пакет перед записью.
```

Plan Mode behavior:

- If invoked in Plan Mode, produce a new exit plan for Linear handoff only.
- Treat the current or previous discovery/review plan as input context.
- Do not mutate Linear.
- Do not create PRD, Tech Spec, or Issue yet.
- Do not change code, create branches, create PRs, or start implementation.
- Frame the exit plan positively as the next workflow step: turn discovery into Linear-backed delivery.
- The exit plan must make clear that approval starts Linear handoff, not code implementation.

Plan Mode exit-plan shape:

```text
Plan: turn discovery into a Linear-backed execution package

1. Gather discovery and review context from this session and available artifacts.
2. Prepare the Linear Project update as a concise product brief.
3. Prepare the PRD from product and workflow decisions.
4. Prepare the Tech Spec from engineering and design review decisions.
5. Classify risk and identify whether `linear-review handoff` is required or advisory.
6. Present the Linear handoff package and review-gate plan for approval before durable writes.
7. After approval, update Linear artifacts, run or report `linear-review handoff`, apply accepted artifact fixes through `linear-handoff`, and create Linear Issue(s) as execution contracts.
8. Run the delivery gate before implementation starts from those Issues.
9. Return the approved Issue link(s) and stop unless the user explicitly approved starting implementation.

No code changes happen during handoff.
```

Execution-mode workflow:

1. Fetch fresh Linear Project, PRD, Tech Spec, and Issue state.
2. Gather discovery and review artifacts.
3. Synthesize a draft handoff package before mutating durable Linear artifacts:
   - Project summary as a concise product brief.
   - PRD as product truth with requirement IDs and acceptance examples when useful.
   - PRD coverage check for actor, capability, benefit, and behavior-validation intent.
   - Tech Spec as implementation truth that traces HOW decisions back to PRD requirements.
   - Proposed Issue slicing with one-PR default, `AFK`/`HITL` readiness, and explicit dependencies if split.
   - Risk classification and whether the review gate is required, advisory, skipped, or blocked.
   - Remaining assumptions, if any, that the user should see before Issue creation.
4. Run a content-shape review on the package:
   - Project reads like a product brief, not a dashboard.
   - PRD contains WHAT and acceptance, not implementation architecture.
   - PRD requirements and scenarios have clear actor, capability, and benefit coverage.
   - Tech Spec contains HOW and validation, not product rediscovery.
   - Issue slices are durable execution contracts, not copied PRD/Spec documents or brittle edit scripts.
   - Bug and performance Issues carry a reproduction or feedback-loop expectation.
   - Operational status, lifecycle gates, and workflow mechanics are absent from Linear-facing bodies.
5. Present the draft package summary to the user for package approval before durable writes.
6. If approval is missing, rejected, or changes are requested, do not create Issue(s), do not move the Project to Delivery, revise and re-present or stop as `BLOCKED / INCOMPLETE` with current links.
7. After package approval, create or update PRD and Tech Spec in Linear.
8. Update the Project body with only the product brief concerns: what, why, target outcome, in scope, and out of scope. Render headings in the consumer config language; default Russian headings are `Что`, `Зачем`, `Образ результата`, `Что входит`, and `Что не входит`.
9. Record approval as a Linear comment. The comment should identify the approved package, PRD/Tech Spec links or intended titles, approved Issue slice titles or ids, and whether implementation may start.
10. Run or report `linear-review handoff` when the gate is required or advisory.
11. Present review verdict, blocking findings, proposed fixes, and decisions to the user before Issue creation.
12. Record accepted review fixes, explicit deferrals, and final approval as a Linear comment.
13. Apply accepted Project, PRD, Tech Spec, or Issue-plan fixes through `linear-handoff`.
14. Create or update Linear Issue(s) from the approved package.
15. Run or report `linear-check handoff` and `linear-check issue`.
16. If the user explicitly approved implementation start, move the Project to Delivery and run or report `linear-check delivery`. If delivery check fails or is blocked, stop and report the current Linear artifact links.
17. Hand off to the configured implementation or ship workflow from the approved Issue(s) only after delivery readiness passes.

Rules:

- Keep durable workflow truth in Linear.
- Treat local and gstack artifacts as discovery inputs, not durable source of truth.
- Do not approve or implement a raw discovery/review plan directly.
- Do not start code implementation until Linear Issue(s) exist and are approved as execution contracts.
- Do not treat package approval as implementation-start approval unless the user explicitly approved starting implementation from the created Issue(s).
- Do not treat PRD or Tech Spec creation as Delivery.
- Keep Project descriptions free of active-doc lists, active-issue lists, lifecycle bookkeeping, and workflow mechanics.
- Keep PRD/Spec bodies free of review-readiness dashboards, next-skill instructions, lint/check instructions, and lifecycle bookkeeping.
- Do not create PRs directly; use the consumer repo's configured ship workflow after Issues are ready.
- Keep Linear-facing Project, PRD, Tech Spec, Issue descriptions, and comments in the consumer config language; use Russian when no consumer config is present.
- Keep repo skill instructions and docs in English.
- Use Linear comments for user review acceptance, not Project Updates.
- Split Issues only when one PR is truly too large; split into vertical slices with explicit dependencies.
- Mark every execution Issue as `AFK` or `HITL` and name dependencies or blockers.
- If a source artifact is a local plan or review report, translate it into PRD/Spec/Issue shape. Do not paste the local artifact body into Linear unchanged.
- `linear-review` is report-only. Do not ask it to apply fixes or create artifacts.
- Required `linear-review handoff` findings must be resolved, accepted, or explicitly deferred before creating Issues.
- Advisory tiny-scope review may be skipped only when the reason is recorded in the Project and Issue review-gate fields.
- Apply accepted review fixes in `linear-handoff`; then run `linear-check` to report readiness.

Final response after an approved package must include:

- Outcome sentence: handoff is fixed in Linear and whether code was touched.
- Clickable artifact map, ordered Project -> PRD -> Tech Spec -> Issue(s).
- Project status.
- One-line role for each artifact:
  - Project: top-level product brief and lifecycle container.
  - PRD: WHAT decisions and boundaries.
  - Tech Spec: HOW, mapping, validation, rollout or rollback.
  - Issue(s): execution slice(s), usually one PR unless split is necessary.
- Review verdict, risk classification, and whether the review gate was required or advisory.
- Clear statement whether the user needs to run `linear-review` again. If handoff review and checks already passed and artifacts did not change afterward, say repeat review is not needed until implementation or pre-ship.
- Compact "checked / not checked" boundary when review, validation, manual QA, browser checks, or implementation did not run.
- Next-step options with a recommendation.
- Offer fresh-agent handoff as a first-class option when the current session is long, the user raised context-quality concerns, or implementation is about to start after substantial discovery.

Completion example:

```text
Готово. Handoff зафиксирован в Linear, код не трогал.

Пакет:
- Project: [Settings skeleton states cleanup](<url>) - статус `Discovery`; верхний контейнер работы и короткий product brief.
- PRD: [Settings structural skeletons](<url>) - WHAT: какие Settings loading states покрываем, что значит structural-not-literal, где границы.
- Tech Spec: [Settings structural skeletons](<url>) - HOW: skeleton kit, route-family mapping, validation, rollout/rollback.
- Issue: [ZENI-6](<url>) - первый execution slice; сейчас это один PR.

Пакет уже проверен: `linear-review handoff` и `linear-check` прошли, блокеров нет. Повторно запускать `linear-review` сейчас не нужно. Следующий review нужен перед PR/ship, после реализации.

Проверено:
- Linear Project/PRD/Tech Spec/Issue package shape.
- Handoff review/check gate.

Не проверено:
- Код и UI: реализация еще не начиналась.

Безопасные пути дальше:

1. **Начать реализацию здесь** - рекомендую, если остаемся в этой сессии.
   Я сначала сделаю implementation-start checkpoint: перечитаю Project/PRD/Tech Spec/Issue, проверю git status/branch и только потом начну код.

2. **Подготовить handoff prompt для свежего агента** - лучший вариант, если не хочешь тащить длинный чат в реализацию.
   Я соберу короткий prompt с Linear links, scope, validation и запретом на rediscovery.

3. **Запустить subagent-driven flow** - подходит, если работу можно безопасно разрезать.
   Для визуальных задач чаще выбирай один implementer + reviewer agents, чтобы не потерять единый стиль.

4. **Еще обсудить пакет** - если хочешь поменять split, validation или scope до старта кода.
```

If implementation start was explicitly approved, the final response may replace the next-step options with the implementation-start checkpoint and the workflow that will run next.

If handoff is `BLOCKED / INCOMPLETE`, include the current Project/PRD/Tech Spec links that exist, the missing approval or inspection step, and a clear statement that no Issue creation or implementation handoff happened.
