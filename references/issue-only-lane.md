# Issue-Only Lane Foundation

The issue-only lane lets a genuinely one-PR change move through the workflow
without a Project, PRD, and Tech Spec, while staying just as inspectable as the
full project-first lane. This document is the load-bearing foundation: it fixes
the versioned **marker**, the normative **5-field context contract** (the seam),
and the deterministic **resolver** that every issue-only-lane consumer reads
first. Skill wiring, the assurance vector, the route-record, and the reducer are
out of scope here and land in later slices.

## The Marker

An issue-only package is opted in by a **marker** *and* the verified `issue-only`
Linear label — both are required, and the lane fails closed to project-first if
either is missing.

- **Label:** `issue-only` on the Linear Issue. The label is the human-visible,
  filterable signal; the marker is the machine-readable receipt. Both are
  required to select the lane: the resolver treats the label as trusted input the
  caller has verified against Linear, and fails closed to project-first when it is
  absent.
- **Marker:** a machine block inside a Linear comment on the Issue, opened by the
  stable marker line `linear-issue-only marker`. Following the machine-block
  convention in `references/human-friendly-output.md` and
  `references/artifact-quality.md`, the comment leads with a short Russian human
  sentence (project config language when set) stating the outcome, then the
  unchanged machine block. Example:

  ```text
  Пакет переведён в issue-only: одна PR, продуктовой поверхности нет, риск обычный.

  linear-issue-only marker
  Marker version: 1
  Scope fingerprint: 0c9c800bd1c3
  Acceptance IDs: AC1, AC2
  Risk class: standard
  Approval: 0c9c800bd1c3 (approved by owner 2026-07-11)
  ```

- **Fields — EXACTLY these five, no more:**
  - `Marker version: 1` — the versioned schema of the marker itself. An unknown
    version is a hard violation, never a silent downgrade.
  - `Scope fingerprint` — a deterministic fingerprint of the Issue's **full
    normative contract**: objective, scope, desired behavior, acceptance
    criteria, verification instructions, non-goals, and the review-gate risk
    classification. It is how drift is caught: when any of those change, the
    fingerprint changes and the marker goes stale — an approval never survives a
    change to the objective, scope, non-goals, or recorded risk, not only to the
    acceptance text.
  - `Acceptance IDs` — the stable acceptance-criterion IDs (`AC1`, `AC2`, ...)
    this package commits to. They must match the IDs in the Issue body.
  - `Risk class` — one of the EXISTING classes `tiny`, `standard`, `deep`,
    `risky` from `references/readiness-gates.md`, read from the Issue's
    review-gate. The marker records the existing class; it never runs a fresh
    classifier. In Phase 1 only `tiny` and `standard` are eligible for the lane;
    a marker recording `deep` or `risky` resolves to project-first (see the
    fail-closed invariant below).
  - `Approval` — the owner start-approval receipt. It carries the fingerprint the
    owner approved (or `none`), so freshness can be checked against current scope.
    The token alone is self-attested text; its **authenticity** (that the owner
    actually approved this fingerprint) is established by the create-then-approve
    intake transaction that writes it as a verified owner comment, and the
    resolver only trusts it when the caller passes the matching
    `--approval-verified` fingerprint (see Trust boundary).
- **Recovery:** most-recent-wins. The most recent Linear comment containing
  `linear-issue-only marker` is authoritative; older marker comments are
  superseded. Never quote the marker line inside other comments.

## Marker ≠ Route-Record

The marker is a lightweight approval receipt for the issue-only lane. It is **not**
a route-record. The boundary is explicit: **маркер ≠ route-record**.

The marker MUST NOT carry any of the spine's route-record fields:

- `route_revision`
- `assurance_vector`
- `required_artifacts`

Those belong to the future spine resolver, not to this marker. A marker that
carries any of them is malformed and is rejected (fail-closed). Keeping the
marker deliberately small is what makes the issue-only lane cheap: it records
just enough to prove an approved, non-drifted, one-PR scope — nothing that would
reintroduce project-first ceremony.

## Trust boundary

The resolver is a deterministic, pure function over its inputs. It enforces
**structure, freshness, eligibility, and provenance-agreement** — it is not, and
cannot be, the point where owner identity is authenticated. That authentication
is the job of the **create-then-approve intake transaction** (a later slice),
which is the only sanctioned marker writer: it creates a non-startable Issue,
records the owner's approval as a verified Linear comment against the exact
full-contract fingerprint, reads it back, and only then activates the package and
sets the `issue-only` label.

Because marker and label text is otherwise self-attested, the resolver never
grants issue-only from marker text alone. It additionally requires two trusted
signals the caller supplies after reading Linear:

- `--label issue-only` — the verified label is present on the Issue.
- `--approval-verified <fingerprint>` — the fingerprint the caller confirmed
  against the authenticated owner-approval comment.

Issue-only is granted only when the marker is valid and fresh, the risk class is
in the Phase-1 envelope, the verified label is present, and the marker's recorded
approval, the live scope fingerprint, and the caller-verified fingerprint all
agree. Any gap fails closed to project-first.

## The Context Contract (the seam)

Every issue-only-lane consumer resolves context through one seam: a fixed
**5-field contract**. This is the stable interface later slices build on.

| Field | Domain | Meaning |
| --- | --- | --- |
| `package_kind` | `issue-only` \| `project-first` | Which lane this package is in. |
| `lifecycle_state_entity` | `issue` \| `project` | Which Linear entity holds the authoritative lifecycle state. Issue-only reads the Issue; project-first reads the Project. This is the seam that decouples the lifecycle-state source. |
| `behavioral_oracle` | `{kind: issue-verification, acceptance_ids, verify_steps}` for issue-only; `null` for project-first | How the package is proven. For issue-only the oracle is the Issue's own acceptance criteria and verify steps. |
| `risk_class` | `tiny` \| `standard` for issue-only (deep/risky fall back to project-first in Phase 1); `null` for project-first | The EXISTING review-gate risk class, read — never re-derived. |
| `approval_status` | `approved-fresh` for issue-only; `absent` for project-first | `approved-fresh`: the owner-approved fingerprint, the live scope fingerprint, and the caller-verified fingerprint all agree. A stale (superseded) or absent approval is not a distinct issue-only state — it fails closed to project-first, so issue-only always carries `approved-fresh`. |

**Fail-closed invariant:** **no marker ⇒ `package_kind=project-first`.** A missing
or unrecognizable marker always resolves to the safe, full-ceremony lane. A
package is never silently treated as issue-only. Project-first is also the result
when the lane is explicitly disabled by config (`issueOnlyLane.enabled: false`),
and when a structurally valid marker records a `deep` or `risky` risk class — in
Phase 1 only `tiny`/`standard` are eligible, and deep/risky keeps full ceremony
until the Phase-3 safety modules land. Selecting issue-only additionally requires
the verified `issue-only` label and a caller-verified, fresh owner approval;
absent either, the resolver fails closed to project-first.

## The Resolver

`scripts/resolve-issue-context.mjs` is the deterministic implementation of the
seam. It mirrors the deterministic-config-script structure of
`scripts/project-config.mjs`.

- **Inputs (`reads {issue body, marker, config, verified label, verified approval}`):**
  - `--issue <path>` — the Issue body markdown (required).
  - `--marker <path>` — the marker source; defaults to the Issue body when
    omitted, so an inline or a separate-comment marker both work.
  - `--config <path>` — optional project config JSON; validated for readability
    and honored for the `issueOnlyLane.enabled` opt-out.
  - `--label <names>` — trusted, caller-verified Linear labels on the Issue
    (comma/space separated). Issue-only requires `issue-only` among them.
  - `--approval-verified <fingerprint>` — the owner-approval fingerprint the
    caller verified against the authenticated Linear comment. Issue-only requires
    it to equal the live scope fingerprint and the marker's recorded approval.
  - `--emit-fingerprint` — prints the computed scope fingerprint for `--issue`
    and exits; used to author markers and to build fixtures without duplicating
    the hash.
- **Output:** the 5-field contract as pretty JSON on stdout, exit `0`.
- **Fingerprint:** `sha256` over the **full normalized Issue contract** —
  objective (`Цель PR`), scope (`Что сделать`), desired behavior, acceptance
  criteria (`Критерии приёмки`), verification instructions (`Как проверить`),
  non-goals (`Что не входит`), and the review-gate risk (`Ревью-гейт`) —
  truncated for a human-readable marker while staying deterministic. Binding the
  full contract, not just acceptance + verify, is what makes an approval fail
  when the objective, scope, non-goals, or recorded risk change.
- **Fail-closed behavior:**
  - No usable marker (marker line absent) ⇒ `project-first`, exit `0`.
  - A structurally valid marker whose `Risk class` is `deep` or `risky` ⇒
    `project-first`, exit `0` — out of the Phase-1 envelope, not corrupt.
  - A valid, in-envelope marker without the verified `issue-only` label, or
    without a fresh caller-verified owner approval ⇒ `project-first`, exit `0` —
    the opt-in is incomplete, not corrupt.
  - A marker that is present but integrity-invalid ⇒ `process.exit(1)` with a
    single stable line to stderr. Violations: `issue-only-lane: broken marker: …`
    (unknown `Marker version`, a missing field, an unknown extra field beyond the
    five, an unparseable line inside the machine block, a duplicate field, an
    invalid `Risk class`, an empty behavioral oracle, mismatched `Acceptance IDs`,
    or a forbidden route-record field) and `issue-only-lane: stale marker: scope
    fingerprint mismatch …`. It is never silently resolved as issue-only.
- **Not a spine-resolver:** it emits no assurance vector, no route-record, and no
  `required_artifacts`. It reads recorded state (risk class, approval) and checks
  scope integrity; it does not classify risk, reduce an assurance vector, or
  compute a route. Those are later slices.
