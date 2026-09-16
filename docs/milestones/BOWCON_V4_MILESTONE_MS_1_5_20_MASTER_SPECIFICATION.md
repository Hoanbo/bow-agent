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
HUMAN_APPROVAL != AUTONOMOUS_APPROVAL
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

SOLE_HUMAN_AUTHORITY = TRUE
HUMAN_AUTHORITY_COUNT = 1
SECOND_HUMAN_AUTHORITY = FORBIDDEN
SYNTHETIC_SECOND_OPERATOR != VALID_SECURITY_CONTROL
AGENT_CONSENSUS != HUMAN_AUTHORITY
SECOND_HUMAN_AUTHORITY != REQUIRED
SECOND_HUMAN_AUTHORITY != ALLOWED
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
2. Authenticates Human Decision Tokens from the sole Human Authority with elevated cryptographic affirmation and strict freshness gates for `CRITICAL` risk proposals.
3. Authoritatively ratifies proposed policy deltas into canonical, versioned strategic policies.
4. Compiles policies into deterministic runtime representations with strict monotonic versioning (OCC/CAS).
5. Orchestrates atomic staged activation (`Shadow` → `Canary Ring` → `Full Active Deployment`).
6. Enforces automated and manual rollback to cryptographically verified prior snapshots upon safety regression.

---

## 5. Scope

MS-1.5.20 encompasses:
- Intake validation and replay defense for `PdpPolicyHandoffPackage`.
- Cryptographic verification of the sole Human Authority operator signatures, durable nonces, and elevated CRITICAL proposal affirmations.
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
- **Sole-Authority Rule:** Exactly one Human Authority exists: Boss / Ultimate Root Operator. A second administrator, verifier, co-owner, committee, synthetic operator, or agent consensus is neither required nor permitted as a governance control.

---

## 8. Component Architecture

MS-1.5.20 defines exactly 10 discrete, modular components:

| Component Placeholder | Target Component Name | Responsibility | Reality Classification |
| :--- | :--- | :--- | :---: |
| `NEXT_COMPONENT_01` | `GovernedPolicyDecisionIngestionTypes` | Canonical types, branded IDs, 18-state lifecycle, 16 checkpoints, 38 audit event types, error hierarchy, and 8 SHA-256 hashers. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_02` | `PdpPolicyHandoffIntakeGateway` | Ingests `PdpPolicyHandoffPackage` from MS-1.5.19, validates schema, verifies provenance hash, checks base version freshness, and defends against replay. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_03` | `HumanDecisionTokenVerificationEngine` | Cryptographically verifies the sole Human Authority operator signatures, enforces elevated single-human affirmation for `CRITICAL` proposals, checks expiration, nonces, and binds tokens to dossiers. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_04` | `AuthoritativePolicyRatificationEngine` | Authoritative PDP ratification gate; transitions verified handoffs to ratified policies, generates signed ratification records, and enforces constitutional invariants. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_05` | `CanonicalStrategicPolicyCompiler` | Deterministically compiles `PolicyDelta[]` into normalized, ordered canonical policy structures and computes canonical policy SHA-256 hashes. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_06` | `StrategicPolicyVersionStore` | Multi-tenant crash-safe partitioned policy store (`.tmp` → readback checksum → `.bak` → atomic rename) with monotonic OCC/CAS versioning and lineage DAG tracking. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_07` | `StrategicPolicyShadowEvaluationEngine` | Read-only in-memory evaluation of candidate policies against historical federated decision traces with strictly zero operational side-effects and zero tool execution. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_08` | `StrategicPolicyStagedDeploymentController` | Orchestrates multi-stage ring activation (`Shadow` → `Canary Cohorts` → `Full Active Deployment`) with health gates, circuit breaker monitoring, and atomic runtime promotion. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_09` | `StrategicPolicyRollbackController` | Automated and manual fail-closed rollback engine restoring verified prior policy snapshots upon circuit trip, safety degradation, or operator revocation. | `SPECIFIED / ALLOCATED (Target: REAL)` |
| `NEXT_COMPONENT_10` | `GovernedPolicyDecisionIngestionModuleIndex` | Public barrel export interface and master coordinator integrating MS-1.5.20 with `globalPDP` and the active runtime synchronization engine. | `SPECIFIED / ALLOCATED (Target: REAL)` |

---

## 9. Input/Output Contracts

### Input Contract: `PdpPolicyHandoffPackage` & `PdpPolicyHandoffEnvelope` (from MS-1.5.19)

To ensure cryptographic verification without ambiguity, MS-1.5.20 ingests the handoff package either directly with its companion `HumanDecisionToken` or enveloped:

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
  policyDeltaHash: string; // SHA-256(canonicalPolicyDeltaArray(proposedChanges))
  packagedAt: number;
}

export interface HumanDecisionToken {
  tokenId: string; // Unique token identifier (UUIDv4)
  operatorId: string; // Authenticated sole Human Authority operator ID (must NOT match agent/bot regex)
  operatorSignature: string; // Hex-encoded HMAC-SHA256 signature
  decision: 'APPROVE' | 'REJECT';
  rationale: string;
  nonce: string; // Single-use UUIDv4 nonce
  timestamp: number; // Issuance timestamp (ms)
  expiresAt: number; // Expiration timestamp (ms); bounded by the applicable standard or CRITICAL governance TTL
  keyId: string; // Secret / key identifier (e.g., 'bow-gov-sec-v1')
  policyDeltaHash: string; // Must equal handoff and resolved-dossier canonical delta commitment
}

export interface PdpPolicyHandoffEnvelope {
  handoffPackage: PdpPolicyHandoffPackage;
  humanDecisionToken: HumanDecisionToken;
  humanDecisionRecord?: HumanDecisionRecord;
}
```

`HumanDecisionToken` represents exactly one Human Authority. It contains no secondary-verifier identity, signature, nonce, approval flag, or equivalent dual-custody field. Such fields have no independent security purpose in this architecture: signature validity, nonce uniqueness, timestamp/TTL validity, tenant/domain/proposal/dossier binding, delta integrity, interlocks, and immutable audit records supply the relevant controls. A future implementation pass must reject rather than silently ignore a token carrying a secondary-human approval claim.

### Canonical Policy-Delta Commitment

`dossierProvenanceHash` and `policyDeltaHash` are separate SHA-256 commitments. `dossierProvenanceHash` is the hash of the complete canonical deliberation dossier (excluding its own hash field); `policyDeltaHash` is `SHA256(canonicalPolicyDeltaArray(proposedChanges))` and commits only the policy deltas. Neither hash grants authority.

`canonicalPolicyDeltaArray` is UTF-8 canonical JSON of a non-empty `PolicyDelta[]`: every delta must contain `fieldPath`, `operation`, `beforeValue`, `afterValue`, and `justification`; object keys are recursively lexicographically ordered; deltas are ordered by `fieldPath`, then `operation`, then their canonical JSON representation; arrays inside a delta retain declared order; required fields may not be omitted; absent optional fields are encoded as `null`; strings are Unicode NFC; insignificant whitespace is excluded; numbers must be finite JSON numbers with no alternate textual representation. Duplicate canonical sort keys are rejected rather than relying on source order. This makes semantically equivalent permitted delta sets hash identically and makes ambiguous representations fail closed.

The upstream dossier commits `policyDeltaHash`; the handoff repeats it; the token carries and signs it. The receiver reconstructs the canonical delta array from `handoff.proposedChanges`, recomputes the hash, and requires equality with the handoff, token, and resolved dossier commitments. Any mismatch is a TOCTOU rejection.

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
20. **Deterministic Delta Commitment:** Recomputed `SHA256(canonicalPolicyDeltaArray(proposedChanges))` identically matches `handoff.policyDeltaHash`, `token.policyDeltaHash`, and the resolved dossier's `policyDeltaHash`; dossier provenance is verified separately.

---

## 11. Human Decision Verification

The `HumanDecisionTokenVerificationEngine` strictly enforces cryptographic human authority boundaries:

### B-01 RESOLVED: Token Transmission & Binding Contract
- MS-1.5.20 receives the human authority evidence via the `PdpPolicyHandoffEnvelope` or direct pairing of `(handoff: PdpPolicyHandoffPackage, token: HumanDecisionToken, record?: HumanDecisionRecord)`.
- The token is cryptographically bound to the handoff package via `proposalId`, `dossierId`, `dossierProvenanceHash`, `policyDeltaHash`, `tenantId`, and `policyDomain`.
- If a deliberation dossier is resolved from durable storage via `dossierId`, its provenance and delta commitments must identically match the handoff and token.

### B-02 RESOLVED: Cryptographic Signature Scheme & Key Management Contract
- **Authoritative Algorithm:** `HMAC-SHA256` (via `node:crypto`).
- **Key Type & Secret Management:** 256-bit symmetric shared secret loaded from `BOW_GOVERNANCE_HMAC_SECRET` or a registered key provider mapping `keyId` to secret bytes.
- **Key Ownership:** Held exclusively by the sole Human Authority ("Boss" / Ultimate Root Operator). Agents, models, bots, and automated execution loops NEVER hold or access the governance signing secret.
- **Canonical Signed Payload (Sole Operator):**
  The exact string format before HMAC computation is strictly delimited:
  ```text
  BOW-GOV-TOKEN-V1:<tenantId>:<policyDomain>:<proposalId>:<dossierId>:<dossierProvenanceHash>:<policyDeltaHash>:<decision>:<nonce>:<timestamp>:<operatorId>:<keyId>
  ```
- **Authoritative Serialization & Encoding:**
  This is the sole production payload format. Every placeholder is its already-validated canonical string representation; fields appear once, in the order shown, separated by literal ASCII `:` characters with no escaping, trimming, locale conversion, or alternate serialization. The resulting `canonicalPayload` is encoded as UTF-8 bytes with an explicit encoding argument before computation: `HMAC-SHA256(key, UTF8(canonicalPayload))`. Platform-default, implicit, UTF-16, ASCII substitution, locale-dependent, or implementation-defined encoding is forbidden. Encoding failure, invalid Unicode input, delimiter ambiguity, or malformed field data fails closed.
- **Strict Production Verification Path:**
  Production verification has exactly one authoritative path: `HMAC-SHA256` over the UTF-8 canonical payload using the configured Human Authority key resolved by `keyId`, followed by constant-time comparison. It must not use a hard-coded or fallback secret; accept a legacy secret, payload, signature, compatibility signature, development bypass, or test signature prefix; or silently downgrade verification. `MISSING_KEY`, `INVALID_KEY`, `UNKNOWN_KEY_ID`, `MALFORMED_SIGNATURE`, `INVALID_SIGNATURE`, `LEGACY_PAYLOAD`, `LEGACY_SIGNATURE`, and `TEST_SIGNATURE` each reject fail-closed. `FALLBACK_SECRET` is forbidden.
- **Timing-Safe Verification:**
  Signatures are compared using constant-time comparison to prevent timing attacks:
  `crypto.timingSafeEqual(Buffer.from(tokenSignature, 'hex'), Buffer.from(expectedSignature, 'hex'))`. The verifier must first validate hex syntax and equal buffer lengths; plaintext `signature === expectedSignature` is forbidden as a production verification mechanism.
- **Anti-Agent Self-Approval Gate:**
  `operatorId` is validated against anti-agent regex:
  `^(agent_|bot_|synthetic_|system|autonomous_|ai_).*$`
  Any match fails closed immediately with `HumanDecisionVerificationError('AGENT_SELF_APPROVAL_PROHIBITED')`.
- **Elevated Single-Human Verification for CRITICAL Proposals:**
  For proposals classified as `CRITICAL` risk, the system enforces multi-tiered single-human authority safeguards without requiring a fictitious second human:
  1. **Mandatory Explicit Human Approval:** Requires explicit `token.decision === 'APPROVE'` signed by the sole Human Authority.
  2. **Cryptographic HMAC-SHA256 Verification:** Single-human signature over the canonical payload evaluated using constant-time comparison.
  3. **Strict Freshness & Bounded TTL:** `MAX_CRITICAL_TTL_MS` is a configurable bounded governance parameter. `3,600,000ms` (one hour) is an audit proposal, not a constitutional constant; the selected configured value must be positive and no greater than `MAX_HANDOFF_TTL_MS`, and must be audited with the decision.
  4. **Mandatory TOCTOU Hash Cross-Reference:** The verifier recomputes `policyDeltaHash` from canonical deltas and requires equality with the handoff, token, and resolved dossier; `dossierProvenanceHash` independently matches the handoff, resolved dossier, and signed payload. A hash is integrity evidence, not authorization.
  5. **Durable Nonce Consumption:** Single-use UUIDv4 nonce consumed in durable registry before ratification.
  6. **Synchronous Emergency Interlock Gate:** Interlocks evaluate synchronously; any active `USER_STOP` or `EMERGENCY_STOP` aborts CRITICAL ingestion fail-closed.
  7. **Anti-Agent Gate:** Operator ID must not match agent regex `^(agent_|bot_|synthetic_|system|autonomous_|ai_).*$`.
  8. **Immediate Rollback Snapshot Staging:** Pre-promotion snapshot of current active policy (`.bak`) staged immediately prior to deployment.
  9. **Audit Ledger Record:** Emits dedicated audit event `CRITICAL_PROPOSAL_AFFIRMED` on success or `CRITICAL_PROPOSAL_REJECTED` on failure.
- **Durable Nonce & Replay Defense:**
  Nonces are single-use UUIDv4 strings recorded in a durable replay registry (`(nonce, consumedAt, proposalId, tenantId)`). Reusing an ingested nonce aborts with `PolicyHandoffReplayError`.
- **Token Expiration & Freshness:**
  Tokens expire when `Date.now() > token.expiresAt` or `Date.now() - token.timestamp > applicableTtlMs`; `applicableTtlMs` is `MAX_CRITICAL_TTL_MS` for CRITICAL proposals and `MAX_HANDOFF_TTL_MS` otherwise. Future-skewed tokens (`timestamp > Date.now() + 5000ms`) fail closed. Missing keys, malformed hex, unequal signature buffer lengths, or unavailable nonce storage fail closed.
- **Verification-Boundary Key Access:** The dedicated verification boundary may obtain the secret only through the configured key provider to compute the HMAC; it must not expose it to model/agent contexts, logs, token records, or runtime tool execution. Missing `keyId` mapping or secret provisioning fails closed. This preserves `AGENT_CAPABILITY != HUMAN_AUTHORITY` while retaining the specified symmetric HMAC scheme.

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
$$\text{StrategicMemoryHash (MS-1.5.18)} \longrightarrow \text{DeliberationDossierHash (MS-1.5.19)} + \text{PolicyDeltaHash} \longrightarrow \text{HandoffHash} \longrightarrow \text{RatificationHash (MS-1.5.20)} \longrightarrow \text{CanonicalPolicyHash} \longrightarrow \text{DeploymentHash}$$
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
10. `CRITICAL_PROPOSAL_AFFIRMED`
11. `CRITICAL_PROPOSAL_REJECTED`
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
| **T-03** | Operator Signature Forgery | Attacker fabricates operator signature without key. | HMAC-SHA256 verification through the configured Human Authority key provider using constant-time comparison. | Signature mismatch halts pipeline. | `SIGNATURE_VERIFICATION_FAILED` |
| **T-04** | CRITICAL Affirmation Bypass | Attacker attempts to ratify CRITICAL proposal with expired token, forged operator signature, or bypass elevated freshness/provenance gates. | Verification engine enforces elevated single-human checks (shortened TTL, strict TOCTOU hash match, and HMAC signature). | Missing or invalid sole-human affirmation blocks ratification fail-closed. | `CRITICAL_AFFIRMATION_FAILED` |
| **T-05** | TOCTOU Delta Tampering | Attacker alters `PolicyDelta[]` payload after human signed dossier. | Recomputes `policyDeltaHash` from canonical deltas and compares it with the token, handoff, and dossier; verifies `dossierProvenanceHash` independently. | Any commitment discrepancy rejects the handoff. | `TOCTOU_HASH_MISMATCH_REJECTED` |
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
| **T-21** | Synthetic Operator Creation | Agent or attacker presents a bot, persona, committee, or fabricated verifier as Human Authority. | Anti-agent identity validation and sole-authority identity binding. | No synthetic or additional operator can satisfy a CRITICAL gate. | `AGENT_SELF_APPROVAL_PROHIBITED` |
| **T-22** | Cross-Tenant Approval Reuse | Valid token for one tenant/domain is submitted to another. | Signed tenant and policy-domain bindings are compared with the handoff and calling partition. | Binding mismatch blocks ratification. | `TENANT_BOUNDARY_VIOLATION_BLOCKED` |
| **T-23** | Stop-Interlock Bypass | Approval is valid but USER_STOP or EMERGENCY_STOP is active. | Synchronous interlock evaluation before ratification and before promotion. | Operation halts despite token validity. | `OPERATION_SUSPENDED_BY_USER_STOP` |
| **T-24** | Signing-Secret Exposure | Secret reaches an agent, log, record, or general runtime context. | Provider-bound access boundary and secret-redaction review. | Key access is denied outside the verifier; missing isolation fails closed. | `GOVERNANCE_KEY_ACCESS_DENIED` |

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

### 29A. Two-Person-Rule Migration Impact Map (Specification Only)

| Component | Current dependency discovered in repository | Required specification change | Future implementation consequence | Security consequence | Test consequence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1168 `GovernedPolicyDecisionIngestionTypes` | Checkpoint/event contracts retain legacy dual-approval concepts. | Replace them with elevated sole-human affirmation contracts and the invariants in Section 2. | Remove secondary-verifier fields/types and rename the checkpoint/event semantics. | Prevents a synthetic or extra operator from becoming an authority path. | Migrate Group 5 assertions without changing its 13-vector allocation. |
| 1169 `PdpPolicyHandoffIntakeGateway` | No direct secondary-verifier gate found; it supplies the bound handoff. | Preserve sole-human tenant, domain, proposal, dossier, provenance, and delta-integrity bindings. | Reject secondary-approval claims rather than consuming them. | Retains replay, tenant, and TOCTOU defenses. | Cover cross-tenant and malformed secondary-field rejection. |
| 1170 `HumanDecisionTokenVerificationEngine` | Direct dual-verification flow, verifier identity/signature/nonce handling, and dual result. | Define one explicit sole-human APPROVE plus HMAC, nonce, TTL, binding, identity, and stop safeguards. | Remove secondary-verifier verification and implement elevated sole-human checks. | Replaces artificial dual custody with cryptographic and interlock controls. | Group 5 covers sole-human CRITICAL affirmation, replay, expiry, and identity rejection. |
| 1171 `AuthoritativePolicyRatificationEngine` | Ratification record adds a secondary verifier when verification reports it. | Ratification consumes only the verified sole-human result. | Remove second-signature recording; preserve PDP invariant/OCC gates. | Keeps ratification distinct from approval and execution. | Assert critical-affirmation audit emission and PDP boundary. |
| 1172 `CanonicalStrategicPolicyCompiler` | No direct secondary-verifier dependency found. | Use the authoritative `canonicalPolicyDeltaArray` contract before compilation and preserve constitutional validation. | Implement canonical delta reconstruction and reject commitment mismatch before compilation. | TOCTOU and invariant protection remain intact. | Retain canonical-hash vectors and add canonicalization/mismatch coverage within the fixed suite total. |
| 1173 `StrategicPolicyVersionStore` | No direct secondary-verifier dependency found. | Preserve nonce/audit durability and OCC/CAS requirements. | No authority-model algorithm change. | Replay, persistence, and tenant isolation remain fail-closed. | Retain persistence, replay, and OCC/CAS vectors. |
| 1174 `StrategicPolicyShadowEvaluationEngine` | No direct secondary-verifier dependency found. | Reaffirm simulation is not approval or execution. | No authority-model algorithm change. | Shadow success cannot substitute for Human Authority. | Retain non-actuation vectors. |
| 1175 `StrategicPolicyStagedDeploymentController` | No direct secondary-verifier dependency found. | Preserve health gates, USER_STOP, and EMERGENCY_STOP after ratification. | No authority-model algorithm change. | A valid approval cannot bypass interlocks or health gates. | Retain stop and deployment-health vectors. |
| 1176 `StrategicPolicyRollbackController` | No direct secondary-verifier dependency found. | Preserve rollback boundaries; rollback is never a new approval. | No authority-model algorithm change. | Rollback cannot create policy or escalate authority. | Retain lineage and rollback authorization vectors. |
| 1177 `GovernedPolicyDecisionIngestionModuleIndex` | May surface types/results exposing legacy verifier state. | Expose only corrected sole-human contracts. | Update exports/coordinator only in a separately authorized pass. | Avoids leaking a false authority primitive across boundaries. | Retain boundary/export coverage. |

This is a migration specification, not an implementation claim. Components, the matrix, source, and tests are intentionally untouched by this task.

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
  5. **Group 5 (Vectors 48–60):** Elevated Single-Human Verification & CRITICAL Proposal Governance.
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

**Group 5 acceptance rule:** Its existing 13 vectors must collectively and genuinely cover valid sole-human CRITICAL approval; invalid HMAC; agent-like identity; CRITICAL expiration and future timestamp; nonce replay; `policyDeltaHash` mismatch; `dossierProvenanceHash` mismatch; tenant, policy-domain, proposal, and dossier mismatch; `decision !== APPROVE`; USER_STOP; EMERGENCY_STOP; successful CRITICAL affirmation; and immutable CRITICAL audit emission. Group 6 must cover canonical delta serialization and the same commitment checks at the intake boundary. No mock-only verification, tautologies, disabled assertions, or fake approvals are permitted.

---

## 32. Future Milestone Firewall

- **Prohibition:** MS-1.5.20 must contain **ZERO** imports, dependencies, or references to `MS-1.5.21`, `MS-1.5.22`, or future milestones.
- **Enforcement:** Vector 159 in Suite #114 will assert zero occurrences of future milestone tokens in all source files.

---

## 33. Resolved & Open Governance Decisions

### Resolved Architectural Decisions:
1. **B-01 (Token Transmission & Binding Contract): RESOLVED**
   - Handoff intake formally accepts `PdpPolicyHandoffEnvelope` or `(handoff, token, record?, callingTenantContext?)`.
   - Token is cryptographically bound to proposal, dossier, dossier provenance hash, policy-delta hash, tenant, and policy domain.
2. **B-02 (Cryptographic Scheme & Key Management): RESOLVED**
   - Authoritative algorithm is `HMAC-SHA256` via `node:crypto`.
   - Key material is 256-bit symmetric shared secret loaded from `BOW_GOVERNANCE_HMAC_SECRET` or key provider with `keyId`.
   - Canonical signed payload format: `BOW-GOV-TOKEN-V1:<tenantId>:<policyDomain>:<proposalId>:<dossierId>:<dossierProvenanceHash>:<policyDeltaHash>:<decision>:<nonce>:<timestamp>:<operatorId>:<keyId>`.
   - Anti-agent regex and elevated single-human cryptographic affirmation for CRITICAL risk proposals (no secondary human required).

3. **B-03 (Critical TTL): RESOLVED AS CONFIGURABLE, NOT CONSTITUTIONAL**
   - `MAX_CRITICAL_TTL_MS = 3,600,000ms` is retained only as an audit proposal/default candidate.
   - The future implementation must use a positive configured bound no greater than `MAX_HANDOFF_TTL_MS`, record the selected value in the audit context, and fail closed when absent or invalid.

### Open Human Authority Preconditions:
1. **Approval of Milestone MS-1.5.20 Implementation:** Requires explicit Human Authority token: `APPROVE MS-1.5.20 IMPLEMENTATION`.
2. **Automated Rollback Metric Sensitivity:** Human Authority must confirm the intended canary error-budget threshold before implementation; the current 5% / >50ms values are proposals, not constitutional facts.
3. **Historical Version Pruning:** Human Authority must confirm retention before implementation; `MAX_ROLLBACK_LINEAGE_DEPTH = 20` is a current specification parameter subject to that implementation authorization.

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

**SPECIFICATION HARDENED — IMPLEMENTATION NOT AUTHORIZED BY THIS PROMPT.**
Implementation remains strictly **BLOCKED** pending explicit Human Authority authorization and a separate implementation pass.
