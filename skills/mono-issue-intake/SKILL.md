---
name: mono-issue-intake
description: Use after excluding a raw idea when a request is unmistakably one-PR projectless issue-only work, or when its existing Issue body needs create-then-approve renewal; Project/shaped work and artifact repair route to mono-handoff, pre-ship drift to mono-ship.
---

# Mono Issue Intake

Use this skill as the atomic front door for genuinely one-PR, projectless work that qualifies for the issue-only lane. It collapses idea → discovery → handoff → issue into a single gate: a self-contained Linear Issue, an owner-approved scope fingerprint, and the `issue-only` label — no Project, PRD, or Tech Spec.

`mono-issue-intake` is a front door, not a redirect. It owns the create-then-approve intake transaction and grants the issue-only lane only when every eligibility condition holds. Any ambiguity fails closed to Project-first: recommend `mono-idea` and stop.

Read first:

1. `AGENTS.md`
2. `references/issue-only-lane.md`
3. `references/artifact-rules.md`
4. `references/readiness-gates.md`
5. `references/human-friendly-output.md`
6. `skills/mono-idea/SKILL.md`
7. `references/contracts/issue.md`
8. `templates/issue.md`

## When issue-only is granted — the nine eligibility conditions (R1)

The issue-only lane is granted only when all nine conditions hold for the *activated* package, but they fall in two phases and the one trap to avoid is reading them as a single up-front gate. Conditions 1–3 and 9 are **outputs** of the create-then-approve transaction below — the marker, the `issue-only` label, and the owner-approved fingerprint do not exist yet on a fresh request. Applying them as intake preconditions would reject every first-time intake before the transaction that mints them can run. So the gate is two-phase.

### Prequalification — judge on the raw request, before creating anything

Conditions 4–8 are decidable from the request itself and gate whether intake may start at all. Read them as a gate, not a menu:

4. Risk class in {tiny, standard} — the intended review-gate class is tiny or standard. `deep` and `risky` stay Project-first in Phase 1 until the containment-first safety modules land.
5. Authorable as a complete self-contained Issue with a behavioral oracle — the work can be fully specified in the Issue itself (objective / scope / desired behavior), acceptance criteria with stable IDs (`AC1`..`ACn`), verification steps, and explicit non-goals, with a non-vacuous oracle (at least one acceptance ID and at least one verify step). If it cannot be made self-contained, it is not issue-only.
6. Single-PR scope — exactly one PR delivers the whole change. If it needs to be split into dependent slices, it is not issue-only.
7. Projectless, one-entity — the Issue is the sole authoritative entity and holds the lifecycle state. No Project, PRD, or Tech Spec is required or created.
8. No cross-cutting or lane-spanning scope — no risky domain, no new actors, no multi-surface or cross-cutting change, and no critical escalation signal. Eligibility is about topology, not product surface: a one-PR UI bug still qualifies.

If any prequalification condition is unmet or uncertain, fail closed to Project-first: recommend `mono-idea` and stop. Do not begin the transaction.

### Established by the transaction, enforced by the resolver — after prequalification

A prequalified request proceeds into the create-then-approve transaction, which mints these; the resolver then enforces them at activation and on every downstream resolve. Their absence on a fresh request is expected — it is exactly what the transaction is for — and is never a reason to route to `mono-idea`:

1. Valid, fresh marker — a structurally valid `mono-issue-only marker` (Marker version 1, exactly the five contract fields, no forbidden route-record field) whose `Scope fingerprint` still equals the recomputed whole-body fingerprint. A stale marker never grants the lane.
2. Verified `issue-only` label — the exact `issue-only` Linear label is present and verified against Linear, an independent second factor to the marker. A near-miss label (`not issue-only`, `issue-only candidate`) does not count.
3. Fresh, caller-verified owner approval — the owner-approved fingerprint, the live scope fingerprint, and the caller-verified fingerprint all agree (passed as `--approval-verified`). Absent, superseded, or unverified approval fails closed.
9. Owner authenticity — the approval is a genuine owner comment whose author is verified, not merely a comment that names the fingerprint. The owner authority is a specific, stable Linear user identity — the validated `issueOnlyLane.ownerPrincipal` field in the project config; when that field is absent or the lane is not enabled in config, fail closed to Project-first, because the lane then has no trusted owner to authorize approval — and the create-then-approve transaction below verifies the approval comment's author ID against it before writing the marker and label. The resolver enforces provenance-agreement and freshness; it never authenticates identity, so this author-ID check must be established here. Because the fingerprint is publicly computable, a fingerprint-naming comment from any other author is rejected. Author identity is necessary but not sufficient: because an agent can act on the owner's Linear connector, authenticity requires an explicit owner decision on the fingerprint (the human-in-the-loop checkpoint in step 4), never merely a comment attributed to the owner.

Ambiguity fails closed to Project-first. A missing or unrecognizable marker is never inferred as issue-only, and on any already-activated package a single unmet condition sends the work back to Project-first.

## Create-then-approve intake transaction (U3)

Approval for the issue-only lane binds to the scope fingerprint: the full whole-body SHA-256 of the Issue contract. This extends the package-approval rule in `references/artifact-rules.md` — the fingerprint IS the approved package. Run the transaction in order; each step fails closed.

1. Create a non-startable Issue. Author the complete self-contained Issue body (behavior, acceptance criteria with stable IDs, verification, non-goals, and the review-gate risk class) through `mono-issue` in its intake-authorized draft mode — entered because intake invoked it, not because the resolver already returned issue-only (it cannot: nothing is minted yet) — and create it in a pre-start state — a state whose type is one of `triage`, `backlog`, or `unstarted` (never `started`, `completed`, or `canceled`), matching the readiness check's pre-start requirement below. Do not write the marker and do not set the `issue-only` label yet. Nothing is startable until an approval is bound.
2. Run the mandatory review gate on the drafted body. The Issue contract is materially created here, so the review-gate policy in `references/readiness-gates.md` applies before any approval is bound. For `standard` scope, run `mono-review` on the drafted, non-startable Issue and resolve it to a `ready` outcome (no blocking findings remain, or accepted fixes were applied) — a standard issue-only Issue never becomes startable without its review. For `tiny` scope, `mono-review` is advisory and may be skipped only when the advisory reason is recorded in the Issue review-gate field (`advisory-ready`). Record the review verdict and disposition in the Issue, and review before fingerprinting so the owner approves the reviewed body, not a pre-review draft.
3. Compute the scope fingerprint over the reviewed body. Run `node scripts/resolve-issue-context.mjs --issue <issue-body> --emit-fingerprint` on the reviewed, disposition-recorded Issue, using the installer-published resolver at its canonical pack-private path — `<skills-root>/.mono-agent-workflow/scripts/resolve-issue-context.mjs`, reachable from an installed `mono-*` skill directory as `../.mono-agent-workflow/scripts/resolve-issue-context.mjs`. This is the single fingerprint authority. Never hand-compute a hash and never concatenate individual sections — the fingerprint is the whole-body SHA-256, not a per-section digest.
4. Get an explicit owner decision on the fingerprint, then record the approval. This is a hard human-in-the-loop checkpoint, not an author-ID formality: an agent running on the owner's authenticated Linear connector can post a comment attributed to the owner, so a comment's author ID alone never proves the owner decided anything. Present the reviewed Issue body and the exact fingerprint from step 3 to the owner — the principal named by the validated `issueOnlyLane.ownerPrincipal` in the project config (when it is absent or the lane is not enabled, fail closed to Project-first: there is no trusted owner to authorize the lane) — and WAIT for their explicit owner decision. Never manufacture the approval on the owner's behalf. Record that decision as the approval comment naming the exact fingerprint, made by or on the explicit instruction of the owner principal, and record the owner user ID so read-back can verify authorship. The explicit owner decision plus the verified author ID is the authenticity anchor for condition 9.
5. Read back and reconcile — fingerprint AND author. Re-read the live Issue body and the approval comment and recompute the fingerprint with `--emit-fingerprint`. Require both: (a) the approved fingerprint equals the recomputed whole-body fingerprint, and (b) the approval comment's author equals the owner principal's stable Linear user ID from step 4. A fingerprint mismatch means the body changed between create and approve; an author who is anyone other than the owner principal carries no authority even when the fingerprint is correct. On either failure park the Issue, return `BLOCKED`, and re-preview. Do not proceed on a mismatch or an unauthorized author.
6. Bind the package — label first, marker last (the marker is the commit point). Linear cannot set the label and post the marker comment in one atomic mutation, so order the two writes so no partial failure traps recovery. First set the `issue-only` label — inert on its own, because a label without a valid, fresh marker still resolves project-first. Then, as the FINAL operation, write the `mono-issue-only marker` comment with exactly the five fields — `Marker version: 1`, `Scope fingerprint` (the approved fingerprint), `Acceptance IDs`, `Risk class` (the recorded review-gate class), and `Approval` (the approved fingerprint). Writing the marker last means any failure before it leaves at most a label-only Issue (cleanly project-first, with no stale-marker trap), never a marker-only Issue whose later body edits would make the resolver hard-fail before it can fall back. On any error, roll back the partial state — remove the label and delete any marker comment written (on a renewal, this includes the previous now-stale marker — see Stale approval and reconciliation) — and return `BLOCKED`. The marker MUST NOT carry `route_revision`, `assurance_vector`, `required_artifacts`, or any sixth field: маркер ≠ route-record.
7. Require the issue-only readiness check before activation. Run `mono-check issue` in its issue-only mode against the marked, approved Issue and require `PASS` — the self-contained one-PR contract, the five-field marker, the `issue-only` label, the recorded review disposition, and the owner-approved fingerprint must all be present. If the check returns anything other than `PASS`, revoke the binding — roll back the marker and the `issue-only` label (as in step 6) so the resolver no longer resolves the package issue-only — and return `BLOCKED`; never leave a package that failed readiness in an issue-only-resolvable state. A later check cannot safely repair an already-activated package, so this readiness gate must pass before the package is declared prepared, and again before any future activation.
8. Terminate intake at a prepared, approved, non-startable package. Intake never moves the Issue to started; `mono-implement` owns activation after it re-runs the resolver and `mono-check delivery`. Record that the package is prepared for Delivery, not already in Delivery. Downstream consumers read the installer-published resolver at `../.mono-agent-workflow/scripts/resolve-issue-context.mjs`: `node <resolver> --issue <path> --marker <marker-comment> --config <project-config> --label issue-only --approval-verified <fingerprint>`. The marker lives in a Linear comment, so `--marker` is required; without it the resolver finds no marker and returns project-first. The lane remains inert unless the consuming repo explicitly sets `issueOnlyLane.enabled: true` with a non-empty `ownerPrincipal`, and intake never writes that config.

Why whole-body, not `H(scope ∥ acceptance ∥ verify ∥ non-goals)`: editing any of those four sections — or any heading, indentation, or surrounding prose — changes the whole body, so the recomputed fingerprint no longer matches the approved one and the marker goes stale. The whole-body hash leaves no free-text-Markdown parsing surface for drift to slip past; the cost is that an approval must be renewed after any Issue-body edit.

## Phase-1 go-live boundary

Phase 1 now supplies the full issue-only path across intake, implement, preflight, ship, deploy, checks, dispatch, and resume. Go-live remains allowlisted per repo: a prepared package is consumable only when the repo config explicitly enables `issueOnlyLane` and names `ownerPrincipal`; absent opt-in fails closed to Project-first. Intake still ends with a prepared, approved, non-startable package. `mono-implement` owns activation, so the create-then-approve transaction cannot silently start work and Project-first behavior remains available unchanged.

## Stale approval and reconciliation

The resolver is the stale detector; do not add a second one. A marker whose stored `Scope fingerprint` no longer matches the recomputed whole-body fingerprint emits `issue-only-lane: stale marker` and exits nonzero — that is the reconciliation guard for step 5 and for any post-approval edit. A stale, superseded, or unverified approval (marker valid, but the approved fingerprint no longer agrees with the live scope and the caller-verified fingerprint) fails closed to project-first. Renew by re-running the create-then-approve transaction against the new fingerprint.

Renewal recovery differs from first-time rollback. On a renewal the previous marker is still the authoritative newest marker and is already stale against the edited body, so a failed renewal must remove or supersede that previous marker — not only any partly written new one. Otherwise the resolver hard-fails on the old stale marker before it ever reaches the label or the config opt-in, and the package stays blocked instead of falling back cleanly. So on a failed renewal, delete the stale previous marker (and, if it was set, the label) so the Issue resolves cleanly project-first; write a superseding marker only once a fresh owner approval is in hand.

## No in-place promotion

The issue-only lane never promotes in place into a Project. If scope or risk grows past the envelope before coding starts, park the Issue and restart under Project-first via `mono-idea` → `mono-handoff`. If it grows after a `ready` preflight certificate, freeze the current independently-shippable slice, ship it, and open a separate follow-up Project for the expanded scope.

## Rules

- Grant issue-only only when all nine conditions hold; otherwise fail closed to Project-first and route to `mono-idea`.
- Never infer issue-only from marker text alone: the verified `issue-only` label and a fresh caller-verified owner approval are both required on top of a valid, fresh marker.
- Verify the approval comment's author against the owner principal's stable Linear user ID before writing the marker and label. Because the fingerprint is publicly computable, a correct fingerprint from any non-owner author proves text freshness, not authority, and is rejected.
- Never self-approve. The agent must not manufacture the owner approval via the owner's connector; approval requires an explicit owner decision on the presented fingerprint (step 4). A connector comment attributed to the owner but with no preceding explicit owner decision is not approval.
- Do not create a Project, PRD, or Tech Spec, and do not emit or attach Project/PRD/Tech Spec chips or resources — the issue-only lane has none.
- Reuse the installer-published resolver (`--emit-fingerprint`) at its canonical pack-private path `../.mono-agent-workflow/scripts/resolve-issue-context.mjs` for every fingerprint. Do not add a second hashing path and do not re-introduce section-parsed fingerprinting.
- Author the self-contained Issue through `mono-issue` in its intake-authorized issue-only draft mode (no redirect, no chips), entered on intake authority before the package is activated; do not copy Project/PRD/Tech Spec content because there is none.
- Write Linear-facing content in the project config language; use Russian when no project config is present. Repo skill instructions stay English.
- Follow the machine-block convention in `references/human-friendly-output.md`: the marker comment opens with a short Russian human sentence stating the outcome, then the unchanged machine block.

## Before finishing

- Confirm the Issue is a self-contained one-PR contract a zero-context agent could execute without a Project, PRD, or Tech Spec.
- Confirm the recorded risk class matches the Issue review-gate and is `tiny` or `standard`.
- Confirm the required review gate ran and resolved to `ready` for `standard` scope (or the advisory exception is recorded for `tiny`) before the fingerprint was bound, the issue-only readiness check passed, and the package is left prepared and non-startable for `mono-implement` to activate.
- Confirm the marker, the `issue-only` label, and the owner-approved fingerprint were written only after read-back reconciliation, and that the Issue was non-startable until then.
- Confirm the fingerprint came from `--emit-fingerprint`, not a hand-built or section-concatenated hash.
- If any check fails, park the Issue and return `BLOCKED` or route to Project-first; do not leave a half-opened lane.
