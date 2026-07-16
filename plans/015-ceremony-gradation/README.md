# Plan 015 — Ceremony Gradation (Initiative / Project / Task tiers)

Status: **roadmap fixed; Phase 1 approved for packaging.** Owner-facing tracking: Linear project «Градация церемонии: тиры Initiative / Project / Task» (team Mono). This document is the durable master; the full target design lives in `design/`.

## Problem

The workflow is one-size-fits-all: every change — even a one-line fix — is dragged through Project → PRD → Tech Spec → Issue(s). Two real gaps:
- **(a)** small, product-clear work is over-ceremonied;
- **(b)** genuinely multi-deliverable work (e.g. integrating Whoop + Oura + Apple Health) has no container above a single Project.

## Target model (the coherent design — the destination, not the first delivery)

Three separately-decided questions, each with a different input (details in `design/00-spine.md`):
- **Container** — Issue / Project / Initiative — by **work topology** (how many independent definitions-of-done). Structural, time-independent (in agent reality: initiative ~a week, project ~a day, task ~an hour — time is NOT a routing axis).
- **Documents/evidence** — PRD? Tech Spec? ADR? spike? migration plan? — by **uncertainty + durability + consumers + consequence** (not one axis).
- **Assurance/gates** — by **consequences** (blast-radius / reversibility).
Invariant: planning ceremony scales down freely; **quality gates never scale down**. Migrations move the **risk** dial, not the container.

Container definitions (structural): **Issue** = one atomic vertical slice, one DoD, one PR. **Project** = one coherent deliverable, one DoD, through several issues/milestones. **Initiative** = ≥2 distinct deliverables, each independently shippable+cancellable, bound by a shared **objective** (not a shared foundation; foundation is an optional `enabler`, vertical-first). Discriminator = independent definitions-of-done, verified by owner-decision-independence (accept/release/rollback alone; survives sibling cancellation; a separate valuable outcome, not an internal checkpoint).

## How this was validated — cross-vendor Second Voice (rule MONO-12)

The orchestrator ran on Claude Opus, so the Second Voice was **GPT-5.6 Sol at `xhigh`** (cross-vendor, per MONO-12), three rounds against the real repo:
- **Round 1** — found the model directionally right but the axes not truly independent, criteria gameable, "foundation-first" contradicting the repo's own "two adapters make the seam real", RFC-function lost, anti-drift self-attesting. ~90% accepted.
- **Round 2** — after revision: the design is a promising model with **unspecified state-machine + authority contracts**; do not package yet; 8 must-fix. Caught that preflight is NOT an independent auditor under orchestration, that "rollback-first" is unsafe for irreversible changes (→ containment-first), and that dissent can be laundered (→ representation handshake).
- **Round 3** — on the full assembled design: cross-contract coherence still has 8 P0 gaps, AND — decisively — **the planned "full spine + Issue-only" Phase 1 is itself over-engineered.** Cut the spine from Phase 1; keep the existing `tiny/standard/deep/risky` risk model unchanged; a much smaller Phase 1 is safe.

The full design is retained as the **documented target and later-phase input**, not as a delivery requirement.

## Delivery roadmap (phased)

### Phase 1 — Issue-only lane on the EXISTING risk model (approved to package)
Solves gap (a). Does NOT build the assurance vector, route-record ledger, five version ids, or a mandatory fresh classifier for every tiny Issue — all cut per Second Voice round 3.

Scope: a direct-Issue lane that bypasses Project/PRD/Spec for genuinely one-PR work, reusing today's risk routing.

Eligibility (all required): one independently-acceptable outcome + exactly one PR + the Issue completely specifies behavior, acceptance (stable IDs), validation, and non-goals + current risk class is `tiny` or `standard` + no risky domain / critical escalation signal + no unresolved product/UX/architecture/operational decision. (Includes one-PR UI bugs — eligibility is not about product surface.) Deep/risky stays Project-first for now (a delivery limitation, not "risk chooses the container").

Load-bearing pieces (9): `mono-issue-intake` skill; one versioned issue-only marker/label; self-contained Issue with stable acceptance IDs; owner start-approval bound to the exact Issue full-contract fingerprint via **create-then-approve** (create non-startable Issue → record owner approval comment against fingerprint → read back → activate); a **minimal** context seam returning {package kind, lifecycle-state entity, Issue behavioral oracle, current existing risk class, approval/fingerprint status}; profile-aware implement/preflight/ship/deploy/check/resume; existing preflight upward reclassification; project-first fallback when scope/risk leaves the envelope; end-to-end legacy + Issue-only fixtures.

The 8 must-fix before the Phase-1 PRD + Tech Spec (Second Voice round 3):
1. Cut Phase 1 to bounded Issue-only; retain current risk routing (tiny/standard non-risky only).
2. A real pre-entity front-door rule (do not make an entity resolver classify before an entity exists).
3. Create-then-approve; the fingerprint includes scope + acceptance IDs + verification instructions + non-goals (so verification can't change without invalidating approval).
4. Minimal context seam + marker; existing Project-first units bypass it unchanged; a missing marker never infers Issue-only.
5. Exact stage changes for intake, implement, preflight, ship, deploy, check, dispatch, resume — all consume the same minimal context.
6. Preserve existing review gates: tiny advisory, standard Issue-only still runs required `mono-review`; preflight may raise; leaving the envelope returns to Project-first.
7. No in-place promotion: before coding, park the Issue and restart Project-first; after coding, freeze an independently-shippable slice + follow-up Project, or abandon the slice.
8. End-to-end fixtures: legacy unchanged, Issue-only happy path, stale approval, risk/scope escalation, parentless ship/deploy, live Issue oracle, resume discovery.

### Phase 2 — Initiative tier (minimal)
Solves gap (b). Minimal only: one `mono-initiative` atomic skill; the native Linear Initiative description (WHY + orchestration only, no architecture); a shared objective; a measurable closure rule; ≥2 child Projects each independently acceptable/cancellable; owner-controlled closeout; optional human-readable ordering. **Do NOT** initially add Initiative route-records, aggregate-cutover reducer, cutover groups, executable DAG checkpoints, or Initiative-level live-QA — a coordinated release is an ordinary Project until recurring evidence proves the need. Full design: `design/10-dependent-contracts-ABCD.md` §C.

### Phase 3 — Risky Issue-only (gated on operational safety)
Admit `deep`/`risky` work into the Issue-only lane ONLY after **containment-first** (`design/10…` §B) and **Issue-contained safety modules** (`design/10…` §D Part 2) are in place — including the Live-QA amendment that requires content-invariant verification, not just functional smoke. Until then, risky work stays Project-first.

### Phase 4+ — build only on observed need
- **Assurance-vector split** (`design/00-spine.md`) — only if telemetry proves the current four classes are actually misrouting. Otherwise keep `tiny/standard/deep/risky`; if operational safety needs separation, add a small orthogonal `safety_profile: standard | containment`, not the full `4×5×4×9` vector.
- **Research/spike lifecycle** (`design/10…` §D Part 1) — design as a separate execution product if research becomes a recurring need; do not smuggle into Phase 1.
- **Cutover groups / aggregate risk / DAG checkpoints** (`design/10…` §C) — only if coordinated multi-Project cutovers recur, with multi-head certificate bindings.
- **Decision Record + dissent handshake** (`design/20-governance.md`) — if Decision Records recur; start with verbatim reviewer objection + a simple disposition before adding the handshake token protocol.
- **Freshness invalidation keys, observed-live write-back, five version ids, immutable route-record ledger** — cut until a concrete need appears.

## Design inputs (the full target)
- `design/00-spine.md` — assurance vector + deterministic reducer + route-record schema + workflow-context resolver + profile/version model (the Phase-4 target; NOT Phase-1).
- `design/10-dependent-contracts-ABCD.md` — A (issue-only lifecycle + start-time audit + promotion), B (containment-first), C (initiative tier), D (research + projectless documents + freshness).
- `design/20-governance.md` — Decision Record + Second-Voice dissent representation-handshake + ownership matrix + cross-contract reconciliation.

These are anchored to main @ `abd7d5f` (v0.19.1). They are a target and a research input; each future phase re-packages the relevant slice into a fresh PRD + Tech Spec against then-current `main`, re-runs the Second Voice on that slice, and does not carry the un-reduced full design into requirements.
