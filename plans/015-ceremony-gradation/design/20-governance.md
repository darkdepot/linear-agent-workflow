# GOVERNANCE Design Contract — Decision Record, Dissent Handshake, Ownership Matrix, Cross-Contract Reconciliation

Anchor: main @ abd7d5f, v0.19.1. Honors the SPINE (Section 5) and consumes contracts A (issue-only lifecycle), B (containment), C (initiative tier), D (research/projectless). This layer is authored by the orchestrator/director because it SPANS all four; it discharges Sol round-2 finding R5 (dissent laundering) + the ownership-matrix MUST-FIX, and reconciles the cross-contract open questions.

## §1 — Decision Record + Second Voice dissent handshake (Sol R5)

### 1.1 When a Decision Record exists
A **Decision Record (DR)** is written whenever a decision is CONTESTED — i.e. either (a) a Second Voice / independent review objected and the objection was NOT fully adopted, or (b) a real alternative was seriously considered and rejected on a load-bearing axis. Uncontested, obvious decisions get NO DR (no ceremony inflation). The route-record's `classified_by` + the ordinary artifacts already capture uncontested choices.

### 1.2 DR contents (the RFC function, preserved without a universal RFC)
proposal · considered alternatives (each with the load-bearing tradeoff) · the independent objection(s) verbatim-or-faithfully-represented · **owner-visible unresolved dissent** · accepted decision · `accepted_by` · `authority_basis` · `status`.

### 1.3 Storage (two forms, per Sol R5 + D's ADR-scope split)
- **Durable/cross-unit decision** (outlives or constrains multiple Issues/Projects) → **ADR** in the repo (GitHub), via `linear-ship` `document-pr` + `domain-modeling` (contract D §2.4). Not a forced Linear Project.
- **Local contested decision** scoped to one unit → a **structured approval comment** on the Issue/Project/Initiative (Linear), machine block under marker `linear-decision-record`, most-recent-`decision_revision` wins (route-record discipline; never a durable body — artifact-rules.md:40).

### 1.4 Status lifecycle (append-only; NOT "immutable/uncorrectable")
`Proposed → Accepted → Superseded`. A superseding DR is a NEW record with a higher `decision_revision` that names the record it supersedes with bidirectional links; the prior record is never edited in place. This mirrors the ledger's "corrections are new lines" (orchestration.md) and the spine's route-record supersession.

### 1.5 authority_basis (who may accept — reuses orchestration.md Decision Authority)
- **technical decision** (implementation, seam, tooling) → the **orchestrator** may accept and record.
- **scope / design / product-risk / irreversible-production** dissent → **explicit owner adjudication** required; the orchestrator prepares and routes the decision brief but never self-accepts (orchestration.md:32-47). Each DR carries `authority_basis ∈ {technical, scope, design, product-risk, irreversible}` and, when ≠ technical, an `owner_ack_ref`.

### 1.6 The representation handshake (the integrity fix)
The orchestrator is the single Linear writer, so it could paraphrase an objection into harmlessness. Therefore: **a dissent may be recorded as "resolved / not-adopted" ONLY after the objecting reviewer confirms it is faithfully represented.**
- Mechanism (codex-thread Second Voice): the orchestrator drafts `{objection, disposition, why-not-adopted}` and sends it back to the reviewer thread (`codex exec resume`). The reviewer returns the literal token **`faithfully-represented`** OR a correction; only a `faithfully-represented` disposition is valid. A correction is incorporated and re-confirmed (≤2 handshake rounds; on non-convergence the raw objection is recorded verbatim and escalated to the owner).
- The handshake artifact (`objection`, `disposition`, `faithfully-represented|corrected`, reviewer id/model) is part of the DR. This makes "the critique did not change the decision" auditable by the owner, not a private paraphrase.
- Boundary: the handshake certifies FAITHFUL REPRESENTATION of the objection, not agreement. The reviewer need not agree with the disposition — only confirm its objection was stated honestly.

## §2 — Consolidated ownership matrix
For each artifact/decision: creator · Linear-writer (during orchestration the single writer applies queued mutations — orchestration.md) · reviewer · acceptance-authority · invalidation-event · consumer.

| Artifact / decision | Creator (skill) | Linear writer | Reviewer | Acceptance authority | Invalidated by | Consumer |
|---|---|---|---|---|---|---|
| Initiative + brief | `linear-initiative` (NEW, C§VI) | single writer / `linear-initiative` | `linear-review initiative` | **owner** (objective metric) | objective change; child-topology edit | child Projects; deploy cutover |
| Project + brief | `linear-project` | single writer | `linear-review handoff` | owner (package approval) | scope change | PRD/Spec/Issues |
| PRD | `linear-prd`/`linear-handoff` | single writer | `linear-review` | owner | discovery/scope change | Spec, Issue, deploy oracle |
| Tech Spec | `linear-spec`/`linear-handoff` | single writer | `linear-review`/preflight | orchestrator (technical) | scope/contract drift; stale sample | Issue, preflight |
| Issue (delivery) | `linear-issue`/`linear-issue-intake` (NEW, A§0) | single writer | preflight/ship review | owner (impl-start approval, fingerprint) | fingerprint drift | implement→deploy |
| Issue-contained safety modules (D§2) | `linear-issue`/handoff | single writer | preflight + Security lens | orchestrator (technical) unless irreversible→owner | stale migration assumptions | preflight/ship/deploy |
| Route-record | `classified_by` skill (handoff/intake/preflight) | **single writer only** | preflight recompute (assurance_check) | n/a (machine) | any re-classification; promotion | resolver → all stages |
| Decision Record / ADR | orchestrator (draft) + `domain-modeling` (repo ADR) | single writer / repo PR | the objecting reviewer (handshake) | technical→orchestrator; else→owner | premise change (freshness); supersession | future units touching the decision |
| Safety certificate (B§3) | `linear-deploy` | single writer | n/a (binds route-record) | orchestrator arm; owner if no-checkpoint/irreversible | new head_sha; missing checkpoint | deploy gate; incident recovery |
| Research certificate (D§1.5) | `linear-implement` (research mode) | single writer | `linear-check research-closeout` | owner if conclusion feeds a floor-level unit | stale invalidation keys | Tech Spec/PRD/ADR/estimate |
| Cutover group + emergent vector (C§II) | `linear-initiative`/handoff (declared) | single writer | `linear-review initiative` | owner (group deploy-approval per INV-2) | membership edit; child re-classification | `linear-deploy` group release |
| Freshness record (D§3) | the artifact's creator | single writer | resolver (freshness_state) | n/a (machine) | pinned source revision moves | resolver → gates |
| Containment authority (B§4) | `linear-deploy` at approval | single writer | n/a | owner grants at deploy-approval | new head_sha | incident Phase A/C |

Invariants preserved: single Linear writer during orchestration; control-plane boundary (orchestrator sequences/routes, never authors stage artifacts — the NEW `linear-initiative`/`linear-issue-intake` are atomic artifact skills, not orchestrator absorption); `linear-review` report-only; `linear-check` readiness-only.

## §3 — Cross-contract reconciliation (resolving shared open questions)

1. **3-level route-record precedence (Issue→Project→Initiative)** — extends A§C.4 to three levels (C flagged it). Rule: the resolver walks Issue→Project→Initiative; at each level highest `route_revision` wins; a child MAY override its inherited container record only with an explicit `override_reason` naming the superseded container `route_revision`; a bare override without reason = fault → fail-closed to inherit + flag. Assurance is NOT auto-inherited downward: a child's own vector governs the child; the initiative's cutover-group vector governs only the group cutover event (C§II) — never floods children.

2. **assurance_ruleset_version ↔ prose autoreview table (spine #3)** — DECIDED: `references/autoreview-routing.md` gains an explicit `assurance-ruleset-version: <semver>` header line; a validator pin binds it; a route-record whose `assurance_ruleset_version` ≠ the file header ⇒ resolver `blocked` (fail-closed). Re-tiering the table bumps the header + the pin in the same commit (mirrors the existing pin/wording-in-one-commit discipline).

3. **Independent verification of a floor-level research conclusion (D deferred)** — DECIDED, honoring the `code-review-single-vendor-gpt` memory + Second-Voice-only cross-vendor rule: a research conclusion feeding a spine-floor (migration/irreversible) delivery requires **owner risk-acceptance on the conclusion** (parallel to spine Step-D owner risk-acceptance), NOT a mandatory cross-vendor Second Voice on the research evidence. Cross-vendor independence stays reserved for subjective product judgment (Second Voice); research-evidence verification is owner-accepted, not vendor-crossed.

4. **Promotion on a non-safety product reason (A open-Q2)** — DECIDED: default NO. After a `ready` cert only a safety defect revokes the frozen slice (A§C.3). A business-grounds promotion of a certified-not-yet-deployed slice is an **explicit owner-adjudicated, ledgered override** with mandatory re-gate under the new profile — never silent, never orchestrator-initiated.

5. **Cutover-group membership authority (C open-Q1)** — ADOPT C's proposal: **declared** by owner/handoff, validated by `linear-review initiative`; the reducer auto-SUGGESTS a group when members share a hard-trigger, but suggestion ≠ authority.

## §4 — Governance fixtures
Executable (spine #12): (1) contested decision with a not-adopted Second Voice objection ⇒ DR created, dissent owner-visible, handshake `faithfully-represented` present; a DR recording a dissent as resolved WITHOUT a handshake token ⇒ FAIL. (2) scope/irreversible authority_basis without `owner_ack_ref` ⇒ FAIL (orchestrator cannot self-accept). (3) DR supersession writes a new revision with bidirectional links; in-place edit ⇒ FAIL. (4) route-record ruleset_version ≠ file header ⇒ resolver blocked. (5) 3-level precedence: a bare Issue override with no reason under a Project under an Initiative ⇒ fail-closed inherit + flag; with reason ⇒ Issue wins. (6) floor-level research conclusion consumed without owner risk-acceptance ⇒ handoff/delivery check FAIL.

## §5 — Governance open question (deferred)
Handshake availability in headless/cron runs: the representation handshake needs the reviewer thread reachable. When the Second Voice reviewer is unavailable at DR time (async), the fallback is: record the objection verbatim (no paraphrase) + mark dissent `representation: unconfirmed-verbatim` + escalate to owner; never a paraphrase without a handshake. Whether unconfirmed-verbatim may block a merge is deferred to the ship/deploy gate owners.
