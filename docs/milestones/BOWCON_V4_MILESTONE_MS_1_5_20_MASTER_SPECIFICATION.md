# BOWCON V4 — MILESTONE MS-1.5.20 MASTER SPECIFICATION

**Subsystem:** Governed Policy Decision Ingestion, Canonical Ratification & Atomic Staged Deployment Engine  
**Architectural Stage:** Phase 1.5 — Strategic Inter-Federation Governance, Continuous Integrity & Policy Ratification  
**Milestone ID:** `MS-1.5.20`  
**Status:** **MASTER SPECIFICATION — HARDENED (IMPLEMENTATION NOT AUTHORIZED)**  
**Predecessor Milestone:** `MS-1.5.19` (Verified & Locked)  
**Successor Boundary:** `MS-1.5.21` (Negative Firewall Only — Strictly Unauthorized)  

---

## 1. Governance Status

- **Authority Level:** Human Authority Discretionary Authorization  
- **Milestone Phase:** Master Specification Generation & Governance Hardening  
- **Implementation Status:** **PROHIBITED** — Requires explicit Human Authority token: `APPROVE MS-1.5.20 IMPLEMENTATION`  
- **Constitutional Principle:**  
  > *MS-1.5.20 receives and verifies authority; it does not manufacture authority.*  
  > *MS-1.5.20 tiếp nhận và xác minh thẩm quyền; MS-1.5.20 không tự sinh ra thẩm quyền.*

---

## 2. Human Authorization Boundary

The following constitutional boundaries are supreme, non-negotiable, and fail-closed:

```text
AGENT_CAPABILITY != HUMAN_AUTHORITY
KNOWLEDGE != AUTHORIZATION
CONSENSUS != AUTHORIZATION
CONFIDENCE != AUTHORITY
AGREEMENT != HUMAN_APPROVAL
STATE != PRIVILEGE
PERSISTENCE != EXECUTION
RECOMMENDATION != POLICY
DELIBERATION != APPROVAL
APPROVAL != EXECUTION
SIMULATION != EXECUTION
SIMULATION_RESULT != AUTHORIZATION
HASH != AUTHORIZATION
HUMAN_APPROVAL != DIRECT_EXECUTION
APPROVED_FOR_PDP_HANDOFF != POLICY_APPROVED
APPROVED_FOR_PDP_HANDOFF != EXECUTION_AUTHORIZATION
MS-1.5.19 != PDP
MS-1.5.19 != POLICY_AUTHORITY
MS-1.5.19 != DIRECT_EXECUTION
LEASE_SUPERVISION != LEASE_EXPANSION

PDP_INGESTION != POLICY_RATIFICATION
POLICY_RATIFICATION != POLICY_ACTIVATION
POLICY_ACTIVATION != AGENT_EXECUTION
HUMAN_APPROVAL != AUTOMATIC_DEPLOYMENT
VALID_HANDOFF != VALID_POLICY
VALID_POLICY != ACTIVE_POLICY
ACTIVE_POLICY != EXECUTION_AUTHORIZATION
POLICY_SIGNATURE != HUMAN_AUTHORITY
CRYPTOGRAPHIC_INTEGRITY != AUTHORIZATION
CANARY_SUCCESS != CONSTITUTIONAL_APPROVAL
DEPLOYMENT_SUCCESS != GOVERNANCE_SUCCESS
ROLLBACK_AUTHORITY != POLICY_CREATION_AUTHORITY
ROLLBACK != POLICY_CREATION
ROLLBACK != AUTHORITY_ESCALATION
ROLLBACK != PDP_BYPASS
```

---

## 3. Repository Baseline

- **Repository Root:** `c:\Users\MSI_dualXeon\Desktop\BOW\bow-agent`
- **Total Registered Components:** 1,167 (1,144 REAL, 16 PARTIAL, 7 MOCK, 98.03% REAL)
- **Highest REAL Component:** Component 1167 (`GovernedStrategicPolicyEvolutionModuleIndex`)
- **Highest Dedicated Test Suite:** Suite #113 (`tests/test_v4_ms15_governed_strategic_policy_evolution.ts` — 160/160 PASS)
- **Protected Workspace:** `C:\BOW\shopofbow` (Untouched, evaluated `False`)
- **Execution Primitives Scan:** 0 forbidden primitives (`child_process`, `execSync`, `spawn`, `eval`, `new Function`, `puppeteer`, `playwright`, CDP)
- **Predecessor Milestones:** MS-1.5.15 through MS-1.5.19 all verified and locked at 100% pass rates.

---

## 4. Architectural Purpose

MS-1.5.19 established the Governed Strategic Policy Evolution, Advisory Mediation & Deliberation Gateway. It produced structured deliberation dossiers and packaged them into a non-authoritative `PdpPolicyHandoffPackage` with the constitutional invariant `isAuthoritativePolicy: false` and `APPROVED_FOR_PDP_HANDOFF != POLICY_APPROVED`.

**MS-1.5.20 closes the architectural gap between deliberation and runtime enforcement:**
1. Ingests `PdpPolicyHandoffPackage` at the formal entrance to the PolicyDecisionPoint (PDP).
2. Authenticates Human Decision Tokens (including mandatory two-person rule for `CRITICAL` risk proposals).
3. Authoritatively ratifies proposed policy deltas into canonical, versioned strategic policies.
4. Compiles policies into deterministic runtime representations with strict monotonic versioning (OCC/CAS).
5. Orchestrates atomic staged activation (`Shadow` → `Canary Ring` → `Full Active Deployment`).
6. Enforces automated and manual rollback to cryptographically verified prior snapshots upon safety regression.

---

## 5. Scope

MS-1.5.20 encompasses:
- Intake validation and replay defense for `PdpPolicyHandoffPackage`.
- Cryptographic verification of human operator signatures and two-person verifier signatures.
- Authoritative PDP ratification ledger and certificate generation.
- Canonical policy normalization, deterministic ordering, and canonical hashing.
- Tenant-partitioned durable policy storage with atomic filesystem swaps (`.tmp` → `.bak` → active).
- Shadow evaluation against historical federated decision traces.
- Multi-ring canary deployment coordination with health metric checks.
- Zero-downtime atomic active policy swapping.
- Automated fail-closed rollback on circuit breaker trip or metric violation.
- Unbroken 38-event cryptographic SHA-256 audit ledger chaining.

---

## 6. Non-Goals

MS-1.5.20 strictly does **NOT**:
- Generate, synthesize, or propose new strategic policies (reserved for MS-1.5.18 / MS-1.5.19).
- Replace MasterHumanAuthority or permit autonomous self-ratification.
- Execute tools, spawn operating system processes, or actuate hardware.
- Expand agent autonomy leases or bypass runtime tool-level PDP evaluation.
- Enable cross-tenant policy leakage or shared mutable state between tenants.
- Perform real-time streaming telemetry observability (reserved for future observability milestones).
- Conduct multi-enterprise confederation treaty negotiations (reserved for future inter-enterprise milestones).

---

## 7. Authority Model

```text
                  MasterHumanAuthority
                           │ (Supreme Constitutional Human Approval)
                           ▼
                  PolicyDecisionPoint (PDP)
                           │ (Authoritative Ratification Boundary)
       ┌───────────────────┴───────────────────┐
       │   MS-1.5.20 INGESTION & DEPLOYMENT     │
       │   - Intake Gateway (Verification)     │
       │   - Ratification Engine (PDP Auth)    │
       │   - Canonical Policy Store (OCC/CAS)  │
       │   - Staged Deployment Controller      │
       │   - Rollback Controller               │
       └───────────────────▲───────────────────┘
                           │
             ┌─────────────┴─────────────┐
             │   PdpPolicyHandoffPackage │ (Non-Authoritative Handoff Interface)
             │   `isAuthoritativePolicy`: false
             └─────────────▲─────────────┘
                           │
       [MS-1.5.19] Governed Strategic Policy Evolution
```

- **Deliberation vs Ratification:** Deliberation in MS-1.5.19 compiles evidence and certifies that humans deliberated. Ratification in MS-1.5.20 legally binds the proposal into the PDP authoritative rule-set.
- **Ratification vs Activation:** A policy may be ratified but held in `RATIFIED` or `SHADOW` state before activation. It only affects live decisions once promoted to `CANARY` or `ACTIVE`.
- **Activation vs Execution:** An active policy only sets the rules under which agents operate; it never triggers execution directly.

---

## 8. Component Architecture

MS-1.5.20 defines exactly 10 discrete, modular components:

| Component Placeholder | Target Component Name | Responsibility | Reality Classification |
| :--- | :--- | :--- | :---: |
| `NEXT_COMPONENT_01` | `GovernedPolicyDecisionIngestionTypes` | Canonical types, branded IDs, 18-state lifecycle, 16 checkpoints, 38 audit event types, error hierarchy, and 8 SHA-256 hashers. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_02` | `PdpPolicyHandoffIntakeGateway` | Ingests `PdpPolicyHandoffPackage` from MS-1.5.19, validates schema, verifies provenance hash, checks base version freshness, and defends against replay. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_03` | `HumanDecisionTokenVerificationEngine` | Cryptographically verifies human operator signatures, enforces two-person rules for `CRITICAL` proposals, checks expiration, nonces, and binds tokens to dossiers. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_04` | `AuthoritativePolicyRatificationEngine` | Authoritative PDP ratification gate; transitions verified handoffs to ratified policies, generates signed ratification records, and enforces constitutional invariants. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_05` | `CanonicalStrategicPolicyCompiler` | Deterministically compiles `PolicyDelta[]` into normalized, ordered canonical policy structures and computes canonical policy SHA-256 hashes. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_06` | `StrategicPolicyVersionStore` | Multi-tenant crash-safe partitioned policy store (`.tmp` → readback checksum → `.bak` → atomic rename) with monotonic OCC/CAS versioning and lineage DAG tracking. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_07` | `StrategicPolicyShadowEvaluationEngine` | Read-only in-memory evaluation of candidate policies against historical federated decision traces with strictly zero operational side-effects and zero tool execution. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_08` | `StrategicPolicyStagedDeploymentController` | Orchestrates multi-stage ring activation (`Shadow` → `Canary Cohorts` → `Full Active Deployment`) with health gates, circuit breaker monitoring, and atomic runtime promotion. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_09` | `StrategicPolicyRollbackController` | Automated and manual fail-closed rollback engine restoring verified prior policy snapshots upon circuit trip, safety degradation, or operator revocation. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_10` | `GovernedPolicyDecisionIngestionModuleIndex` | Public barrel export interface and master coordinator integrating MS-1.5.20 with `globalPDP` and the active runtime synchronization engine. | `SPECIFIED / ALLOCATED (Target: REAL)` |

---

## 9. Input/Output Contracts

### Input Contract: `PdpPolicyHandoffPackage` (from MS-1.5.19)
```typescript
export interface PdpPolicyHandoffPackage {
  handoffId: string;
  proposalId: string;
  dossierId: string;
  tenantId: string;
  policyDomain: PolicyDomain;
  proposedChanges: PolicyDelta[];
  humanApprovalCertified: true;
  isAuthoritativePolicy: false; // Must be false upon intake
  dossierProvenanceHash: string;
  packagedAt: number;
}
```

### Ratification Output Contract: `AuthoritativeRatificationRecord`
```typescript
export interface AuthoritativeRatificationRecord {
  ratificationId: string;
  handoffId: string;
  proposalId: string;
  tenantId: string;
  policyDomain: PolicyDomain;
  policyVersion: number;
  parentVersion: number;
  canonicalPolicyHash: string;
  dossierProvenanceHash: string;
  humanSignatures: string[];
  ratifiedBy: string; // PDP Authority Identifier
  ratifiedAt: number;
  status: 'RATIFIED' | 'REVOKED';
  ratificationSignature: string;
}
```

### Deployment Output Contract: `PolicyDeploymentRecord`
```typescript
export interface PolicyDeploymentRecord {
  deploymentId: string;
  ratificationId: string;
  tenantId: string;
  policyDomain: PolicyDomain;
  policyVersion: number;
  stage: 'SHADOW' | 'CANARY' | 'ACTIVE' | 'ROLLED_BACK';
  canaryCohort?: string[];
  activatedAt: number;
  activeUntil?: number;
  deploymentLockHash: string;
  previousActiveVersion: number;
}
```

---

## 10. Handoff Intake Gateway

The `PdpPolicyHandoffIntakeGateway` evaluates 20 discrete validation criteria fail-closed:
1. **Schema Completeness:** All required fields populated with non-empty strings and valid numbers.
2. **Handoff Identity Uniqueness:** `handoffId` has not been previously ingested (persisted replay cache).
3. **Tenant Binding:** `tenantId` conforms to regex `^[a-zA-Z0-9_-]{1,64}$` and contains zero reserved path tokens (`CON`, `PRN`, `AUX`, `NUL`, `..`, `\0`).
4. **Policy Domain Validity:** Domain is one of canonical `PolicyDomain` enum values.
5. **Non-Authoritative Invariant:** `isAuthoritativePolicy === false` (rejects forged pre-authoritative packages).
6. **Certified Human Approval:** `humanApprovalCertified === true`.
7. **Dossier Hash Integrity:** SHA-256 provenance hash is valid 64-character hex.
8. **Policy Delta Non-Emptiness:** `proposedChanges.length > 0` and `<= 50` deltas.
9. **Delta Structure Validity:** Every delta has valid `fieldPath`, `operation`, `beforeValue`, `afterValue`, and `justification`.
10. **Timestamp Freshness:** `packagedAt` is within `MAX_HANDOFF_TTL_MS` (24 hours) of current system clock.
11. **Future Clock Defense:** `packagedAt <= Date.now() + 5000ms`.
12. **Lineage Parent Binding:** Base version matches currently active policy version for the tenant/domain.
13. **Proposal Non-Duplicate:** `proposalId` has not already been ratified or rejected in the current version epoch.
14. **System Interlock Check:** Global and domain kill switches in PDP are disengaged.
15. **USER_STOP Check:** No active USER_STOP signal for the tenant.
16. **Tenant Partition Isolation:** Handoff matches the active calling tenant partition context.
17. **Source Milestone Tag:** Provenance verifies origin from `MS-1.5.19`.
18. **Payload Size Ceiling:** Total handoff JSON payload `<= 512 KB`.
19. **Constitutional Axiom Gate:** Policy deltas do not attempt to modify hard-forbidden invariants or safety interlocks.
20. **Deterministic Re-Hash:** Recomputing hash over `proposedChanges` matches `dossierProvenanceHash` cross-reference.

---

## 11. Human Decision Verification

The `HumanDecisionTokenVerificationEngine` strictly enforces:
- **Operator Signature Validation:** Cryptographic verification using public key binding or HMAC-SHA256 secret tokens.
- **Two-Person Rule for CRITICAL:** If impact analysis classified the proposal as `CRITICAL`, ingestion requires two distinct verifiers (`operatorId !== twoPersonVerifierId`), each with distinct verified signatures.
- **Nonce & Replay Defense:** Each decision token includes a single-use UUIDv4 nonce; used nonces are recorded in a durable cache.
- **Binding to Dossier Hash:** The signature payload must include `operatorId + proposalId + dossierProvenanceHash + decision + tenantId`.
- **Anti-Agent Self-Approval:** Rejects any signature generated by an agent identity, synthetic persona, or automated loop.

---

## 12. Ratification Engine

The `AuthoritativePolicyRatificationEngine` operates as the formal PDP authority gate:
- Validates intake certificate and human verification results.
- Queries supreme constitutional rules: rejects any delta attempting to relax autonomy lease ceilings, delete audit ledgers, or disable kill switches.
- Executes atomic OCC/CAS on the policy version: verifies `expectedVersion === currentActiveVersion`.
- Generates an immutable `AuthoritativeRatificationRecord`.
- Appends event `POLICY_RATIFIED_BY_PDP` to the 38-event cryptographic audit ledger.
- Output: A verified ratified policy package ready for deterministic compilation.

---

## 13. Canonical Policy Model

A canonical policy represents the single authoritative source of truth for a tenant/domain:

```typescript
export interface CanonicalStrategicPolicy {
  policyId: string;
  tenantId: string;
  policyDomain: PolicyDomain;
  policyVersion: number;
  parentVersion: number;
  rules: Record<string, CanonicalPolicyRule>;
  metadata: {
    ratificationId: string;
    ratifiedAt: number;
    effectiveAt?: number;
    expiresAt?: number;
    provenanceHash: string;
    canonicalHash: string;
  };
}

export interface CanonicalPolicyRule {
  ruleId: string;
  fieldPath: string;
  action: 'ALLOW' | 'DENY' | 'REQUIRE_HUMAN_APPROVAL';
  parameters: Record<string, any>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  immutable: boolean;
}
```

---

## 14. Policy Store

The `StrategicPolicyVersionStore` provides durable, partitioned persistence:
- **Root Directory:** `data/partitions_strategic_policies/<tenantId>/<policyDomain>/`
- **File Structure:**
  - `active_policy.json`: Current production policy.
  - `active_policy.json.bak`: Immediate backup for instantaneous rollback.
  - `versions/version_<versionNumber>.json`: Immutable historical ratified versions.
  - `ratifications/ratification_<ratificationId>.json`: Ratification certificates.
  - `deployments/deployment_<deploymentId>.json`: Staged deployment states.
- **Atomic 4-Step Write Protocol:**
  1. Write serialized JSON to `.tmp_<uuid>.json`.
  2. Read back `.tmp` file and verify SHA-256 checksum matches memory state.
  3. Copy existing `active_policy.json` to `active_policy.json.bak`.
  4. Perform atomic filesystem rename (`renameSync`) of `.tmp` to `active_policy.json`.
- **Windows Reserved Path Protection:** Path sanitization strips or rejects `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`, `..`, and null bytes `\0`.

---

## 15. Versioning / OCC / CAS

- **Monotonic Version Increment:** Version $V_{n+1} = V_n + 1$. No version skipping or branching.
- **Atomic CAS Invariant:**
  $$\text{CAS}(V_{\text{expected}}, V_{\text{new}}) = \begin{cases} \text{SUCCESS} & \text{if } V_{\text{current}} == V_{\text{expected}} \\ \text{OCC\_CONFLICT\_ABORT} & \text{if } V_{\text{current}} \neq V_{\text{expected}} \end{cases}$$
- **Concurrent Ingestion Defense:** Ingestion operations hold an in-memory per-tenant/domain mutex lock. Lock timeouts fail-closed after 5000ms.

---

## 16. Policy Compilation

The `CanonicalStrategicPolicyCompiler` transforms delta sets into canonical policies:
1. Loads active baseline policy $P_{\text{base}}$.
2. Orders `PolicyDelta[]` deterministically by `fieldPath` ascending.
3. Applies deltas sequentially in-memory.
4. Verifies no constitutional conflicts or circular dependencies.
5. Serializes canonical JSON using deterministic key sorting.
6. Computes SHA-256 canonical hash: $H_{\text{canonical}} = \text{SHA256}(\text{CanonicalJSON})$.

---

## 17. Shadow Evaluation

The `StrategicPolicyShadowEvaluationEngine` evaluates candidate policies prior to live promotion:
- **Input:** Canonical candidate policy and historical decision trace set (up to 500 past tool execution records).
- **Execution:** Dual-evaluates traces against active policy vs candidate policy in memory.
- **Constraints:**
  - Strictly read-only; zero database writes, zero tool dispatch, zero external network.
  - Generates `ShadowEvaluationReport`: records mismatch rate, allow/deny divergence, and latency overhead.
- **Safety Rule:** `SHADOW_RESULT != AUTHORIZATION`. A successful shadow evaluation is a prerequisite for canary promotion, but cannot authorize promotion autonomously.

---

## 18. Canary Deployment

The `StrategicPolicyStagedDeploymentController` coordinates ring-based rollout:
- **Ring Progression:**
  - **Ring 0 (Shadow):** 0% traffic (pure replay evaluation).
  - **Ring 1 (Internal Canary):** 5% traffic or restricted internal test cohort.
  - **Ring 2 (Extended Canary):** 25% traffic across non-critical federated missions.
  - **Ring 3 (Broad Canary):** 50% traffic across standard missions.
  - **Ring 4 (Full Active):** 100% traffic across all tenant federations.
- **Promotion Invariant:** Ring promotion requires a signed promotion token and health check validation. Automated self-promotion across rings is prohibited.

---

## 19. Full Activation

- **Transition:** Promotion from Canary to `ACTIVE`.
- **Atomic Runtime Swap:** Updates the active policy pointer in `StrategicPolicyVersionStore` and broadcasts an atomic synchronization event to `PolicyActiveRuntimeSyncEngine`.
- **Downtime:** Exactly 0ms (atomic in-memory reference swap).
- **Post-Activation Verification:** Re-reads `active_policy.json` from disk, computes SHA-256, and confirms parity with runtime memory snapshot.

---

## 20. Rollback Governance

Rollback restores a known-good prior policy version:
- **Target Selection:** Rollback can **ONLY** target a previously ratified version in the direct parent lineage ($V_{n-1}$ or documented baseline).
- **Constitutional Invariants:**
  - `ROLLBACK != POLICY_CREATION` (Cannot synthesize new deltas).
  - `ROLLBACK != AUTHORITY_ESCALATION` (Cannot revert to a version with broader permissions).
  - `ROLLBACK != PDP_BYPASS` (Rollback is logged in the ratification ledger).
- **Execution Protocol:**
  1. Load `active_policy.json.bak` (or target version snapshot).
  2. Verify cryptographic SHA-256 hash of backup snapshot.
  3. Atomically overwrite `active_policy.json`.
  4. Evict cached runtime snapshot and reload PDP bridge.
  5. Record `POLICY_ROLLED_BACK` in audit ledger.

---

## 21. Emergency / User Stop

- **USER_STOP Supremacy:** An active USER_STOP signal immediately halts any ongoing handoff ingestion, compilation, shadow evaluation, canary promotion, or deployment.
- **EMERGENCY_STOP Behavior:** An EMERGENCY_STOP trips all domain kill switches in PDP, freezing policy evaluation to fail-closed `DENY` for all privileged actions.
- **Lockout During Stop:** Ingestion gateway returns `503 Service Unavailable / OPERATION_SUSPENDED_BY_USER_STOP`.

---

## 22. Tenant Sovereignty

- Strict tenant namespace isolation enforced across all paths, memory stores, and audit logs:
  `data/partitions_strategic_policies/<tenantId>/`
- Cross-tenant policy mutation is structurally impossible: a policy ratified for `tenant_alpha` cannot be read or applied to `tenant_beta`.
- Path traversal defenses prevent directory escape.

---

## 23. Cryptographic Provenance

Provenance is maintained via an unbroken chain of SHA-256 hashes:
$$\text{StrategicMemoryHash (MS-1.5.18)} \longrightarrow \text{DeliberationDossierHash (MS-1.5.19)} \longrightarrow \text{HandoffHash} \longrightarrow \text{RatificationHash (MS-1.5.20)} \longrightarrow \text{CanonicalPolicyHash} \longrightarrow \text{DeploymentHash}$$
Any retroactive modification of a past proposal or dossier invalidates the entire downstream cryptographic chain.

---

## 24. Ratification Ledger

A dedicated, append-only cryptographic ledger (`data/partitions_strategic_policies/<tenantId>/ratification_ledger.jsonl`) tracks 38 canonical event types:
1. `HANDOFF_RECEIVED`
2. `HANDOFF_VALIDATED`
3. `HANDOFF_REJECTED_SCHEMA`
4. `HANDOFF_REJECTED_EXPIRED`
5. `HANDOFF_REJECTED_REPLAY`
6. `HUMAN_TOKEN_VERIFIED`
7. `HUMAN_TOKEN_REJECTED_INVALID_SIG`
8. `HUMAN_TOKEN_REJECTED_EXPIRED`
9. `HUMAN_TOKEN_REJECTED_NONCE_REUSED`
10. `TWO_PERSON_RULE_VERIFIED`
11. `TWO_PERSON_RULE_FAILED`
12. `POLICY_RATIFIED_BY_PDP`
13. `RATIFICATION_REJECTED_INVARIANT_VIOLATION`
14. `RATIFICATION_REJECTED_OCC_CONFLICT`
15. `CANONICAL_POLICY_COMPILED`
16. `POLICY_COMPILATION_FAILED`
17. `SHADOW_EVALUATION_STARTED`
18. `SHADOW_EVALUATION_COMPLETED`
19. `SHADOW_EVALUATION_FAILED`
20. `CANARY_RING_ASSIGNED`
21. `CANARY_DEPLOYMENT_STARTED`
22. `CANARY_HEALTH_CHECK_PASSED`
23. `CANARY_HEALTH_CHECK_FAILED`
24. `CANARY_PROMOTION_AUTHORIZED`
25. `FULL_ACTIVATION_STARTED`
26. `FULL_ACTIVATION_COMPLETED`
27. `FULL_ACTIVATION_FAILED`
28. `POLICY_ROLLED_BACK_AUTOMATIC`
29. `POLICY_ROLLED_BACK_MANUAL`
30. `ROLLBACK_FAILED`
31. `USER_STOP_INTERLOCK_ENGAGED`
32. `EMERGENCY_STOP_ENGAGED`
33. `CIRCUIT_BREAKER_TRIPPED`
34. `TENANT_BOUNDARY_VIOLATION_BLOCKED`
35. `PROVENANCE_CHAIN_VERIFIED`
36. `PROVENANCE_CHAIN_CORRUPTED`
37. `ACTIVE_RUNTIME_SYNC_BROADCAST`
38. `ACTIVE_RUNTIME_SYNC_ACKNOWLEDGED`

---

## 25. Security Threat Model

| Threat ID | Threat Name | Attack Scenario | Detection Mechanism | Mitigation / Defense | Fail-Closed Result |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **T-01** | Handoff Replay | Attacker resubmits old approved handoff package to revert policy. | Intake gateway checks `handoffId` in durable replay cache. | Immediate rejection if `handoffId` exists. | `REPLAY_ATTEMPT_REJECTED` |
| **T-02** | Stale Policy Replay | Attacker submits handoff built against obsolete policy version $V_{n-5}$. | Gateway verifies `basePolicyVersion === currentActiveVersion`. | OCC check aborts ingestion. | `STALE_POLICY_VERSION_REJECTED` |
| **T-03** | Operator Signature Forgery | Attacker fabricates operator signature without key. | Cryptographic verification against Human Authority public key. | Signature mismatch halts pipeline. | `SIGNATURE_VERIFICATION_FAILED` |
| **T-04** | Two-Person Rule Evasion | Attacker uses same operator ID for both signers on CRITICAL policy. | Verification engine asserts `operatorId !== twoPersonVerifierId`. | Rejects duplicate signer identities. | `TWO_PERSON_RULE_COLLUSION_BLOCKED` |
| **T-05** | TOCTOU Delta Tampering | Attacker alters `PolicyDelta[]` payload after human signed dossier. | Recomputes SHA-256 over deltas and compares to `dossierProvenanceHash`. | Hash discrepancy trips security alert. | `TOCTOU_HASH_MISMATCH_REJECTED` |
| **T-06** | Split-Brain Activation | Concurrent deployment tasks attempt to activate different versions. | In-memory deployment mutex lock and atomic CAS on version number. | Second activation receives CAS conflict error. | `OCC_VERSION_CONFLICT_ABORT` |
| **T-07** | Canary Direct Bypass | Operator or agent attempts direct jump from ingestion to Ring 4. | Staged deployment state machine enforces mandatory state sequence. | Direct transition rejected. | `ILLEGAL_LIFECYCLE_TRANSITION` |
| **T-08** | Unauthorized Rollback | Attacker triggers rollback to downgrade security guardrails. | Rollback controller validates operator revocation token. | Rollback without valid token denied. | `UNAUTHORIZED_ROLLBACK_REJECTED` |
| **T-09** | Arbitrary Rollback Target | Attacker attempts rollback to an unverified or arbitrary historic snapshot. | Controller verifies target version is in direct parent lineage DAG. | Target outside lineage rejected. | `INVALID_ROLLBACK_LINEAGE_TARGET` |
| **T-10** | Cross-Tenant Escape | Tenant A handoff specifies file path targeting Tenant B partition. | Path validator enforces regex and tenant prefix matching. | Path traversal or cross-tenant write blocked. | `TENANT_SOVEREIGNTY_BREACH_BLOCKED` |
| **T-11** | Autonomous Self-Ratification | Agent loop fabricates ratification certificate without Human Authority. | Ratification engine validates external human decision token. | Missing human decision blocks ratification. | `AUTONOMOUS_RATIFICATION_PROHIBITED` |
| **T-12** | Lease Ceiling Escalation | Proposed delta attempts to raise autonomy lease duration above maximum. | Compiler checks deltas against hard-forbidden autonomy invariants. | Delta modifying lease ceilings rejected. | `CONSTITUTIONAL_AXIOM_VIOLATION` |
| **T-13** | Crash During Write | Process dies while saving new active policy file. | 4-step atomic write protocol (`.tmp` → checksum → `.bak` → rename). | Startup recovery checks `.bak` and restores. | `CRASH_SAFE_ATOMIC_RECOVERY` |
| **T-14** | Circuit Breaker Bypass | Health monitor alerts CRITICAL but deployment continues. | Circuit breaker synchronous interlock halts ring promotion. | Promotion immediately blocked. | `CIRCUIT_BREAKER_INTERLOCK_HALT` |
| **T-15** | Prompt Injection in Delta | Delta justification contains prompt injection payloads. | Ingestion gateway scrubs injection markers (`IGNORE ALL`, `SYSTEM:`). | Sanitized before compilation. | `INJECTION_PAYLOAD_NEUTRALIZED` |
| **T-16** | Unbounded Policy Expansion | Proposal contains 10,000 recursive policy deltas. | Ingestion gateway enforces `MAX_DELTAS_PER_PROPOSAL = 50`. | Exceeding ceiling rejected immediately. | `PAYLOAD_SIZE_CEILING_EXCEEDED` |
| **T-17** | Windows Reserved Name Exploit | Attacker uses `NUL` or `CON` in tenant ID to crash Windows filesystem. | Reserved device name regex check fail-closed. | Malformed tenant ID rejected. | `RESERVED_DEVICE_NAME_BLOCKED` |
| **T-18** | Replay of Used Nonce | Attacker reuses valid historic Human Decision Token nonce. | Durable nonce registry checks token uniqueness. | Reused nonce rejected. | `NONCE_ALREADY_CONSUMED` |
| **T-19** | Autonomy Charter Erosion | Delta attempts to reclassify `FORBIDDEN` tool to `ALLOW`. | Compiler asserts `CANONICAL_HARD_FORBIDDEN_ACTIONS` immunity. | Invariant violation fails closed. | `HARD_FORBIDDEN_MODIFICATION_BLOCKED` |
| **T-20** | Audit Ledger Truncation | Attacker deletes trailing lines of audit ledger. | Ledger loader verifies unbroken SHA-256 chain from genesis. | Broken hash chain halts all operations. | `AUDIT_CHAIN_CORRUPTION_HALT` |

---

## 26. Hard Ceilings

To prevent denial of service and resource exhaustion, the following hard limits are enforced:
- `MAX_HANDOFFS_IN_FLIGHT`: 5 concurrent handoffs per tenant.
- `MAX_DELTAS_PER_PROPOSAL`: 50 deltas.
- `MAX_POLICY_SIZE_BYTES`: 512 KB per canonical policy file.
- `MAX_CANONICAL_RULES`: 500 rules per domain.
- `MAX_SHADOW_EVAL_TRACES`: 500 historical execution traces.
- `MAX_CANARY_COHORTS`: 10 cohorts.
- `MAX_HANDOFF_TTL_MS`: 86,400,000 ms (24 hours).
- `MAX_MUTEX_WAIT_MS`: 5,000 ms.
- `MAX_ROLLBACK_LINEAGE_DEPTH`: 20 historical versions.
- `MAX_AUDIT_LEDGER_FILE_BYTES`: 50 MB (auto-rotated with hash chaining).

---

## 27. Failure Semantics

1. **Intake Failure:** Returns `400 Bad Request` or `409 Conflict`, handoff discarded, audit logged, active policy unaffected.
2. **Ratification Failure:** Handoff marked `REJECTED`, active policy unaffected.
3. **Compilation Failure:** Error recorded, proposal returned to `RATIFIED_UNCOMPILED`, deployment aborted.
4. **Shadow Failure:** Report marked `UNHEALTHY`, promotion blocked.
5. **Canary Regression:** Circuit breaker trips, automated rollback engaged, active baseline restored.
6. **Filesystem Error During Activation:** `.bak` file restored atomically, active memory snapshot preserved, system fails closed.
7. **Crash During Deployment:** On startup, `StrategicPolicyVersionStore.reconcile()` detects orphan `.tmp` files, removes them, validates `active_policy.json` checksum, and restores `.bak` if corrupted.

---

## 28. Lifecycle State Machine

Tripartite 18-state lifecycle model:

```text
Active Operational States (11):
  1. INTAKE_RECEIVED
  2. INTAKE_VALIDATED
  3. HUMAN_TOKEN_VERIFYING
  4. HUMAN_TOKEN_VERIFIED
  5. RATIFYING_PDP
  6. RATIFIED
  7. COMPILING
  8. COMPILED
  9. SHADOW_EVALUATING
  10. CANARY_ACTIVE
  11. FULLY_ACTIVE

Resolved Terminal States (4):
  12. REJECTED_BY_GATEWAY
  13. RATIFICATION_DENIED
  14. DEPLOYMENT_ROLLED_BACK
  15. SUPERSEDED

Terminal Fault & Interlock States (3):
  16. FAULT_CRASH_RECOVERED
  17. HALTED_BY_USER_STOP
  18. HALTED_BY_EMERGENCY_STOP
```

---

## 29. Component Responsibility Matrix

| Component Placeholder | Reads | Writes | Authority Level | Mutation Boundary | Dependencies |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `NEXT_COMPONENT_01` (Types) | N/A | N/A | Type System | Zero mutation | None |
| `NEXT_COMPONENT_02` (Intake) | Handoff Package | Replay Cache | Gatekeeper | Ingestion cache only | MS-1.5.19 types, Types |
| `NEXT_COMPONENT_03` (Token Verifier) | Decision Records | Nonce Cache | Validator | Nonce store only | Types |
| `NEXT_COMPONENT_04` (Ratification) | Intake Cert, Tokens | Ratification Ledger | PDP Authority | Ratification records only | Intake, Token Verifier, PDP |
| `NEXT_COMPONENT_05` (Compiler) | Deltas, Baseline | Canonical Policy | Compiler | In-memory compiler only | Ratification, Version Store |
| `NEXT_COMPONENT_06` (Version Store) | Disk Partition | Partition Files | Storage Engine | Filesystem partition (`.tmp` → `.bak`) | Types |
| `NEXT_COMPONENT_07` (Shadow) | Historical Traces | Shadow Report | Read-Only | In-memory report only | Compiler, MS-1.3.60 primitives |
| `NEXT_COMPONENT_08` (Deployment) | Canary Metrics | Deployment State | Orchestrator | Deployment records, Active pointer | Compiler, Version Store, Canary Router |
| `NEXT_COMPONENT_09` (Rollback) | Version Store (.bak) | Active Policy | Safety Interlock | Active policy restoration only | Version Store, Circuit Breaker |
| `NEXT_COMPONENT_10` (Module Index) | All Subsystems | Root Export | Export Interface | Zero mutation | Components 01–09 |

---

## 30. Existing Foundation Reuse Matrix

| Existing Subsystem / Component | Repository Location | How MS-1.5.20 Reuses It | Why Duplication is Avoided |
| :--- | :--- | :--- | :--- |
| `PolicyDecisionPoint` (PDP) | `src/core/policyDecisionPoint.ts` | Integrates with `globalPDP` for final action authorization and kill switch state. | PDP already exists as the central runtime enforcement gate. |
| `PolicyActiveRuntimeSyncEngine` | `src/core/policyActiveRuntime/` | Broadcasts new active policy snapshots to sync engine for runtime caching. | MS-1.3.71 already handles active runtime snapshot memory synchronization. |
| `PolicyRingRouter` | `src/core/policyCanary/policyRingRouter.ts` | Orchestrates ring routing (Rings 0–4) for canary traffic partitioning. | 5-ring routing logic is already implemented and verified in MS-1.3.60. |
| `PolicyShadowEvaluator` | `src/core/policyCanary/policyShadowEvaluator.ts` | Consumes shadow dual-evaluation pattern for trace replay. | Shadow evaluation patterns exist in MS-1.3.60. |
| `PolicyCanaryCircuitBreaker` | `src/core/policyCanary/policyCanaryCircuitBreaker.ts` | Connects circuit breaker trip events directly to automated rollback. | Safety interlock tripping mechanisms exist and should not be duplicated. |

---

## 31. Dedicated Suite #114 Specification

- **File Path:** `tests/test_v4_ms15_governed_policy_decision_ingestion_ratification.ts`
- **Target Vector Count:** Exactly **160 Vectors** across 15 discrete groups:
  1. **Group 1 (Vectors 1–10):** Ontology, Invariants, Ceilings & Types.
  2. **Group 2 (Vectors 11–22):** Handoff Intake Gateway & Schema Validation.
  3. **Group 3 (Vectors 23–35):** Replay Defense, Nonce Registry & Expiration.
  4. **Group 4 (Vectors 36–47):** Human Decision Token & Cryptographic Signature Verification.
  5. **Group 5 (Vectors 48–60):** Two-Person Rule Enforcement for CRITICAL Proposals.
  6. **Group 6 (Vectors 61–73):** TOCTOU Delta Hash Matching & Integrity Gates.
  7. **Group 7 (Vectors 74–85):** Authoritative PDP Ratification & Constitutional Invariants.
  8. **Group 8 (Vectors 86–97):** Canonical Policy Compilation & Deterministic Hashing.
  9. **Group 9 (Vectors 98–109):** Monotonic Versioning, OCC/CAS & Concurrency Locks.
  10. **Group 10 (Vectors 110–120):** Strategic Policy Version Store & Crash-Safe Persistence.
  11. **Group 11 (Vectors 121–130):** Shadow Evaluation & Non-Authoritative Pre-Flight.
  12. **Group 12 (Vectors 131–140):** Staged Canary Ring Deployment & Health Checks.
  13. **Group 13 (Vectors 141–150):** Automated & Manual Rollback Execution & Lineage DAG.
  14. **Group 14 (Vectors 151–156):** 38-Event Cryptographic Audit Ledger & Chaining.
  15. **Group 15 (Vectors 157–160):** USER_STOP / EMERGENCY_STOP Interlocks & Future Milestone Firewall.

---

## 32. Future Milestone Firewall

- **Prohibition:** MS-1.5.20 must contain **ZERO** imports, dependencies, or references to `MS-1.5.21`, `MS-1.5.22`, or future milestones.
- **Enforcement:** Vector 159 in Suite #114 will assert zero occurrences of future milestone tokens in all source files.

---

## 33. Open Human Decisions

The following items cannot be autonomously decided and are flagged for Human Authority:
1. **Approval of Milestone MS-1.5.20:** Explicit authorization token required to begin implementation.
2. **Cryptographic Key Provider:** Confirmation whether Human Authority public keys will be read from environment configuration (`BOW_GOVERNANCE_PUBKEY`) or a local secure keystore.
3. **Automated Rollback Metric Sensitivity:** Confirmation of the default canary error budget threshold (recommended: 5% error rate or >50ms latency increase over baseline).
4. **Historical Version Pruning:** Confirmation of whether historical versions older than 180 days can be archived or must be retained perpetually.

---

## 34. Implementation Preconditions

Before implementation of MS-1.5.20 may commence:
1. Human Authority must issue: `APPROVE MS-1.5.20 IMPLEMENTATION`.
2. Dedicated regression Suite #113 must remain passing 160/160.
3. All predecessor suites (#109–#112) must remain passing 100%.
4. Protected workspace `C:\BOW\shopofbow` must remain untouched.
5. Component IDs 1168–1177 must be allocated in `docs/BOWCON_V4_COMPONENT_MATRIX.md` as target REAL.

---

## 35. Final Governance Gate

**MILESTONE MS-1.5.20 MASTER SPECIFICATION GENERATION: COMPLETE & HARDENED.**  
Implementation remains strictly **BLOCKED** pending explicit Human Authority authorization.
