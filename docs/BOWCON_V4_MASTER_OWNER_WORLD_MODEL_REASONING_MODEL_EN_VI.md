# BOWCON V4.0 — MS-1.3.42: MASTER OWNER WORLD MODEL, SELF-AWARENESS & CAPABILITY-GROUNDED REASONING RUNTIME (EN / VI)

## 1. Executive Summary / Tóm Tắt Điều Hành

### English
Milestone **MS-1.3.42** establishes BOWCON as a **capability-grounded, context-aware, self-aware, and epistemically disciplined personal cognitive operating runtime** for its single Master Owner. 
It addresses the foundational epistemic questions:
* What does BOWCON know with empirical certainty?
* What has BOWCON observed directly vs inferred vs remembered?
* What does BOWCON explicitly not know or cannot measure?
* What capabilities exist conceptually vs available right now vs authorized?
* How does BOWCON reason about plans without fabricating capabilities or permissions?

### Tiếng Việt
Cột mốc **MS-1.3.42** thiết lập BOWCON thành một **runtime điều hành nhận thức cá nhân tự nhận thức, nhận biết ngữ cảnh, bám sát năng lực thực tế và kỷ luật nhận thức luận (epistemic discipline)** cho duy nhất một Master Owner.
Nó giải quyết các câu hỏi nhận thức luận cốt lõi:
* BOWCON biết những gì với bằng chứng thực nghiệm chắc chắn?
* BOWCON đã quan sát trực tiếp những gì, suy luận những gì, ghi nhớ những gì?
* BOWCON rõ ràng không biết hoặc không thể đo lường những gì?
* Những năng lực nào tồn tại về mặt khái niệm, năng lực nào đang sẵn sàng trên máy, và năng lực nào đã được cấp quyền?
* BOWCON lập kế hoạch thế nào mà không ngụy tạo năng lực hoặc quyền hạn?

---

## 2. Canonical Hierarchy & Epistemic Boundaries / Hệ Thống Phân Cấp & Ranh Giới Nhận Thức Luận

```text
MASTER OWNER
     │
     ▼
    BOW (Personal Ecosystem)
     │
     ▼
  BOWCON (Personal Cognitive Runtime)
     │
     ├── 12-Facet Self-Awareness Model
     ├── Durable Master Owner World Model
     ├── Epistemic Provenance Engine
     ├── Real Host Observation
     ├── 7-Stage Capability Grounding
     ├── 4-Tier Plan Feasibility Assessor
     ├── Information Gap Engine (UNKNOWN != FALSE)
     ├── Contradiction Engine (Non-destructive)
     ├── Temporal Staleness Tracking
     ├── Provenance-Backed Self-Correction
     │
     ▼
PROJECTS (Independent Integrations)
     ├── ShopOfBow (Independent Project, Protected Workspace)
     └── Future Projects & Applications
```

### Invariant Rules / Các Bất Biến Bắt Buộc

```text
MASTER_OWNER_AUTHORITY > BOW > BOWCON > OPTIONAL_PROJECT_INTEGRATIONS

OWNER_DECISION       > BOWCON_RECOMMENDATION
BOWCON_OPINION       != AUTHORITY
BOWCON_CONFIDENCE    != AUTHORITY
BOWCON_INTELLIGENCE  != AUTHORITY
BOWCON_AUTONOMY      != OWNERSHIP

CHALLENGE            != AUTHORITY
RECOMMENDATION       != EXECUTION
PREDICTION           != FACT
INFERENCE            != FACT
MEMORY               != TRUTH
VERIFICATION         != AUTHORIZATION
EXECUTION            != VERIFICATION
VERIFICATION         != COMMIT

USER_STOP            > EVERYTHING_AUTONOMOUS
C:\BOW\shopofbow     : READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
```

---

## 3. 12-Facet Self-Awareness Model / Mô Hình Tự Nhận Thức 12 Khía Cạnh

BOWCON enforces explicit distinction across 12 cognitive dimensions:

| Facet | Description | Provenance Level | Epistemic Discipline |
| :--- | :--- | :--- | :--- |
| `whatIKnow` | Verified empirical facts | `DIRECT_OBSERVATION`, `HOST_TELEMETRY`, `VERIFIED_EXECUTION`, `VERIFIED_OUTCOME`, `OWNER_CONFIRMED` | Only items with high-tier empirical evidence qualify as facts. |
| `whatIObserved` | Directly measured live host/runtime data | `DIRECT_OBSERVATION`, `HOST_TELEMETRY` | Tied to timestamp; subject to temporal staleness. |
| `whatIInferred` | Logical deductions from premises | `INFERENCE` | Confidence capped at ≤ 0.9; NEVER promoted to fact without verification. |
| `whatIRemember` | Recalled memories from durable storage | `PERSISTED_MEMORY`, `OWNER_STATED` | Subject to observational re-verification; memory != truth. |
| `whatIExpect` | Anticipated outcomes of ongoing tasks | `HYPOTHESIS` | Working conjecture awaiting execution outcome. |
| `whatIAssume` | Working premises without proof | `ASSUMPTION` | Confidence ≤ 0.5; explicitly labeled; never fact. |
| `whatIDoNotKnow` | Known unknowns | `UNKNOWN` | Explicitly acknowledged knowledge gaps. |
| `whatICannotMeasure`| Unmeasurable host telemetry | `UNKNOWN` / `UNAVAILABLE` | Reported honestly; zero fake metrics. |
| `whatICannotExecute`| Missing host capabilities | `UNAVAILABLE` | Tool code absent or platform unsupported. |
| `whatIAmNotAuthorizedToExecute`| Capabilities lacking token | `UNAUTHORIZED` | Requires Master Owner HumanGate token. |
| `whatIHaveVerified` | Post-condition confirmed outcomes | `VERIFIED_OUTCOME`, `VERIFIED_EXECUTION` | Cryptographically signed or state-verified. |
| `whatIHaveNotVerified`| Completed actions pending check | `INFERENCE` | Retained as provisional until verified. |

---

## 4. Epistemic Provenance Hierarchy / Phân Cấp Bằng Chứng Nhận Thức Luận

```text
Rank 10: DIRECT_OBSERVATION    (Highest empirical weight)
Rank  9: HOST_TELEMETRY
Rank  8: VERIFIED_EXECUTION
Rank  7: VERIFIED_OUTCOME
Rank  6: OWNER_CONFIRMED
Rank  5: OWNER_STATED
Rank  4: PERSISTED_MEMORY
Rank  3: INFERENCE
Rank  2: HYPOTHESIS
Rank  1: ASSUMPTION
Rank  0: UNKNOWN
Rank -1: CONTRADICTED
```

> [!CAUTION]
> **Anti-Elevation Invariant:**
> Any attempt to silently promote an `INFERENCE`, `ASSUMPTION`, `HYPOTHESIS`, or `PERSISTED_MEMORY` to `VERIFIED_EXECUTION` or `FACT` throws an `EPISTEMIC_VIOLATION` error.

---

## 5. 7-Stage Capability Lifecycle & 4-Tier Plan Feasibility / Vòng Đời Năng Lực 7 Giai Đoạn & Đánh Giá Kế Hoạch 4 Mức

### The 7-Stage Capability Chain
```text
HOST EXISTS
    ↓
CAPABILITY DISCOVERED
    ↓
CAPABILITY AVAILABLE ON HOST
    ↓
CAPABILITY PERMITTED BY GOVERNANCE
    ↓
CAPABILITY AUTHORIZED (HUMANGATE TOKEN)
    ↓
CAPABILITY EXECUTED
    ↓
OUTCOME VERIFIED
```

### 4-Tier Plan Feasibility
1. `PLAN_POSSIBLE`: All capabilities available on host, governance permits, risk is low/read-only or token already present.
2. `PLAN_CONDITIONALLY_POSSIBLE`: Capabilities physically exist on host, but execution is blocked pending Master Owner cryptographic token.
3. `PLAN_BLOCKED`: Required capability is unavailable, targets protected workspace `C:\BOW\shopofbow`, or violates immutable policy.
4. `PLAN_UNKNOWN`: Host environment state is unmeasured or uncertain.

---

## 6. Information Gap & Contradiction Engines / Cơ Chế Khoảng Trống Thông Tin & Mâu Thuẫn

### Information Gaps
- `UNKNOWN != FALSE`: If GPU telemetry cannot be sampled, GPU state is `UNKNOWN`, not "no GPU exists".
- `NOT_AVAILABLE != NOT_AUTHORIZED`: A missing binary on host is `NOT_AVAILABLE`; an installed binary lacking token approval is `NOT_AUTHORIZED`. These are never collapsed into a single boolean.

### Non-Destructive Contradiction Resolution
When contradictory evidence arises (e.g. Memory says CPU is idle, but telemetry measures 90% load), the system **retains both claims** with their respective provenance and timestamps, marking the world model state as `CONTRADICTED` until resolved by empirical evidence or Master Owner confirmation.

---

## 7. Protected Workspace Invariant / Bảo Vệ Không Gian Làm Việc

```text
C:\BOW\shopofbow
READS   = 0
WRITES  = 0
IMPORTS = 0
TOUCHES = 0
```

ShopOfBow is recognized in the world model as an independent project belonging to the Master Owner, but BOWCON core strictly blocks any filesystem reads, writes, imports, or touches to its workspace.
