# BOWCON V4.0 — MS-1.3.36 ARCHITECTURAL SPECIFICATION
# REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME MODEL (EN / VI)
# MÔ HÌNH RUNTIME VÒNG LẶP HOẠT ĐỘNG LIÊN TỤC VÀ TỰ TRỊ CÓ KIỂM SOÁT THỰC TẾ TRONG BOWCON V4.0

---

## 1. EXECUTIVE OVERVIEW / TỔNG QUAN ĐIỀU HÀNH

### English
Milestone **MS-1.3.36** delivers the **Real BOWCON Continuous Agent Operating Loop & Controlled Autonomy Runtime** for `@bow/agent@4.0.0`. It elevates BOWCON from episodic, turn-based single commands into an always-on, persistent, self-driving autonomous operating loop that continuously executes the closed-loop cycle:

$$\mathbf{Observe} \longrightarrow \mathbf{Reconstruct\ State} \longrightarrow \mathbf{Reason} \longrightarrow \mathbf{Plan} \longrightarrow \mathbf{Govern} \longrightarrow \mathbf{Authorize} \longrightarrow \mathbf{Execute} \longrightarrow \mathbf{Verify} \longrightarrow \mathbf{Evaluate} \longrightarrow \mathbf{Observe'}$$

Under strict engineering guarantees:
1. **`USER_STOP > AUTONOMOUS_EXECUTION`**: Physical human control always overrides autonomous execution immediately.
2. **`LLM_PROPOSE != EXECUTE`**: AI models only propose plans; execution requires independent governance evaluation and cryptographic authorization.
3. **`CONFIDENCE != AUTHORIZATION`**: A high model confidence score (e.g., 0.999) grants zero execution rights.
4. **`VERIFICATION != COMMIT`**: Actions must be verified against actual host telemetry and filesystem states prior to state commit.
5. **Mutation-Free Planning**: Planning never leaves side-effects; rollbacks and cleanup are deterministic.
6. **Crash-Resilient State**: State is atomically journaled with SHA-256 integrity hashes to enable safe rehydration after unexpected crashes.

### Tiếng Việt
Cột mốc **MS-1.3.36** bàn giao **Vòng lặp Hoạt động Liên tục và Runtime Tự trị có Kiểm soát Thực tế của BOWCON** cho gói `@bow/agent@4.0.0`. Cột mốc này nâng tầm BOWCON từ mô hình thực thi theo từng lệnh đơn lẻ thành một vòng lặp tự trị hoạt động liên tục, chạy bền bỉ theo chu trình kín:

$$\mathbf{Quan\ sát} \longrightarrow \mathbf{Tái\ thiết\ trạng\ thái} \longrightarrow \mathbf{Suy\ luận} \longrightarrow \mathbf{Lập\ kế\ hoạch} \longrightarrow \mathbf{Quản\ trị} \longrightarrow \mathbf{Ủy\ quyền} \longrightarrow \mathbf{Thực\ thi} \longrightarrow \mathbf{Xác\ minh} \longrightarrow \mathbf{Đánh\ giá} \longrightarrow \mathbf{Quan\ sát'}$$

Dưới các cam kết kỹ thuật nghiêm ngặt:
1. **`USER_STOP > AUTONOMOUS_EXECUTION`**: Quyền kiểm soát vật lý của con người luôn áp đảo mọi chu trình tự trị ngay tức thì.
2. **`LLM_PROPOSE != EXECUTE`**: Mô hình AI chỉ đề xuất kế hoạch; việc thực thi bắt buộc phải qua cổng quản trị độc lập và ủy quyền mật mã.
3. **`CONFIDENCE != AUTHORIZATION`**: Độ tự tin cao của mô hình không tương đương với quyền được thực thi.
4. **`VERIFICATION != COMMIT`**: Hành vi phải được xác minh độc lập trên môi trường thực tế trước khi ghi nhận thành công.
5. **Lập kế hoạch không tác dụng phụ**: Giai đoạn lập kế hoạch không tạo đột biến lên hệ thống.
6. **Phục hồi chống sự cố**: Trạng thái được lưu vết nguyên tử kèm mã băm SHA-256 để tái thiết an toàn khi có sự cố bất ngờ.

---

## 2. FUNDAMENTAL INVARIANTS / CÁC TIÊN ĐỀ BẤT BIẾN CỐT LÕI

$$\begin{aligned}
\text{OBSERVE} &\neq \text{ASSUME} \\
\text{REASON} &\neq \text{DECIDE} \\
\text{LLM\_PROPOSE} &\neq \text{EXECUTE} \\
\text{PLAN} &\neq \text{AUTHORIZATION} \\
\text{CONFIDENCE} &\neq \text{AUTHORIZATION} \\
\text{INTENT} &\neq \text{AUTHORIZATION} \\
\text{PREVIEW} &\neq \text{EXECUTION} \\
\text{AUTHORIZATION} &\neq \text{TOOL\_EXECUTION} \\
\text{TOOL\_EXECUTION} &\neq \text{VERIFICATION} \\
\text{VERIFICATION} &\neq \text{COMMIT} \\
\text{PREVIOUS\_APPROVAL} &\neq \text{CURRENT\_APPROVAL} \\
\mathbf{USER\_STOP} &> \mathbf{AUTONOMOUS\_EXECUTION}
\end{aligned}$$

---

## 3. CLOSED-LOOP RUNTIME ARCHITECTURE / KIẾN TRÚC RUNTIME VÒNG LẶP KÍN

```text
                               ┌────────────────────────────────┐
                               │           OPERATOR             │
                               │   (USER_STOP / PAUSE / RESUME) │
                               └───────────────┬────────────────┘
                                               │ Override
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             CONTINUOUS AGENT OPERATING LOOP                                 │
│                                                                                             │
│   ┌───────────────┐     ┌──────────────────────┐     ┌───────────────┐     ┌────────────┐   │
│   │  1. OBSERVE   │────►│ 2. STATE RECONSTRUCT │────►│   3. REASON   │────►│  4. PLAN   │   │
│   │ (Host Telemetry)    │  (Session & Identity)│     │(Cognitive Dec)│     │ (Dry-Run)  │   │
│   └───────────────┘     └──────────────────────┘     └───────────────┘     └─────┬──────┘   │
│           ▲                                                                      │          │
│           │                                                                      ▼          │
│   ┌───────┴───────┐     ┌──────────────────────┐     ┌───────────────┐     ┌────────────┐   │
│   │  8. EVALUATE  │◄────│      7. VERIFY       │◄────│  6. EXECUTE   │◄────│  5. GOVERN │   │
│   │ (State Update)│     │(Post-Execution Check)│     │ (Single-Step) │     │ (Auth Gate)│   │
│   └───────────────┘     └──────────────────────┘     └───────────────┘     └────────────┘   │
│                                                                                             │
│                         ┌───────────────────────────────────────┐                           │
│                         │   SUPERVISORY RECOVERY & ESCALATION   │                           │
│                         │   (Bounded Retries <= 3, Escalation)  │                           │
│                         └───────────────────────────────────────┘                           │
│                         ┌───────────────────────────────────────┐                           │
│                         │      ATOMIC PERSISTENCE & AUDIT       │                           │
│                         │   (SHA-256 Ledger, Anti-Tamper Chkpt) │                           │
│                         └───────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. SUBSYSTEM INVENTORY & COMPONENT MAPPING (MS-1.3.36)

| Component # | Component Name | Source Path | Real/Simulated | Purpose |
|---|---|---|---|---|
| **441** | `agentLoopTypes.ts` | `src/core/agent-loop/agentLoopTypes.ts` | **REAL** | Canonical interfaces, states, events, and envelopes. |
| **442** | `agentLoopTransitions.ts` | `src/core/agent-loop/agentLoopTransitions.ts` | **REAL** | State machine validation table and invariant predicates. |
| **443** | `agentLoopObjective.ts` | `src/core/agent-loop/agentLoopObjective.ts` | **REAL** | Priority-preempting objective lifecycle manager. |
| **444** | `agentLoopObservation.ts` | `src/core/agent-loop/agentLoopObservation.ts` | **REAL** | Live host, memory, CPU, process, and subsystem telemetry collector. |
| **445** | `agentLoopReasoning.ts` | `src/core/agent-loop/agentLoopReasoning.ts` | **REAL** | Cognitive boundary bridge with confidence-vs-auth separation. |
| **446** | `agentLoopPlanner.ts` | `src/core/agent-loop/agentLoopPlanner.ts` | **REAL** | Deterministic, side-effect-free capability plan compiler. |
| **447** | `agentLoopGovernance.ts` | `src/core/agent-loop/agentLoopGovernance.ts` | **REAL** | Policy gate rejecting hazardous commands and enforcing human tokens. |
| **448** | `agentLoopControl.ts` | `src/core/agent-loop/agentLoopControl.ts` | **REAL** | High-priority control plane (`USER_STOP`, `PAUSE`, `RESUME`, `RESET`). |
| **449** | `agentLoopCancellation.ts` | `src/core/agent-loop/agentLoopCancellation.ts` | **REAL** | Cooperative async abort controller and cancellation gates. |
| **450** | `agentLoopExecutor.ts` | `src/core/agent-loop/agentLoopExecutor.ts` | **REAL** | Governed step-by-step dispatcher with anti-replay token validation. |
| **451** | `agentLoopVerifier.ts` | `src/core/agent-loop/agentLoopVerifier.ts` | **REAL** | Independent post-execution verifier checking actual host states. |
| **452** | `agentLoopRecovery.ts` | `src/core/agent-loop/agentLoopRecovery.ts` | **REAL** | Bounded retry recovery coordinator wired to MS-1.3.35 supervisor. |
| **453** | `agentLoopEscalation.ts` | `src/core/agent-loop/agentLoopEscalation.ts` | **REAL** | Unresolved failure human escalation manager. |
| **454** | `agentLoopPersistence.ts` | `src/core/agent-loop/agentLoopPersistence.ts` | **REAL** | Atomic checkpointing with SHA-256 verification and stale-state detection. |
| **455** | `agentLoopScheduler.ts` | `src/core/agent-loop/agentLoopScheduler.ts` | **REAL** | Reentrant resource locks and TTL idempotency gates. |
| **456** | `agentLoopAudit.ts` | `src/core/agent-loop/agentLoopAudit.ts` | **REAL** | Tamper-evident cryptographic audit ledger with fail-closed secret redaction. |
| **457** | `agentLoopRuntime.ts` | `src/core/agent-loop/agentLoopRuntime.ts` | **REAL** | Orchestration kernel uniting all 16 continuous loop components. |
| **458** | `continuousAgentLoop.ts` | `src/core/agent-loop/continuousAgentLoop.ts` | **REAL** | Timer-driven continuous loop wrapper with interval-based execution. |
| **459** | `index.ts` | `src/core/agent-loop/index.ts` | **REAL** | Subsystem barrel export. |

---

## 5. REALITY GATE VERIFICATION MATRIX (39 CATEGORIES)

The Reality Gate test suite (`tests/test_v4_agent_continuous_operating_loop.ts`) validates **213 granular assertions** with **0 failures** across all 39 designated categories:

- **Category A**: Runtime Boot (State is READY, operational state predicates, health tracking).
- **Category B**: Self-Check (Capability enumeration, host PID verification, platform telemetry).
- **Category C**: Objective Creation (Canonical `obj_` ID, status lifecycle, priority preemption).
- **Category D**: Real Observation (Cores match `os.cpus().length`, free/total memory, process RSS).
- **Category E**: Cognitive Reasoning Boundary (`dec_` ID, actionRequired, `CONFIDENCE != AUTHORIZATION`).
- **Category F**: Plan Generation (`lplan_` ID, steps array, bounded retry limit = 3, mutation-free).
- **Category G**: Governance Boundary (Policy enforcement, hazardous command rejection).
- **Category H**: Human Authorization (Privileged plans enforce `HUMAN_REQUIRED`).
- **Category I**: Authorized Execution (Dry-run preview execution, token enforcement).
- **Category J**: Independent Verification (Post-execution telemetry and outcome checks).
- **Category K**: Continuous Observation After Execution (Timestamp monotonicity, live telemetry).
- **Category L**: Successful Closed-Loop Iteration (`EXECUTED` state, verified outcome, READY return).
- **Category M**: Recoverable Failure (Handling synthetic capability failures).
- **Category N**: Recovery Execution (Coordination with supervisory recovery runtime).
- **Category O**: Recovery Verification (Verification of restored operational state).
- **Category P**: Bounded Retry (Max 3 attempts strictly enforced, rejection on exhaustion).
- **Category Q**: Escalation (Canonical `esc_` record creation, human review flag).
- **Category R**: USER_STOP (`isStopped() === true`, autonomous execution forbidden immediately).
- **Category S**: USER_STOP during planning (Immediate loop tick blockage).
- **Category T**: USER_STOP during execution (`EXECUTION_BLOCKED` exception thrown).
- **Category U**: USER_STOP during recovery (Immediate abort, token-based reset verification).
- **Category V**: PAUSE (`isPaused() === true`, tick skipped, autonomous execution paused).
- **Category W**: RESUME with fresh observation (Resumption to READY, fresh observation collected).
- **Category X**: Crash Recovery (SHA-256 checkpoint hashing, tamper detection, rehydration).
- **Category Y**: Stale Checkpoint Detection (Age threshold evaluation, stale flag).
- **Category Z**: Resource Locking (Reentrant locks, conflict denial, atomic release).
- **Category AA**: Duplicate Iteration Idempotency (TTL-based idempotency gate).
- **Category AB**: Multi-Session Isolation (Session ID isolation, distinct trace generation).
- **Category AC**: Multi-Device Isolation (Device cryptographic representation separation).
- **Category AD**: Authorization Anti-Replay (Cryptographic single-use token consumption).
- **Category AE**: Critical Action Blocking (Direct incursions into protected workspace blocked).
- **Category AF**: Secret Redaction (Fail-closed scrubbing of API keys, tokens, passwords).
- **Category AG**: Audit Chain Integrity (Cryptographic SHA-256 previous-hash chain validation).
- **Category AH**: No Fake Telemetry (Real PID, real memory, real OS core metrics).
- **Category AI**: No Unrestricted Shell (Strict blocking of `cmd.exe`, `powershell.exe`, `/bin/sh`).
- **Category AJ**: SAFE_STOP Supremacy (Emergency stop reflected across all subsystems).
- **Category AK**: Runtime Health Truthfulness (Live uptime, iteration count, state alignment).
- **Category AL**: Full End-to-End Continuous Loop (Autonomous multi-stage tick execution).
- **Category AM**: Protected Workspace Isolation (`C:\BOW\shopofbow` strictly isolated: READS=0, WRITES=0).

---

## 6. PROTECTED WORKSPACE GOVERNANCE / QUẢN TRỊ VÙNG BẢO VỆ

The protected workspace path `C:\BOW\shopofbow` remains strictly untouched:
- **READS**: 0
- **WRITES**: 0
- **IMPORTS**: 0
- **TOUCHES**: 0

Any attempt to reference or access `C:\BOW\shopofbow` is intercepted at the governance boundary and classified as `CRITICAL_BLOCKED`.
