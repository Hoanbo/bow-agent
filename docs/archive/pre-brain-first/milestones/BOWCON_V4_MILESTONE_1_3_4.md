# BOWCON V4.0 — MILESTONE 1.3.4: MULTI-TENANT APPROVAL & IDEMPOTENCY DURABLE STORAGE

**Milestone ID:** MS-1.3.4  
**Target Package:** `@bow/agent` (Version `4.0.0`)  
**Scope:** Multi-Tenant Approval & Idempotency Durable Storage, Scoped Partitioning, Token Ownership Verification, Single-Use Token Consumption, Concurrent Execution Reservation (`IN_PROGRESS`), Path Traversal Defense, Lossless Deterministic Legacy Migration, Zero Cross-Tenant Mutation  
**Status:** COMPLETE / PRODUCTION-VERIFIED (100% PASS)  

---

## 1. MILESTONE OBJECTIVES & ABSOLUTE INVARIANTS

The objective of Milestone 1.3.4 is to eliminate global, single-tenant, in-memory, or unsafe flat-file assumptions for governance approvals and idempotency in `@bow/agent`, establishing strict multi-tenant partitioned persistence boundaries:

### Enforced Invariants:
1. **Physical & Logical Partition Isolation (INV-1, INV-2, INV-3):** User A cannot read, mutate, approve, revoke, or consume User B's approval records or one-time execution tokens. User A and User B may use the exact same `idempotencyKey` without collision or cross-talk. Records are physically partitioned into `data/approvals/<safe-user-id>.json` and `data/idempotency/<safe-user-id>.json`.
2. **Atomic Crash-Safe Persistence (INV-4, INV-6):** Both `ApprovalService` and `IdempotencyStore` persist all state via `DurableJsonStore<T>`, utilizing atomic temporary file writes and atomic renames to prevent partial corruption.
3. **Corruption Containment & Quarantine (INV-5):** Corruption in User A's partition file fails closed with `DurablePersistenceCorruptionError` and is automatically quarantined, leaving User B's partition 100% operational and isolated.
4. **Token Ownership Binding (INV-7):** Execution tokens generated from approved actions are cryptographically and contextually bound to `ownerUserId`. Execution requests verify that the authenticated caller matches the token owner.
5. **One-Time Token Consumption & Anti-Replay (INV-8):** High-impact execution tokens transition to `CONSUMED` upon first execution. Replay attempts are strictly rejected.
6. **Token Expiration (INV-9):** Expired tokens fail closed with `TOKEN_EXPIRED`.
7. **Same-User Idempotency Race Defense (INV-10):** Concurrent requests with the same key for the same user are protected via `reserve()` transitioning to `IN_PROGRESS`, blocking race conditions.
8. **User Scoping Precedes Lookup (INV-11):** Operations first resolve and validate the user partition before accessing records.
9. **Fail-Closed Security Perimeter (INV-12):** Missing, blank, or anonymous identity (`anonymous`, `anon`, `unknown`, `unauthenticated`), path traversal tokens (`..`, `/`, `\`), null bytes, and Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) are strictly rejected with `DurablePersistenceSecurityError`.
10. **Lossless Legacy Migration (INV-13):** Legacy single-tenant files (`data/approvals.json` and `data/idempotency.json`) are migrated exclusively to the designated primary owner (`boss_user`). Non-primary users receive pristine isolated stores. Legacy files on disk remain intact.
11. **Single-File Override Backward Compatibility:** Single-file overrides (used in isolated unit tests) continue to work seamlessly without regressions.

---

## 2. ARCHITECTURAL IMPLEMENTATION

### 2.1 Governance Runtime Schemas (`src/core/persistence/governanceSchemas.ts`)
- Implemented runtime schema validation for approval records (`validateApprovalRecords`) and idempotency entries (`validateIdempotencyEntries`).
- Enforces strict enum values for `ApprovalStatus` (`PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`, `CONSUMED`, `REVOKED`) and `targetDomain` (`shop`, `desktop`, `robot`, `system`, `dynamic_code`).
- Enforces prototype pollution defense by stripping `__proto__`, `constructor`, and `prototype` keys during validation.

### 2.2 Multi-Tenant Approval Service (`src/core/approvalService.ts`)
- Upgraded internal storage to an isolated partition store registry: `private stores = new Map<string, DurableJsonStore<ApprovalRecord[]>>()`.
- Partition directory: `data/approvals/`.
- User resolution via canonical `resolveUserPartition(userId, this.baseDir)`.
- Replaced direct `fs.writeFileSync` and unvalidated reads with `DurableJsonStore<ApprovalRecord[]>`.
- Implemented `validateToken`, `consumeToken`, and `validateAndConsumeToken` with strict token ownership verification (`authenticatedUserId === record.ownerUserId`).
- Maintained legacy migration to primary owner (`boss_user`) preserving original files.

### 2.3 Multi-Tenant Idempotency Store (`src/core/idempotencyStore.ts`)
- Upgraded internal storage to an isolated partition store registry: `private stores = new Map<string, DurableJsonStore<IdempotencyEntry[]>>()`.
- Partition directory: `data/idempotency/`.
- User resolution via canonical `resolveUserPartition(userId, this.baseDir)`.
- Replaced direct `fs.writeFileSync` and unvalidated reads with `DurableJsonStore<IdempotencyEntry[]>`.
- Implemented `reserve()` for atomic execution reservation (`IN_PROGRESS`), preventing concurrent double-execution races.
- Scoped all lookups (`check`, `record`, `size`) by user partition.

### 2.4 PDP & AgentLoop 7-Stage Token Lifecycle Alignment
- `PolicyDecisionPoint.evaluate` enhanced with `consumeToken?: boolean` (defaults to `true`).
- In `src/core/agentLoop.ts` Stage 4 (Planning & PDP check), `consumeToken: false` is passed so execution tokens are validated without being consumed prematurely.
- In `src/tools/registry.ts` Stage 5 (Tool Execution), `executeTool` evaluates PDP with token consumption (`consumeToken: true`), atomically consuming the one-time token immediately before tool execution.

---

## 3. VERIFICATION & TEST EVIDENCE

### 3.1 Dedicated Multi-Tenant Persistence Suite (`tests/test_v4_multi_tenant_approval_idempotency.ts`)
**Test Coverage: 20 Sections, 59 Assertions (100% PASS)**

| Section | Description | Assertions | Status |
|---|---|---|---|
| **Section 1** | User Partition Resolution & Fail-Closed Anonymous Rejection | 5 | PASS |
| **Section 2** | Approval User Isolation & Scoped Queries | 6 | PASS |
| **Section 3** | Approval Token Ownership & Authenticated Execution | 2 | PASS |
| **Section 4** | Approval One-Time Consumption & Anti-Replay (INV-8) | 3 | PASS |
| **Section 5** | Approval Expiration & Fail-Closed Behavior (INV-9) | 2 | PASS |
| **Section 6** | Cross-User Approval Attack Defense (INV-1) | 4 | PASS |
| **Section 7** | Idempotency User Isolation & Zero Key Collision (INV-2) | 4 | PASS |
| **Section 8** | Idempotency Replay Protection & Tampering Detection | 3 | PASS |
| **Section 9** | Same-User Idempotency Race & Reservation (INV-10) | 4 | PASS |
| **Section 10**| Concurrent Multi-User Interleaved Writes & File Cleanliness | 2 | PASS |
| **Section 11**| Corruption Isolation & Quarantining (INV-5) | 3 | PASS |
| **Section 12**| Schema Validation (Enum, Types, Invariants) | 5 | PASS |
| **Section 13**| Legacy Compatibility & Deterministic Migration (INV-13) | 3 | PASS |
| **Section 14**| Path Traversal Defense (`..`, `/`, `\`) | 1 | PASS |
| **Section 15**| Null-Byte Injection Security | 1 | PASS |
| **Section 16**| Windows Reserved Device Names Security (`CON`, `AUX`, `LPT1`) | 2 | PASS |
| **Section 17**| Prototype Pollution Defense (`__proto__`, `constructor`) | 2 | PASS |
| **Section 18**| Static Zero-Unsafe-Write & Zero-Mutable-Global Audit | 2 | PASS |
| **Section 19**| AgentLoop PDP Integration (Stage 4 Check vs Stage 5 Consumption) | 3 | PASS |
| **Section 20**| ToolRegistry Execution Boundary & Cross-Talk Zero | 2 | PASS |

### 3.2 Full Regression Suite Verification

| Test Suite File | Description | Assertions | Result |
|---|---|---|---|
| `tests/test_v4_multi_tenant_approval_idempotency.ts` | Multi-Tenant Approval & Idempotency Storage (MS-1.3.4) | 59 / 59 | **PASS (100%)** |
| `tests/test_v4_multi_user_durable_memory.ts` | Multi-User Durable Memory Partitioning (MS-1.3.3) | 48 / 48 | **PASS (100%)** |
| `tests/test_v4_durable_memory_persistence.ts` | Atomic Durable Memory Persistence (MS-1.3.2) | 44 / 44 | **PASS (100%)** |
| `tests/test_v4_memory_session_isolation.ts` | Working Memory Session Isolation (MS-1.3.1) | 62 / 62 | **PASS (100%)** |
| `tests/test_v4_agent_loop.ts` | Core Agent Loop 7-Stage Lifecycle (MS-1.2) | 58 / 58 | **PASS (100%)** |
| `tests/test_v4_architecture_contract.ts` | Architecture Contract & Baseline Lock (MS-1.1) | 45 / 45 | **PASS (100%)** |
| `tests/test_bow_con_phase1_memory.ts` | Phase 1 Memory & Briefing Capability | 43 / 43 | **PASS (100%)** |
| `tests/test_bow_con_level4_governance.ts` | Level 4 Governance & Safety Controller | 33 / 33 | **PASS (100%)** |
| `tests/test_l4_security_hardening.ts` | Security Hardening & Webhook Replay Defense | 36 / 36 | **PASS (100%)** |
| `tests/test_l4_unified_governance_integration.ts` | Unified Level 4 Governance Integration | 36 / 36 | **PASS (100%)** |
| `npm run typecheck` | TypeScript Compiler Typecheck (`tsc -b --noEmit`) | 0 diagnostics | **PASS (100%)** |
| `npm run build` | Full Production Build (`tsc -b && sync_ecosystem.js`) | 0 errors | **PASS (100%)** |

**Total Invariants Verified: 466 / 466 PASS (100% SUCCESS)**

---

## 4. REALITY AUDIT & BOUNDARY LOCK

- **Reality Elevation:**
  - `ApprovalService`: Fully elevated to **REAL** with multi-tenant partitioned atomic durable storage.
  - `IdempotencyStore`: Fully elevated to **REAL** with multi-tenant partitioned atomic durable storage and execution reservation.
  - Overall Reality Distribution: **28 REAL (59.6%)**, **13 PARTIAL (27.7%)**, **6 MOCK (12.8%)**.
- **ShopOfBow Status:** STRICTLY FROZEN (`C:\BOW\shopofbow` untouched).
- **Package Identity & Version:** Strictly `@bow/agent` `4.0.0` (NO V4.1, NO V5).
- **Milestone Exit Status:** APPROVED, LOCKED & COMPLETE.
