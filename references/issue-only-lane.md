# Issue-Only Lane Foundation

The issue-only lane lets a genuinely one-PR change move through the workflow
without a Project, PRD, and Tech Spec, while staying just as inspectable as the
full project-first lane. This document is the load-bearing foundation: it fixes
the versioned **marker**, the normative **5-field context contract** (the seam),
and the deterministic **resolver** that every issue-only-lane consumer reads
first. Skill wiring, the assurance vector, the route-record, and the reducer are
out of scope here and land in later slices.

## The Marker

An issue-only package is opted in by a **marker** plus a Linear label.

- **Label:** `issue-only` on the Linear Issue. The label is the human-visible,
  filterable signal; the marker is the machine-readable receipt.
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
  - `Scope fingerprint` — a deterministic fingerprint of the Issue's normative
    scope (its acceptance criteria and verify steps). It is how drift is caught:
    when the Issue body changes, the fingerprint changes and the marker goes
    stale.
  - `Acceptance IDs` — the stable acceptance-criterion IDs (`AC1`, `AC2`, ...)
    this package commits to. They must match the IDs in the Issue body.
  - `Risk class` — one of the EXISTING classes `tiny`, `standard`, `deep`,
    `risky` from `references/readiness-gates.md`, read from the Issue's
    review-gate. The marker records the existing class; it never runs a fresh
    classifier.
  - `Approval` — the owner start-approval receipt. It carries the fingerprint the
    owner approved (or `none`), so freshness can be checked against current
    scope.
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

## The Context Contract (the seam)

Every issue-only-lane consumer resolves context through one seam: a fixed
**5-field contract**. This is the stable interface later slices build on.

| Field | Domain | Meaning |
| --- | --- | --- |
| `package_kind` | `issue-only` \| `project-first` | Which lane this package is in. |
| `lifecycle_state_entity` | `issue` \| `project` | Which Linear entity holds the authoritative lifecycle state. Issue-only reads the Issue; project-first reads the Project. This is the seam that decouples the lifecycle-state source. |
| `behavioral_oracle` | `{kind: issue-verification, acceptance_ids, verify_steps}` for issue-only; `null` for project-first | How the package is proven. For issue-only the oracle is the Issue's own acceptance criteria and verify steps. |
| `risk_class` | `tiny` \| `standard` \| `deep` \| `risky` for issue-only; `null` for project-first | The EXISTING review-gate risk class, read — never re-derived. |
| `approval_status` | `approved-fresh` \| `stale` \| `absent` | `approved-fresh`: owner approved the current scope fingerprint. `stale`: an approval exists but for a superseded fingerprint. `absent`: no approval recorded. |

**Fail-closed invariant:** **no marker ⇒ `package_kind=project-first`.** A missing
or unrecognizable marker always resolves to the safe, full-ceremony lane. A
package is never silently treated as issue-only. Project-first is also the result
when the lane is explicitly disabled by config (`issueOnlyLane.enabled: false`).

## The Resolver

`scripts/resolve-issue-context.mjs` is the deterministic implementation of the
seam. It mirrors the deterministic-config-script structure of
`scripts/project-config.mjs`.

- **Inputs (`reads {issue body, marker, config}`):**
  - `--issue <path>` — the Issue body markdown (required).
  - `--marker <path>` — the marker source; defaults to the Issue body when
    omitted, so an inline or a separate-comment marker both work.
  - `--config <path>` — optional project config JSON; validated for readability
    and honored for the `issueOnlyLane.enabled` opt-out.
  - `--emit-fingerprint` — prints the computed scope fingerprint for `--issue`
    and exits; used to author markers and to build fixtures without duplicating
    the hash.
- **Output:** the 5-field contract as pretty JSON on stdout, exit `0`.
- **Fingerprint:** `sha256` over the normalized acceptance and verify sections of
  the Issue body (aligned with the design's oracle definition — a hash of the
  normalized `Критерии приемки` and `Как проверить` sections), truncated for a
  human-readable marker while staying deterministic.
- **Fail-closed behavior:**
  - No usable marker (marker line absent) ⇒ `project-first`, exit `0`.
  - A marker that is present but integrity-invalid ⇒ `process.exit(1)` with a
    single stable line to stderr. Violations: `issue-only-lane: broken marker: …`
    (unknown `Marker version`, a missing field, an invalid `Risk class`,
    mismatched `Acceptance IDs`, or a forbidden route-record field) and
    `issue-only-lane: stale marker: scope fingerprint mismatch …`. It is never
    silently resolved as issue-only.
- **Not a spine-resolver:** it emits no assurance vector, no route-record, and no
  `required_artifacts`. It reads recorded state (risk class, approval) and checks
  scope integrity; it does not classify risk, reduce an assurance vector, or
  compute a route. Those are later slices.
