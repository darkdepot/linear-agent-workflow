# SPINE Design Contract — Workflow Assurance & Routing Redesign (ACCEPTED)

Baseline anchor: main checkout `/Users/sasha/Projects/mono-agent-workflow` @ abd7d5f, VERSION 0.19.1. This is the FIXED spine; dependent contracts must honor Section 5's 12 decisions and may not re-decide it.

## Section 1 — Assurance Composition Contract

### 1.1 The vector (replaces the single ordinal)
Assurance = a vector of three inputs + a one-way trigger set:
- `review_complexity` (rc): how hard the diff is to reason about. Values low→high: `tiny`, `standard`, `deep`, `critical`. Targets: autoreview model+effort; mono-review depth.
- `inherent_operational_consequence` (ioc): if it breaks, how bad — BEFORE mitigation. Values: `none`, `low`, `moderate`, `high`, `severe`. Targets: owner-visibility floor; mandatory safety modules; whether owner risk-acceptance required; deploy-approval requirement.
- `residual_risk` (rr): risk AFTER verified controls. `{value: none|low|moderate|high, proof_state: planned|verified-predeploy|observed-live, evidence_ref}`. Targets: rollout intensity; monitoring intensity — ONLY.
- `hard_triggers[]` (HT): subset of exactly nine — `auth`, `payments`, `pii`, `destructive-data`, `irreversible`, `public-contract`, `cross-tenant`, `shared-db-blast-radius`, `new-abstraction`. Targets: mandatory safety modules + route/consequence floors REGARDLESS of rr.

rc tops at `critical` (pure reasoning), NOT `risky` (which is an operational-consequence concept). The dangerous-domain path to sol/high is produced by the reducer from ioc/HT, not asserted as rc.

### 1.2 rc → autoreview route (onto existing autoreview-routing.md:10-16, no new models)
- rc=tiny → R0 luna/low ; rc=standard → R1 luna/medium ; rc=deep → R2 sol/high ; rc=critical → R4 sol/xhigh.
- R3 (risky = sol/high) is NEVER an rc value; the reducer EMITS it when ioc/HT force sol/high while reasoning difficulty was only standard. R2 and R3 share (model,effort) but differ in downstream modules (the difference the old ordinal lost).
- Missing rc on non-tiny ⇒ default `deep` (preserves autoreview-routing.md:60-61). R1 inherits the PROVISIONAL/re-tier caveat; re-tier bumps assurance_ruleset_version, never ad-hoc.
- Route lattice for MAX: R0 < R1 < R2 < R3 < R4. Emit canonical rows verbatim; never synthesize an off-table (model,effort).

### 1.3 The reducer (deterministic)
- Step A — effective residual: `rr_eff = rr.value` iff proof_state ∈ {verified-predeploy, observed-live} AND evidence_ref present; else `max(rr.value, implied(ioc))`. implied: none→none, low→low, moderate→moderate, high→high, severe→high. (A merely `planned` control earns no credit.)
- Step B — route = MAX over floors: route(rc); ioc≥high→R3, ioc=severe→R4; per-trigger: irreversible→R4; auth|payments|pii|destructive-data|public-contract|cross-tenant|shared-db-blast-radius→R3; new-abstraction→R2. Reducer sets FLOOR only; preflight reclassification may RAISE (writes new route_revision). Tie R2/R3 on (model,effort): record the winning CAUSE (deep vs risky) so downstream modules differ.
- Step C — mono-review requirement: `required` when route≥R1 OR HT≠[] OR ioc≥moderate; `advisory` only when route=R0 AND HT=[] AND ioc≤low.
- Step D — mandatory safety-evidence modules (union of trigger- and ioc-mandated, REGARDLESS of rr_eff): auth→authz matrix+negative-path; payments→idempotency+reconciliation+no-double-charge; pii→data-flow note+access-scope+log-redaction; destructive-data/migration→forward+rollback proof+dry-run+reversibility/backup; irreversible→owner risk-acceptance(required)+snapshot/backup+abort criteria (forces R4); public-contract→backward-compat+versioning+consumer-impact; cross-tenant→tenant-isolation test; shared-db-blast-radius→blast-radius note+lock/perf+staged rollout; new-abstraction→stable-seam justification+seam test; ioc≥high→owner risk-acceptance comment; ioc=severe→+rollback rehearsal.
- Step E — deploy-approval (keyed on ioc+HT+policy; NEVER rr alone — INV-2). risky-only ⇒ required when ioc≥moderate OR HT≠[] OR ioc unknown (fail-closed). rr_eff=high may RAISE, never lower below the ioc/HT requirement.
- Step F — rollout+monitoring (keyed on rr_eff — the ONLY gate residual touches): none/low→direct/standard; moderate→staged-or-flagged/active-window; high→guarded(flag+canary)+rollback-rehearsed-predeploy/explicit-window (+observed-live required to close residual lower post-deploy).

### 1.4 Invariants
- INV-1 (evidence-gated relief): handling may sit below inherent/trigger level only with proof_state∈{verified-predeploy,observed-live}+evidence_ref; planned never lowers. Relief applies to rollout/monitoring ONLY — route/review/safety-modules/deploy-approval have NO residual relief.
- INV-2 (approval anchor): deploy_approval=f(ioc,HT,policy); rr may only raise. Closes self-de-escalation.
- INV-3 (one-way trigger): HT hit forces escalation; HT=[] proves nothing — recorded as trigger_scan{detector_version, result:none-detected, note:absence-not-proof}.
- INV-4 (escalation-only): reducer=MAX; reclassification may only raise.

### 1.5 Preserved policy (must not regress)
migration = destructive-data(+ioc≥high) ⇒ route floor R3 (`risky`). irreversible ⇒ R4 (`sol/xhigh`).

### 1.6 Legacy↔vector mapping (round-trip identity for tiny|standard|deep|risky required as fixture)
Forward: tiny→{rc tiny,ioc low,rr low,HT[]}→R0; standard→{standard,moderate,moderate,[]}→R1; deep→{deep,moderate,moderate,[new-abstraction if arch]}→R2; risky→{standard,high,high,domain-derived HT}→R3; risky+critical→{critical,severe,high,irreversible+}→R4. Reverse (vector→ordinal, for legacy `risk=` fields e.g. preflight cert SKILL.md:89): tiny if route=R0∧HT=[]∧ioc≤low; standard if route≤R1∧HT=[]; deep if route=R2(deep cause); risky if route≥R3.

## Section 2 — Route-Record Schema
Storage: immutable machine block in a Linear COMMENT under marker `mono-route-record` (Issue-level for issue units; Project/Initiative-level for containers), fenced JSON. NOT in durable bodies (artifact-rules.md:28,40). Corrections = new comments with incremented route_revision (never edit); highest route_revision wins. Additive queryable Linear LABEL for discovery (`route/v<schema-major>/<artifact_profile>/<legacy-class>` + `assured/owner-ack` when ioc≥high + `assured/triggers` when HT≠[]); labels are hints only, comment block authoritative.
Fields (required unless noted): route_schema_version; assurance_ruleset_version; route_revision(int monotonic); classified_by; container(issue|project|initiative); artifact_profile(project-first|issue-only, missing⇒project-first, unknown⇒fail-closed); required_artifacts[]; review_complexity; inherent_operational_consequence(unknown⇒fail-closed as high); residual_risk{value,proof_state,evidence_ref}; hard_triggers[]; trigger_scan{detector_version,result,note}; oracle_kind(prd-acceptance|tech-spec-contract|issue-verification|prototype|none); oracle_id(if kind≠none); oracle_revision(if kind≠none); scope_fingerprint; approval_refs[{type:package|impl-start|risk-accept|deploy, ref, pr?, head_sha?}]; assurance_requirements{autoreview_route{model,effort,row},review_requirement,review_depth,safety_modules[],deploy_approval,rollout_profile,monitoring_profile}; audits{topology_check{state},documentary_closure_check{state},assurance_check{state}} state∈pass|fail|blocked|pending.
Fail-closed: unknown schema/ruleset/profile ⇒ blocked; missing record ⇒ synthesize conservative legacy (project-first, ioc=high, review required, residual.proof_state=planned, assurance_check=pending) and block any RELAXED gate; missing profile field ⇒ project-first; any required field absent under known schema ⇒ blocked.

## Section 3 — Workflow-Context Resolver
One shared contract (`references/workflow-context.md`, optionally script-backed like project-config.mjs) every stage calls FIRST. Inputs: linear_ref, stage, git_context(optional), project_config. 10 steps: fetch entity→walk to container; locate authoritative route-record (highest route_revision), else container-level, else synthesize legacy; validate schema+ruleset (unknown⇒blocked); resolve artifact_profile+expand required_artifacts; resolve oracle{kind,id,revision}+live revision+drift; determine lifecycle_state_source (project-first→Project status; issue-only→Issue status) — THE seam; recompute scope_fingerprint+drift; gather typed approval_refs (deploy validates pr+head_sha freshness); re-derive assurance_requirements via pinned ruleset + compare to recorded (mismatch⇒assurance_check=fail); run the stage-appropriate start-time audits.
Output struct: {container, artifact_profile, required_artifacts[], behavioral_oracle{kind,id,revision,live_revision,drift}, lifecycle_state_source{entity,field}, scope_fingerprint, scope_drift, approval_refs[], route_revision, route_schema_version, assurance_ruleset_version, assurance_requirements{...}, audits{...}, resolution_status: ok|blocked|needs-record}.
Stages branch ONLY on resolver OUTPUTS (required_artifacts, lifecycle_state_source, assurance_requirements), NEVER on the raw artifact_profile string. Adding a profile changes resolver expansion tables, not seven skills. Per-stage consumption: idea→needs-record seeds provisional; handoff→writes FIRST authoritative record + documentary_closure_check pre-approval; implement→lifecycle_state_source to Delivery + verify impl-start approval; preflight→assurance_requirements.autoreview_route as floor + recompute fingerprint + may raise (new route_revision); ship→review_requirement/depth + safety_modules checklist; deploy→deploy_approval(from ioc/HT not rr) + rollout/monitoring + oracle for live-QA + validate deploy approval freshness; check→audits + required_artifacts per mode.

## Section 4 — Profile & Version Model
Five decoupled ids: route_schema_version (field-set/parser); artifact_profile (a NAME: project-first|issue-only|…); assurance_ruleset_version (reducer semantics; bumped by re-tier); workflow_release_version (repo VERSION/lockfile upstreamVersion); route_revision (this unit's emission). Rules: missing profile⇒project-first; unknown profile/schema/ruleset⇒FAIL CLOSED (blocked) naming the version. String pins CANNOT certify — executable dual-profile + reducer-matrix fixtures REQUIRED (follow validateProjectConfigBehavior/runNode subprocess pattern), asserting: per-profile resolution; reducer matrix incl. preserved-policy + 4 legacy rows; INV-1/INV-2(explicit RED test: lowering rr never removes ioc/HT deploy approval)/INV-3 as executable tests; fail-closed; legacy round-trip identity.

## Section 5 — Decisions dependent contracts MUST honor
1. Assurance is a VECTOR not an ordinal; no dependent contract reintroduces a single risk scalar as an INPUT (may emit legacy ordinal via reverse map).
2. Reducer is the ONLY vector→gates path; deterministic, MAX/escalation-only, verbatim canonical rows; preflight may raise never lower.
3. Route floors preserved: migration⇒R3(risky); irreversible⇒R4(xhigh).
4. INV-1/2/3/4 load-bearing; esp INV-2: deploy-approval keys on ioc+HT+policy never rr alone — no contract adds an rr-only relaxation.
5. hard_triggers detector one-way: hit escalates; [] never proof of safety.
6. One route-record per unit, immutable `mono-route-record` comment block, superseded by higher route_revision, discoverable via additive label. Certificates remain separate machine blocks, shape unaffected.
7. Fail-closed everywhere.
8. Resolver is THE single entry point; stages branch on outputs not the raw profile string; Issue-only gets authoritative state from lifecycle_state_source.
9. Five decoupled versions; re-tier bumps assurance_ruleset_version not route_schema_version.
10. Three start-time audits (topology_check, documentary_closure_check, assurance_check) live in record.audits with states pass|fail|blocked|pending; dependent audit contract fills bodies but keeps these names/states/location.
11. Behavioral oracle pinned by revision (oracle_kind+id+revision); resolver surfaces oracle_drift; research may use oracle_kind=none but must define its own closure criterion.
12. String pins can't certify this; executable dual-profile + reducer-matrix fixtures are a required deliverable.

## Section 6 — Spine-level open questions (assigned to dependent contracts)
1. Container-vs-Issue record precedence (proposed: Issue inherits, may override with recorded reason) → PROMOTION-SEMANTICS contract.
2. Label taxonomy cardinality (proposed 3 facts) → product/ops confirm.
3. assurance_ruleset_version ↔ prose autoreview-routing table binding (version header? checksum?) → RULESET-VERSIONING (assign to whichever contract touches autoreview; flag).
4. observed-live write-back post-deploy: who writes it, may it retro-lower a CLOSED unit's residual (proposed: yes for learning, no for re-gating shipped unit) → ISSUE-ONLY LIFECYCLE / RESEARCH contracts.
5. oracle_kind=none closure criterion for research → RESEARCH LIFECYCLE contract.
