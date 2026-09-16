# BOWCON V4 — MILESTONE MS-1.5.24 MASTER SPECIFICATION

**Milestone ID:** `MS-1.5.24`  
**Milestone Title:** Governed Policy Simulation, Counterfactual Verification & Pre-Ratification Shadow Evaluation Engine  
**Architectural Stage:** Phase 1.5 — Strategic Inter-Federation Governance, Continuous Integrity & Policy Ratification  
**Predecessor Milestones:** `MS-1.5.19`, `MS-1.5.20`, `MS-1.5.21`, `MS-1.5.22`, `MS-1.5.23` (All Verified & Locked)  
**Successor Boundary:** `MS-1.5.25+` (Strictly Firewalled — Unauthorized)  
**Primary Subsystem Directory:** `src/core/governedPolicySimulation/`  
**Allocated Components:** Components 1208–1217 (10 Components)  
**Dedicated Regression Suite:** Suite #118 (`tests/test_v4_ms15_governed_policy_simulation_shadow.ts` — 180 Vectors)  
**Authoritative Implementation Authorization:** `NOT YET AUTHORIZED` (Awaiting Independent Pre-Implementation Audit & Sole Human Authority Authorization)

---

## 1. Executive Definition

**MS-1.5.24** establishes the native **Governed Policy Simulation, Counterfactual Verification & Pre-Ratification Shadow Evaluation Engine** within the BOWCON V4 governance plane.

Operating directly at the nexus between non-authoritative policy proposal synthesis (MS-1.5.19 Deliberation Gateway & MS-1.5.23 Remediation Engine) and formal constitutional ratification (MS-1.5.20 Policy Decision Ingestion & Ratification Engine), MS-1.5.24 provides a mathematically sound, completely non-actuating sandbox to empirically evaluate candidate policy changes **before** they can be presented for human ratification or deployed into operational lifecycles.

MS-1.5.24 ingests candidate policy deltas and subjects them to four deterministic verification modalities:
1. **Historical Execution Replay:** Evaluates candidate policies against stored historical runtime compliance dossiers and violation records from MS-1.5.22 to measure regression rates and true remediation efficacy.
2. **Counterfactual Assurance Projection:** Computes prospective operational assurance scores ($A_{proj} \in [0, 1]$), false-positive rejection rates, and assurance drift deltas ($\Delta A$).
3. **Cross-Domain Invariant & Deadlock Verification:** Detects circular policy dependencies, conflicting invariants, and mutual exclusion deadlocks across multiple policy domains.
4. **Shadow Dual-Evaluation:** Evaluates sanitized live execution telemetry in a non-blocking shadow tap, comparing live active policy decisions against shadow candidate verdicts with zero live side-effects.

All simulation outputs are compiled into immutable, deeply frozen `PolicySimulationEvidenceDossier` artifacts and appended to a cryptographic ledger for human review in MS-1.5.19. MS-1.5.24 possesses zero authority to mutate policy, ratify decisions, activate canaries, or execute external tools.

---

## 2. Architectural Gap Analysis

### 2.1 The Pre-Ratification Verification Gap

Prior to MS-1.5.24, the BOWCON V4 policy governance loop exhibited a fundamental architectural void between policy proposal and live execution:

```text
[MS-1.5.19 Proposal / MS-1.5.23 Remediation]
                     ↓ (Advisory Deliberation Handoff)
[Boss / Sole Human Authority]
                     ↓ (Ratification Approval)
[MS-1.5.20 Policy Compilation & Snapshot Store]
                     ↓ (Lifecycle Deployment)
[MS-1.5.21 Progressive Canary Activation (5%–25% LIVE TRAFFIC)]
                     ↓ (Live Execution Risk)
[MS-1.5.22 Runtime Violations / Safety Interlocks]
```

Under this existing architecture:
- **No Pre-Ratification Sandbox:** MS-1.5.20 `PolicyActivationReadinessEngine` (Component 1174) performs only syntactic and schema validation (e.g. delta non-emptiness, parent version match). It cannot simulate how rules behave against realistic operational workloads.
- **Canary Means Live Traffic:** In MS-1.5.21, the first opportunity to test a policy rule is during `CANARY` staging. However, canary testing routes **real, live agent tool calls** (5% to 25%) through the new policy. In high-impact or physical domains (robot actuation, desktop automation, payment/voucher issuance), an unintended policy restriction or parameter clamp can immediately break active tasks or trigger emergency suspensions.
- **Unquantified Human Decision Making:** When the Sole Human Authority reviews a remediation proposal or evolution delta, they receive only structural metadata (blast radius, rule text, justification). There is no quantitative empirical projection of collateral damage (e.g., "This rule amendment would have blocked 14% of previously successful actions over the last 7 days").
- **Undetected Cross-Domain Deadlocks:** Policy deltas authored in one domain (e.g., `SECURITY`) can silently conflict with invariants in another domain (e.g., `AUTONOMY` or `RESOURCE`), causing system deadlocks that only surface once the policy is active.

### 2.2 Proof of Architectural Necessity

| Criterion | Evaluation | Justification |
| :--- | :--- | :--- |
| **GAP_EXISTS** | **PROVEN** | No existing component performs counterfactual replay, shadow dual-evaluation, or simulated assurance projection. |
| **GAP_IS_MATERIAL** | **PROVEN** | Live canary risk is unacceptable for safety-critical and irreversible personal OS actions; human decisions require empirical simulation evidence. |
| **GAP_IS_NON-DUPLICATIVE** | **PROVEN** | Orthogonal to MS-1.5.19 (intake), MS-1.5.20 (ratification), MS-1.5.21 (lifecycle), MS-1.5.22 (runtime compliance), and MS-1.5.23 (remediation). |
| **GAP_IS_GOVERNABLE** | **PROVEN** | Pure read-only simulation; completely isolated from execution and active policy state. |
| **GAP_IS_BOUNDED** | **PROVEN** | Concurrence, duration, corpus size, and tenant boundaries are mathematically capped. |

---

## 3. Subsystem Scope

MS-1.5.24 encompasses:
1. **Canonical Simulation Contracts & Types (Component 1208):** Branded IDs, 4 simulation modes, 12 simulation status codes, typed error hierarchy, and deterministic SHA-256 hash algorithms.
2. **Historical Execution Replay Engine (Component 1209):** Ingests historical compliance dossiers from MS-1.5.22, evaluates candidate compiled policies in a sandboxed interpreter, and produces deterministic replay verdicts.
3. **Counterfactual Assurance Projector (Component 1210):** Projects continuous operational assurance scores ($A_{proj} \in [0, 1]$), false-positive rejection rates, and assurance drift deltas ($\Delta A = A_{proj} - A_{baseline}$).
4. **Cross-Domain Policy Invariant Checker (Component 1211):** Analyzes multi-domain rule graphs (`SECURITY`, `AUTONOMY`, `RESOURCE`, `FEDERATION`, `TOOL_EXECUTION`) to detect circular constraints, mutually exclusive preconditions, and deadlocks.
5. **Synthetic Policy Stress Harness (Component 1212):** Generates deterministic edge-case and boundary execution profiles (rate bursts, resource ceilings, malformed payload envelopes) to evaluate candidate policy resiliency.
6. **Shadow Dual-Evaluation Bridge (Component 1213):** Non-blocking tap that evaluates live observation profiles against candidate policies in parallel with active policies, logging divergence metrics with zero actuation.
7. **Simulation Evidence Dossier Engine (Component 1214):** Compiles immutable, deeply frozen `PolicySimulationEvidenceDossier` artifacts with SHA-256 fingerprints and secret scrubbing.
8. **Pre-Ratification Simulation Advisory Bridge (Component 1215):** Packages simulation dossiers into verified advisory reports for delivery to MS-1.5.19 Deliberation Gateway.
9. **Policy Simulation Audit Ledger (Component 1216):** Append-only cryptographic ledger recording all simulation runs, counterfactual replays, and shadow sessions with multi-process file locking.
10. **Governed Policy Simulation Module Index (Component 1217):** Master pipeline coordinator enforcing fail-closed emergency stops, tenant isolation, and strict public API boundaries.

---

## 4. Non-Scope & Negative Boundaries

MS-1.5.24 strictly does **NOT**:
1. **Mutate Active Policies:** MS-1.5.24 cannot alter active policy snapshots in MS-1.5.20 `StrategicPolicyVersionStore` or change PDP enforcement rules.
2. **Ratify Policies:** MS-1.5.24 cannot issue ratification certificates or approve proposals. Ratification remains exclusively reserved for the Sole Human Authority in MS-1.5.20.
3. **Deploy or Activate Canaries:** MS-1.5.24 cannot promote policies to `CANARY` or `ACTIVE` in MS-1.5.21.
4. **Execute Tools or OS Commands:** MS-1.5.24 contains zero execution primitives (`child_process`, `exec`, `spawn`, `eval`). All evaluations are pure in-memory mathematical computations.
5. **Interfere with Live PDP Decisions:** Shadow evaluation is strictly asynchronous or non-blocking; a shadow verdict CANNOT delay, alter, or override a live PDP verdict.
6. **Access Cross-Tenant Raw Data:** Replay and simulation corpora are strictly confined to the calling tenant. Cross-tenant raw replay is forbidden.
7. **Create Secondary Human Roles:** No multi-operator voting, peer review, or synthetic agent approvals.

---

## 5. Constitutional Invariants

Every component in MS-1.5.24 must enforce:

```text
SOLE_HUMAN_AUTHORITY = TRUE
HUMAN_AUTHORITY_COUNT = 1
SECOND_HUMAN_AUTHORITY = FORBIDDEN
ACTIVE_TWO_PERSON_AUTHORITY = NONE

AGENT_CAPABILITY != HUMAN_AUTHORITY
HUMAN_APPROVAL != AUTO_APPROVE

SIMULATION != RATIFICATION
SIMULATION != ACTIVATION
SIMULATION != MUTATION
SIMULATION != AUTHORIZATION
SIMULATION_RESULT != APPROVAL
SIMULATION_SCORE != AUTHORITY

SHADOW_VERDICT != PDP_DECISION
SHADOW != LIVE_EXECUTION
SHADOW != CANARY

REPLAY != ACTUATION
COUNTERFACTUAL != FACTUAL

EMERGENCY_STOP > SIMULATION
EMERGENCY_STOP > SHADOW_EVALUATION
EMERGENCY_STOP > REPLAY

STORE_REFERENCE != MUTATION_AUTHORITY
TENANT_BOUNDARY_STRICT
```

---

## 6. Component Allocation (Components 1208–1217)

| Component ID | Component Name | Single Responsibility | Public Interface | Reality Level |
| :--- | :--- | :--- | :--- | :--- |
| **1208** | `GovernedPolicySimulationTypes` | Canonical type definitions, branded IDs, simulation taxonomy, error hierarchy, deterministic hashers | Types, Enums, Hash Utilities | SPECIFIED / ALLOCATED |
| **1209** | `HistoricalExecutionReplayEngine` | Replays historical compliance dossiers against candidate compiled policies | `replayHistoricalCorpus()` | SPECIFIED / ALLOCATED |
| **1210** | `CounterfactualAssuranceProjector` | Projects assurance scores ($A_{proj}$), false rejection rates, and assurance deltas | `projectAssuranceImpact()` | SPECIFIED / ALLOCATED |
| **1211** | `CrossDomainPolicyInvariantChecker` | Detects circular constraints, mutually exclusive preconditions, and cross-domain deadlocks | `verifyDomainInvariants()` | SPECIFIED / ALLOCATED |
| **1212** | `SyntheticPolicyStressHarness` | Generates deterministic edge-case envelopes to test candidate boundary resilience | `executeStressHarness()` | SPECIFIED / ALLOCATED |
| **1213** | `ShadowDualEvaluationBridge` | Asynchronous shadow tap evaluating live telemetry against candidate rules with zero side-effects | `evaluateShadowTap()` | SPECIFIED / ALLOCATED |
| **1214** | `SimulationEvidenceDossierEngine` | Compiles deeply frozen, SHA-256 fingerprinted simulation dossiers | `compileSimulationDossier()` | SPECIFIED / ALLOCATED |
| **1215** | `PreRatificationSimulationAdvisoryBridge`| Packages simulation dossiers into advisory reports for MS-1.5.19 deliberation | `handoffSimulationAdvisory()`| SPECIFIED / ALLOCATED |
| **1216** | `PolicySimulationAuditLedger` | Append-only cryptographic ledger with continuous SHA-256 chaining and file locking | `appendAuditEvent()` | SPECIFIED / ALLOCATED |
| **1217** | `GovernedPolicySimulationModuleIndex` | Master pipeline coordinator enforcing emergency stop, tenant boundaries, and exports | `runSimulationPipeline()` | SPECIFIED / ALLOCATED |

---

## 7. Architecture & Pipeline

```text
MS-1.5.23 Remediation Candidate / MS-1.5.19 Evolution Proposal
                           │
                           ▼ (Candidate Policy Delta & Snapshot)
┌─────────────────────────────────────────────────────────────────────────────┐
│ MS-1.5.24 Governed Policy Simulation & Counterfactual Verification Engine  │
│                                                                             │
│   1209 Historical Replay Engine    1212 Synthetic Stress Harness            │
│   (MS-1.5.22 Compliance Corpus)    (Boundary & Edge-Case Probing)           │
│                 │                                │                          │
│                 └───────────────┬────────────────┘                          │
│                                 ▼                                           │
│                 1210 Counterfactual Assurance Projector                     │
│                 (Assurance Delta ΔA, False Rejection Rate)                  │
│                                 │                                           │
│                                 ▼                                           │
│                 1211 Cross-Domain Invariant Checker                         │
│                 (Circular Conflict & Deadlock Detection)                    │
│                                 │                                           │
│                 1213 Shadow Dual-Evaluation Bridge                          │
│                 (Non-blocking Tap on Live MS-1.5.22 Telemetry)             │
│                                 │                                           │
│                                 ▼                                           │
│                 1214 Simulation Evidence Dossier Engine                     │
│                 (Deep Freeze & SHA-256 Fingerprinting)                      │
│                                 │                                           │
│                 1216 Policy Simulation Audit Ledger                         │
│                 (Append-Only Cryptographic Audit Log)                       │
│                                 │                                           │
│                 1215 Pre-Ratification Simulation Advisory Bridge            │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼ Simulation Advisory Package
MS-1.5.19 Strategic Deliberation Gateway (Advisory Dossier Queue)
                                  │
                                  ▼ Empirical Simulation Evidence
Boss / Sole Human Authority (Deliberation & Decision)
                                  │
                                  ▼ Formal Approval Token
MS-1.5.20 Authoritative Policy Ratification & Compilation Engine
```

---

## 8. Detailed Data Flow

1. **Intake:** Ingests candidate `PolicyDelta[]` and base policy snapshot from MS-1.5.19 or MS-1.5.23.
2. **Compilation Sandbox:** Compiles the candidate policy in-memory using an isolated evaluator instance (zero store mutation).
3. **Replay Evaluation:** Loads tenant historical compliance dossiers (from MS-1.5.22 partition). Replays each historical observation against candidate rules.
4. **Assurance Modeling:** Calculates counterfactual compliance ratio $R_{proj}$, projected assurance $A_{proj}$, and false-positive divergence rate.
5. **Invariant Analysis:** Constructs dependency digraph across domains; applies cycle detection (Tarjan/DFS) to ensure no circular deadlocks.
6. **Synthetic Stress:** Subjects rules to $N$ boundary cases (e.g., zero tokens, extreme rate spikes, boundary timestamps).
7. **Dossier Compilation:** Assembles all simulation metrics, deep-freezes payload, computes SHA-256 fingerprint.
8. **Audit Logging:** Logs `SIMULATION_COMPLETED` event with hash chaining and atomic lock.
9. **Handoff:** Transmits advisory package with single-use nonce to MS-1.5.19 deliberation registry.

---

## 9. State Machines

### 9.1 Simulation Session Lifecycle State Machine

```text
INITIATED
   │
   ▼
REPLAYING ──────────► REPLAY_FAILED (Fail-closed)
   │
   ▼
PROJECTING ─────────► PROJECTION_FAILED
   │
   ▼
INVARIANT_CHECKING ──► DEADLOCK_DETECTED (Terminal Invariant Failure)
   │
   ▼
STRESS_TESTING ─────► STRESS_FAILED
   │
   ▼
DOSSIER_COMPILED
   │
   ▼
HANDED_OFF ─────────► EXPIRED / SUPERSEDED
```

*All state transitions are deterministic and monotonic. Any unexpected error transitions immediately to fail-closed failure states.*

---

## 10. Authority Model

- **Read Authority:**
  - Allowed: Reads tenant-local historical compliance dossiers (MS-1.5.22), active policy snapshots (MS-1.5.20), and candidate proposals (MS-1.5.19/MS-1.5.23).
  - Forbidden: Reading other tenants' dossiers, raw credentials, private signing keys.
- **Write Authority:**
  - Allowed: Writes immutable simulation dossiers (`data/governed_policy_simulation/<tenantId>/dossiers/`) and append-only audit records (`data/governed_policy_simulation/<tenantId>/audit/`).
  - Forbidden: Writing to active policy stores, PDP caches, canary deployment registries, or execution workers.
- **Decision Authority:**
  - `SIMULATION_VERDICT != RATIFICATION`. A simulation verdict of `STABLE` or `HIGH_CONFIDENCE` grants **zero** authority to activate or enforce a policy.

---

## 11. Tenant Isolation

- **Directory Partitioning:**
  All simulation data is isolated under:
  ```text
  data/governed_policy_simulation/<tenantId>/<policyDomain>/
  ```
- **Strict Path Validation:**
  Tenant IDs are sanitized against regex `^[a-zA-Z0-9_-]{1,64}$`. Path traversal tokens (`..`, `/`, `\`, `\0`) and Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) throw `SimulationCrossTenantAccessForbiddenError`.
- **Zero Cross-Tenant Replay:**
  Replay corpora cannot be shared across tenants. Historical observations belonging to Tenant A cannot be replayed against Tenant B's candidate policies.

---

## 12. Security Model

- **Memory Safety & Deep Freeze:**
  All compiled simulation dossiers, replay records, and projection metrics are deep-frozen via `Object.freeze()` recursively before exposure.
- **Secret Scrubbing:**
  All simulation logs, error strings, and dossiers are scrubbed for API keys, bearer tokens, HMAC secrets, and private keys.
- **Replay Protection:**
  Every simulation session and handoff package carries a cryptographic UUIDv4 nonce and expiration TTL.

---

## 13. Prompt Injection Defense

- **Untrusted Telemetry Inputs:**
  All textual content within historical observations, tool descriptions, and error traces is treated as `UNTRUSTED DATA`.
- **Regex & Sanitization Filter:**
  Natural language fields are passed through `sanitizeUntrustedText()`, stripping control characters and prompt-injection patterns (`SYSTEM:`, `ASSISTANT:`, `IGNORE PREVIOUS INSTRUCTIONS`).
- **Data-Only Evaluation:**
  Evaluators treat string parameters as literal values; no evaluation of expressions or string-to-code compilation.

---

## 14. Emergency Stop

- **Dominant Safety Interlock:**
  `EMERGENCY_STOP` dominates all simulation and shadow processing.
- **Provider Evaluation Contract:**
  - `true` $\rightarrow$ Throws `SimulationEmergencyStopActiveError` (HALT).
  - `missing` $\rightarrow$ Throws `SimulationEmergencyStopActiveError` (HALT).
  - `undefined` $\rightarrow$ Throws `SimulationEmergencyStopActiveError` (HALT).
  - `null` $\rightarrow$ Throws `SimulationEmergencyStopActiveError` (HALT).
  - `throw` $\rightarrow$ Throws `SimulationEmergencyStopActiveError` (HALT).
  - `non-boolean` $\rightarrow$ Throws `SimulationEmergencyStopActiveError` (HALT).
  - `false` $\rightarrow$ Governed simulation permitted to proceed.
- **Audit Exception:**
  Narrow forensic audit logging of the emergency stop event itself is permitted under fail-closed conditions with zero policy mutation.

---

## 15. Execution Firewall

MS-1.5.24 production code is strictly prohibited from containing:
```text
child_process
exec
execSync
spawn
spawnSync
fork
worker_threads
eval
Function
new Function
puppeteer
playwright
CDP
shell execution
OS actuation
```
Simulation consists purely of in-memory evaluations of policy rule predicates against structured telemetry records.

---

## 16. Persistence Model

- **File Formats:**
  - Simulation dossiers: Deterministic JSON (`.json`) with sorted keys.
  - Audit records: JSON Lines (`.jsonl`).
- **Atomic Operations:**
  All writes execute via staging files (`.tmp`) followed by atomic rename.
- **Retention & Expiration:**
  Simulation dossiers carry a configurable TTL (`simulationTtlMs`, default 7 days). Expired dossiers cannot be used for deliberation handoffs.

---

## 17. Concurrency Model

- **Single-Host Multi-Process Safety:**
  Exclusive file locking (`.lock`) protects audit ledgers and dossier directories.
- **Reload-Under-Lock:**
  Ledger state is reloaded immediately after acquiring lock to eliminate TOCTOU race conditions.
- **Lock Timeout:**
  Lock acquisition times out fail-closed after `MAX_LOCK_TIMEOUT_MS` (5000ms).

---

## 18. Cryptography & Provenance

- **Commitment Hashes (SHA-256):**
  - `replayCorpusHash`: SHA-256 of canonical historical observation array.
  - `candidatePolicyHash`: SHA-256 of compiled candidate policy rules.
  - `projectionHash`: SHA-256 of counterfactual assurance metrics.
  - `invariantCheckHash`: SHA-256 of dependency graph verification verdict.
  - `simulationDossierFingerprint`: SHA-256 of entire frozen dossier payload.
- **Cryptographic Principle:**
  `HASH != AUTHORIZATION`. Cryptographic hashes prove provenance and tamper-detection only; they grant zero authority.

---

## 19. Audit Ledger

- **Genesis Hash:**
  `GENESIS_SIMULATION_HASH = '0'.repeat(64)`
- **Continuous Chaining:**
  Each audit record commits `eventHash = SHA256(previousEventHash + canonicalJson(eventData))`.
- **Taxonomy (32 discrete events):**
  Includes `SIMULATION_SESSION_INITIATED`, `HISTORICAL_REPLAY_STARTED`, `HISTORICAL_REPLAY_COMPLETED`, `ASSURANCE_PROJECTED`, `INVARIANT_CHECK_PASSED`, `DEADLOCK_DETECTED`, `STRESS_TEST_COMPLETED`, `SHADOW_TAP_EVALUATED`, `DOSSIER_COMPILED`, `SIMULATION_HANDED_OFF`, `EMERGENCY_STOP_ENCOUNTERED`, etc.

---

## 20. Public APIs

Every public method in MS-1.5.24 is strictly categorized:

| Class / Component | Method | Parameters | Return Type | Classification | Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `HistoricalExecutionReplayEngine` | `replayCorpus()` | `corpus, policySnapshot, config` | `ReplayResult` | `READ_ONLY` | In-memory evaluation only |
| `CounterfactualAssuranceProjector` | `projectAssurance()` | `replayResult, baselineAssurance` | `AssuranceProjection` | `ANALYSIS` | Mathematical calculation |
| `CrossDomainPolicyInvariantChecker` | `verifyInvariants()` | `candidateRules, domainTopology` | `InvariantCheckResult` | `ANALYSIS` | Digraph cycle detection |
| `SyntheticPolicyStressHarness` | `runStressHarness()` | `candidateRules, stressConfig` | `StressTestResult` | `ANALYSIS` | Synthetic probe generation |
| `ShadowDualEvaluationBridge` | `evaluateShadow()` | `liveObservation, candidateRules` | `ShadowVerdict` | `READ_ONLY` | Non-blocking telemetry tap |
| `PolicySimulationEvidenceDossierEngine`| `compileDossier()` | `dossierInput` | `SimulationDossier` | `EVIDENCE_WRITE` | Writes frozen `.json` |
| `PreRatificationSimulationAdvisoryBridge`| `handoffAdvisory()`| `handoffInput` | `HandoffResult` | `HANDOFF_ONLY` | Handoff to MS-1.5.19 |
| `PolicySimulationAuditLedger` | `appendEvent()` | `eventData` | `AuditRecord` | `AUDIT_WRITE` | Atomic append to `.jsonl` |
| `GovernedPolicySimulationModuleIndex` | `executePipeline()` | `pipelineInput` | `PipelineResult` | `COORDINATOR` | Orchestrates 1208–1216 |

---

## 21. Error Taxonomy

All errors inherit from `GovernedPolicySimulationBaseError`:
- `SimulationAuthorityViolationError` (Attempt to treat simulation as ratification/activation)
- `SimulationCrossTenantAccessForbiddenError` (Cross-tenant access or path traversal)
- `SimulationDeadlockDetectedError` (Circular policy constraint detected)
- `SimulationReplayCorpusCorruptedError` (Historical corpus invalid or tampered)
- `SimulationEmergencyStopActiveError` (Operation halted by emergency stop)
- `SimulationSecondaryAuthorityRejectedError` (Attempt to inject secondary human approver)
- `SimulationAuditLedgerIntegrityError` (Audit hash chain break or lock failure)
- `SimulationHandoffExpiredError` (Simulation advisory package expired)
- `SimulationUntrustedInputSanitizationError` (Prompt injection pattern detected)

---

## 22. Integration Contracts

- **MS-1.5.19 Deliberation Gateway:** Ingests `SimulationAdvisoryPackage` to display empirical counterfactual metrics in human review dossiers.
- **MS-1.5.20 Ratification Engine:** Verifies that ratified proposals contain valid simulation provenance fingerprints (if simulation was required by policy).
- **MS-1.5.22 Runtime Compliance:** Supplies historical `RuntimeComplianceEvidenceDossier` records as replay corpora and streams sanitized observations for shadow taps.
- **MS-1.5.23 Remediation Engine:** Feeds synthesized candidate proposals directly into simulation before human handoff.

---

## 23. Historical Compatibility

MS-1.5.24 preserves full backwards compatibility with all preceding test suites:
- Suite #109 (MS-1.5.15), Suite #110 (MS-1.5.16), Suite #111 (MS-1.5.17), Suite #112 (MS-1.5.18)
- Suite #113 (MS-1.5.19), Suite #114 (MS-1.5.20), Suite #115 (MS-1.5.21), Suite #116 (MS-1.5.22), Suite #117 (MS-1.5.23)

---

## 24. Dedicated Test Suite #118

- **File Path:** `tests/test_v4_ms15_governed_policy_simulation_shadow.ts`
- **Total Vector Count:** Exactly **180 deterministic vectors** across 10 groups.
- **Structure:**
  - Group 01: Simulation Authority Firewall & Non-Authoritative Invariants (18 vectors)
  - Group 02: Tenant Isolation & Multi-Tenant Partition Boundaries (18 vectors)
  - Group 03: Historical Execution Replay & Deterministic Counterfactual Verdicts (18 vectors)
  - Group 04: Counterfactual Assurance Projection & Drift Delta Math (18 vectors)
  - Group 05: Cross-Domain Invariant Conflict & Deadlock Detection (18 vectors)
  - Group 06: Synthetic Policy Stress Harness & Extreme Operational Probing (18 vectors)
  - Group 07: Shadow Dual-Evaluation Bridge & Non-Actuation Immunity (18 vectors)
  - Group 08: Emergency Stop Fail-Closed Dominance & Audit Continuity (18 vectors)
  - Group 09: Append-Only Audit Ledger, Chaining & File Locking (18 vectors)
  - Group 10: End-to-End Simulation Pipeline & Module Coordinator (18 vectors)

---

## 25. Test Vector Architecture

Every test vector must assert an explicit mathematical, security, or state condition:
- Prove that a candidate policy with 100% replay pass rate cannot auto-activate.
- Prove that cross-tenant corpus replay is rejected fail-closed.
- Prove that circular policy rule dependencies across 3 domains are detected as deadlocks.
- Prove that shadow evaluation produces zero tool calls or OS mutations.
- Prove that emergency stop throwing, returning null, or returning non-boolean halts processing.
- Prove that audit ledger corruption is detected and halts further writes.

---

## 26. Future Milestone Firewall

MS-1.5.24 contains zero references, imports, or allocations for `MS-1.5.25+` or Components `1218+`. No speculative future APIs or database schemas are permitted.

---

## 27. Component Matrix Changes

Upon authorized implementation and verification, `docs/BOWCON_V4_COMPONENT_MATRIX.md` will elevate Components 1208–1217 from `SPECIFIED / ALLOCATED` to `REAL`. During this specification design phase, the matrix remains **UNTOUCHED**.

---

## 28. Acceptance Criteria

MS-1.5.24 is complete ONLY when:
1. All 10 components (1208–1217) are fully implemented in `src/core/governedPolicySimulation/`.
2. Dedicated Suite #118 passes with exactly 180/180 tests (100%).
3. Historical suites #109 through #117 pass with 100%.
4. TypeScript typecheck clean (0 errors, exit code 0).
5. Build clean (exit code 0).
6. Execution firewall scan verifies 0 execution primitives.
7. Future milestone scan verifies 0 references to MS-1.5.25+.
8. Secret scan verifies 0 hardcoded secrets.
9. Protected workspace `C:\BOW\shopofbow` has 0 accesses.

---

## 29. Failure Conditions

Any of the following causes an immediate implementation failure:
- Simulation verdict mutates active policy.
- Shadow tap alters live PDP evaluation or adds latency $> 5\text{ms}$.
- Cross-tenant replay accesses foreign tenant data.
- Emergency stop failure allows execution.
- Secondary human authority is accepted.
- Execution primitive (`exec`, `spawn`, `eval`) is introduced.

---

## 30. Human Decisions Required

1. **Replay Corpus Window Size:** Default set to 30 days of historical compliance dossiers per tenant. Sole Human Authority may adjust to 7–90 days.
2. **False Rejection Tolerance Threshold:** Default threshold $\tau_{fr} = 0.05$ (5%). Proposed rules causing $>5\%$ false rejection of previously valid traffic are flagged as `HIGH_REGRESSION_RISK`.

---

## 31. Independent Pre-Implementation Audit Requirements

Before implementation may begin, an independent senior auditor must inspect this document and certify:
- Complete absence of implementation ambiguities.
- Strict non-duplication against MS-1.5.19 through MS-1.5.23.
- Inviolate enforcement of `SOLE_HUMAN_AUTHORITY = TRUE`.
- Complete execution firewall (0 execution primitives).

---

## 32. Implementation Boundary

```text
IMPLEMENTATION IS EXPLICITLY FORBIDDEN UNDER THIS SPECIFICATION DESIGN PHASE.
```
No source files, tests, or dist artifacts may be created until formal human authorization (`AUTHORIZE MS-1.5.24 IMPLEMENTATION`) is granted following audit.

---

## 33. Lock Conditions

This specification document is formally complete and locked for Independent Pre-Implementation Audit.

```text
SPECIFICATION STATUS: COMPLETE & AWAITING AUDIT
IMPLEMENTATION: NOT AUTHORIZED
```
