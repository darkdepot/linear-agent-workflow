# Human-Friendly Workflow Output

Workflow output should help the user understand the real state of the work, not the internal pipeline that produced it.

Use these rules for user-facing status updates, final responses, Linear comments, and decision prompts.

## Outcome First

Start with the human outcome:

- What is durable now?
- Is the work ready, waiting, blocked, or incomplete?
- What exact decision or unblock is needed?

Do not start with internal verdict labels, phase names, tool transcripts, or raw command directives.

## Status Glossary

Translate workflow statuses before showing them to the user:

- `PASS`: "I inspected the required state and found no blocking drift." Also say what was not proven.
- `FAIL`: "A hard workflow contract was violated or a required artifact/stage is missing."
- `BLOCKED`: "I could not inspect or mutate required state because something external is unavailable." Name the smallest unblock step.
- `ready`: "Review is complete for this gate and no blocking findings remain."
- `advisory-ready`: "This was low-risk/advisory and nothing blocks moving forward."
- `needs-fixes`: "Review found changes or decisions that should be handled before the next stage."
- `blocked`: "Review cannot complete because required artifacts, permissions, tools, or context are missing."
- `pr-created`: "The PR exists and Linear is synced, but configured review/landing has not completed."
- `green`: "The PR is stable after review/checks, but it has not been merged or deployed by this workflow."
- `merged`: "The PR was merged/deployed and Linear closeout ran."
- `needs-human`: never leave this raw. Say which human decision is needed:
  - "Ready to land, waiting for merge/deploy approval."
  - "Decision needed on review feedback."
  - "Decision needed on product, UX, business, scope, or external state."
- `timed-out`: "Waiting did not settle in time." Name what is still pending and whether safety is known or unknown.

## Checked / Not Checked

For any handoff, review, check, ship, blocked, or timed-out final, include a compact confidence boundary:

```text
Проверено:
- <artifact/state/check that was actually inspected>

Не проверено:
- <manual QA/browser/prod/mobile/deploy surface/etc. that did not run>
```

Keep this short. The goal is trust calibration, not an audit log.

If something cannot be inspected, say `unknown` instead of implying it passed.

## Human Decision Prompts

When asking for a decision, list options with consequences and a recommendation when one is clear.

Prefer:

```text
Что дальше:
1. Land and deploy сейчас - рекомендую, потому что review/CI зеленые и unresolved feedback нет.
2. Оставить PR в review - если хочешь руками посмотреть UI перед merge.
```

Avoid:

```text
1 - land
2 - review
```

## Fresh-Agent Handoff Option

Offer a fresh-agent handoff as a first-class next step when any of these are true:

- the session is long or close to compaction;
- implementation is about to start after substantial discovery;
- there are multiple execution Issues or parallelizable slices;
- the user expressed concern about context quality;
- the next step would benefit from a clean prompt and bounded scope.

When offering it, include the tradeoff:

- Continue here: fastest when context is still clean and the next slice is small.
- Fresh-agent handoff: safest when the current thread is long or discovery-heavy.
- Subagent-driven flow: useful only when work can be split without losing product/style coherence.

## Blocked / Timed-Out Shape

Blocked or timed-out responses must still be useful:

```text
Работа не завершена.

Уже durable:
- <links/state that exist>

Где остановился:
- <exact blocker or pending state>

Чего не было сделано:
- <Issue/PR/merge/deploy/code/etc.>

Следующий unblock:
- <one smallest useful action>
```

Do not call a blocked run complete. Do not hide partial durable state.
