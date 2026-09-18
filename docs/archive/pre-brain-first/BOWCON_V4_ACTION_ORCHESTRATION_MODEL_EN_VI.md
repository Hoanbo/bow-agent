# BOWCON V4.0 — AGENT ACTION ORCHESTRATION & GOVERNED EXECUTION BRIDGE MODEL
# MÔ HÌNH ĐIỀU PHỐI HÀNH ĐỘNG & CẦU NỐI THỰC THI CÓ QUẢN TRỊ

**Milestone ID:** MS-1.3.11  
**Package:** `@bow/agent`  
**Package Version:** `4.0.0 STRICTLY LOCKED`  
**Standard:** Level 4.0 Autonomous Governance & ISO/IEC 42001  

---

## 1. Architectural Overview & Separation of Concerns
### Tổng quan Kiến trúc & Phân tách Trách nhiệm

```
User Request
    ↓
Conversation Context (MS-1.3.7)
    ↓
Intent Understanding (MS-1.3.8)
    ↓
Context-Aware Planning (MS-1.3.9)
    ↓
Decision Reasoning & Action Selection (MS-1.3.10)
    ↓
[ MS-1.3.11 ]
Action Orchestration (ActionOrchestrator)
    ↓
Execution Intent (Immutable Data Contract)
    ↓
Risk & Governance Policy Gate (ExecutionGate)
    ↓
Policy Decision Point (PDP - Stage 4)
    ↓
Approval Token (ApprovalService - Stage 5)
    ↓
Idempotency Check (IdempotencyStore)
    ↓
Tool Execution (ToolRegistry - Stage 6)
    ↓
State Commit (Stage 7)
    ↓
Voice Synthesis (Stage 7b)
```

### English
Milestone 1.3.11 bridges pure decision reasoning with the governed execution pipeline (`src/core/orchestration/`). It is strictly a **governed translation layer** that answers:
> *"Given the agent's preferred decision, how is it converted into an execution intent and request, under which governance constraints, and through which verification boundaries?"*

**Core Separation Principle:**
$$\text{Decision} \ne \text{ExecutionIntent} \ne \text{ExecutionRequest} \ne \text{Tool Execution}$$

1. **DecisionResult**: Pure recommendation answering *"What should the agent prefer?"*
2. **ExecutionIntent**: Immutable domain-mapped contract stating *"What specific action is intended to be governed?"*
3. **ExecutionRequest**: Governed data payload formatted for Policy Decision Point (PDP) and ToolRegistry.
4. **Tool Execution**: Physical or API execution strictly reserved for Stage 6 under active PDP authorization and single-use approval tokens.

### Tiếng Việt
Milestone 1.3.11 đóng vai trò cầu nối giữa tầng suy luận quyết định thuần túy với pipeline thực thi có quản trị (`src/core/orchestration/`). Đây là một **tầng chuyển dịch có quản trị** trả lời cho câu hỏi:
> *"Từ quyết định ưu tiên của agent, nó được chuyển đổi thành ý định thực thi và yêu cầu thực thi như thế nào, dưới những ràng buộc quản trị nào, và thông qua những ranh giới xác minh nào?"*

**Nguyên lý Phân tách Trách nhiệm Cốt lõi:**
$$\text{Quyết định (Decision)} \ne \text{Ý định (Intent)} \ne \text{Yêu cầu (Request)} \ne \text{Thực thi Thực tế (Execution)}$$

1. **DecisionResult**: Đề xuất thuần túy trả lời *"Agent nên ưu tiên điều gì?"*
2. **ExecutionIntent**: Hợp đồng bất biến đã ánh xạ domain chỉ rõ *"Hành động cụ thể nào được dự định đưa vào quản trị?"*
3. **ExecutionRequest**: Payload dữ liệu có quản trị được định dạng sẵn sàng cho Policy Decision Point (PDP) và ToolRegistry.
4. **Thực thi Công cụ (Tool Execution)**: Việc thực thi API hoặc hệ thống vật lý thực tế được bảo vệ nghiêm ngặt tại Stage 6 dưới sự cấp phép của PDP và token phê duyệt dùng một lần.

---

## 2. Why Never Bypass the Governance Boundary
### Vì sao Tuyệt đối Không được Bỏ qua Ranh giới Quản trị (PDP & Approval)

### English
Direct execution from reasoning (`if (decision.selected) executeTool(...)`) creates critical security vulnerabilities:
1. **Loss of Authorization Control**: Bypassing PDP allows arbitrary tool execution without role, scope, or channel checks.
2. **Loss of Idempotency**: Bypassing `IdempotencyStore` exposes mutating operations (e.g. refunding payments, deleting orders) to duplicate replay attacks.
3. **Loss of Human-in-the-Loop Oversight**: Bypassing `ApprovalService` eliminates operator approval requirements for `HIGH` and `CRITICAL` risk operations.
4. **Audit Trail Blindness**: Unmediated tool calls escape cryptographic audit logging in `AuditLedger`.

**MS-1.3.11 Invariant:** `ActionOrchestrator` translates decisions into `ExecutionRequest`s but **NEVER directly calls `ToolRegistry.execute()` or bypasses PDP/Approval**.

### Tiếng Việt
Việc thực thi trực tiếp từ tầng suy luận (`if (decision.selected) executeTool(...)`) gây ra các lỗ hổng an ninh chí mạng:
1. **Mất Kiểm soát Ủy quyền**: Bỏ qua PDP sẽ cho phép thực thi công cụ tùy tiện mà không qua kiểm tra vai trò (role), phạm vi (scope) hay kênh (channel).
2. **Mất Tính Bất biến Lặp (Idempotency)**: Bỏ qua `IdempotencyStore` khiến các thao tác thay đổi trạng thái (như hoàn tiền, xóa đơn hàng) dễ bị tấn công lặp lại (replay attacks).
3. **Mất Giám sát của Con người (Human-in-the-Loop)**: Bỏ qua `ApprovalService` sẽ vô hiệu hóa yêu cầu phê duyệt bắt buộc từ người quản trị đối với các tác vụ rủi ro `HIGH` và `CRITICAL`.
4. **Mù Dấu vết Kiểm toán**: Các lệnh gọi công cụ không qua trung gian sẽ không được ghi vào sổ kiểm toán mật mã `AuditLedger`.

---

## 3. Decision State Mapping Matrix
### Ma trận Ánh xạ Trạng thái Quyết định

| DecisionState | Gate Status | Can Proceed to Governance? | Execution Behavior |
|---|---|---|---|
| **`NO_ACTION`** | `NO_ACTION` | ❌ No | No execution request created; zero tool invocation. |
| **`RESPOND`** | `NO_ACTION` | ❌ No | Informational direct response; no tools needed. |
| **`CLARIFY`** | `CLARIFICATION_REQUIRED` | ❌ No | Paused; awaiting user clarification before execution. |
| **`DEFER`** | `DEFERRED` | ❌ No | Paused; prerequisites or external states pending. |
| **`BLOCK`** | `BLOCKED` | ❌ No | Fail-closed rejection; execution strictly denied. |
| **`PROPOSE_ACTION`** (LOW) | `READY` | ✅ Yes | Prepared for governed execution pipeline. |
| **`PROPOSE_ACTION`** (MEDIUM) | `READY` | ✅ Yes | Governed; mandates PDP evaluation. |
| **`PROPOSE_ACTION`** (HIGH) | `WAITING_APPROVAL` | ✅ Yes | Mandates single-use human operator approval token. |
| **`PROPOSE_ACTION`** (CRITICAL) | `WAITING_APPROVAL` | ✅ Yes | Mandates approval token and destructive protection. |

---

## 4. Monotonic Risk Preservation & Non-Downgrade Rule
### Bảo tồn Rủi ro Đơn điệu & Quy tắc Chống Hạ cấp Rủi ro

### English
Risk classifications in BOWCON V4.0 are strictly monotonic:
$$\text{LOW} < \text{MEDIUM} < \text{HIGH} < \text{CRITICAL}$$

Invariant rule:
$$\text{ExecutionRisk} \ge \text{DecisionRisk}$$

- **Risk Escalation**: Permitted ($\text{LOW} \to \text{HIGH}$ is allowed if additional risk factors are discovered).
- **Risk Downgrade**: **STRICTLY REJECTED** ($\text{CRITICAL} \to \text{LOW}$, $\text{CRITICAL} \to \text{HIGH}$, $\text{HIGH} \to \text{MEDIUM}$ immediately trigger `REJECTED`).
- Downgrading risk to bypass approval or make execution easier is classified as a critical safety violation.

### Tiếng Việt
Phân loại mức độ rủi ro trong BOWCON V4.0 có tính chất đơn điệu nghiêm ngặt:
$$\text{LOW} < \text{MEDIUM} < \text{HIGH} < \text{CRITICAL}$$

Quy tắc bất biến:
$$\text{Rủi ro Thực thi} \ge \text{Rủi ro Quyết định}$$

- **Nâng cấp Rủi ro (Escalation)**: Được phép ($\text{LOW} \to \text{HIGH}$ hợp lệ nếu phát hiện thêm yếu tố rủi ro).
- **Hạ cấp Rủi ro (Downgrade)**: **TUYỆT ĐỐI BỊ TỪ CHỐI** ($\text{CRITICAL} \to \text{LOW}$, $\text{CRITICAL} \to \text{HIGH}$, $\text{HIGH} \to \text{MEDIUM}$ sẽ lập tức chuyển trạng thái `REJECTED`).
- Việc cố tình hạ cấp rủi ro để lách phê duyệt hoặc để thực thi dễ dàng hơn bị coi là vi phạm an toàn nghiêm trọng.

---

## 5. Parameter Safety & Prototype Pollution Defense
### An toàn Tham số & Phòng thủ Ô nhiễm Prototype

### English
Before any execution request is synthesized, all parameter keys and values undergo multi-tier sanitization:
1. **Null-Byte Injection Defense**: Rejects any key or string parameter containing `\0`.
2. **Prototype Pollution Defense**: Rejects objects with `__proto__`, `prototype`, or non-function `constructor` properties.
3. **Secret Leakage Defense**: Regex scanning scrubs Bearer tokens, API keys, private keys, and passwords from execution traces.
4. **Scope Authentication**: Rejects unauthenticated scopes (`anonymous`, `anon`, `unknown`, empty strings).

### Tiếng Việt
Trước khi bất kỳ yêu cầu thực thi nào được tổng hợp, toàn bộ khóa và giá trị tham số đều trải qua quy trình rà soát đa tầng:
1. **Chống chèn Null-Byte**: Từ chối bất kỳ khóa hoặc tham số chuỗi nào chứa ký tự `\0`.
2. **Chống Ô nhiễm Prototype**: Từ chối các object có chứa thuộc tính `__proto__`, `prototype`, hoặc `constructor` không phải là hàm.
3. **Chống Rò rỉ Bí mật**: Quét regex để loại bỏ Bearer token, API key, private key, và mật khẩu khỏi dấu vết thực thi.
4. **Xác thực Phạm vi**: Từ chối các phạm vi chưa xác thực (`anonymous`, `anon`, `unknown`, chuỗi rỗng).

---

## 6. Deterministic Idempotency Fingerprint
### Định danh Fingerprint Bất biến Lặp Tất định

### English
Execution identity must be 100% reproducible across replays without dependency on `Math.random()` or `Date.now()`:
```typescript
const executionFingerprint = computeDeterministicExecutionFingerprint(
  userId,
  sessionId,
  actionType,
  sourceDecisionFingerprint,
  parameters,
);
```
- Sorts parameter keys deterministically to ensure permutation invariance (`{a: 1, b: 2}` yields identical hash as `{b: 2, a: 1}`).
- Generates a fixed 32-bit FNV-1a hash prefix: `exec_<hex>`.

### Tiếng Việt
Định danh thực thi phải có khả năng tái lập 100% qua các lần replay mà không phụ thuộc vào `Math.random()` hay `Date.now()`:
- Sắp xếp các khóa tham số một cách tất định để đảm bảo tính bất biến theo hoán vị (`{a: 1, b: 2}` cho ra hash y hệt `{b: 2, a: 1}`).
- Tạo mã tiền tố FNV-1a 32-bit cố định: `exec_<hex>`.

---

## 7. AgentLoop Lifecycle Integration
### Tích hợp Vòng đời AgentLoop

```typescript
// Stage 2: Intent, Planning, Decision Reasoning & Action Orchestration
const decisionContext = createDecisionContext(...);
const decisionResult = this.decisionService.decide({ context: decisionContext, plan: contextAwarePlan });

// MS-1.3.11: Action Orchestration Bridge
const orchestrationResult = this.actionOrchestrator.orchestrate(decisionResult, decisionContext);

// Downstream Stages continue under existing boundaries:
// Stage 3: Bounded Planning
// Stage 4: PDP Evaluation
// Stage 5: Approval Verification
// Stage 6: Tool Execution
// Stage 7: State Commit & Voice
```

The orchestrator guarantees that `decisionResult` is safely bridged into `orchestrationResult` and attached to `AgentLoopResult` without altering the established contracts of Stage 4 PDP or Stage 6 Tool Execution.

---

## 8. Verification & Gate Summary
### Tóm tắt Xác minh & Kết quả Cổng Kiểm định

- **Automated Test Suite**: `tests/test_v4_agent_action_orchestration.ts` (40/40 PASS)
- **TypeScript Typecheck**: `npm run typecheck` $\to$ Code 0 (0 errors)
- **Production Build**: `npm run build` $\to$ Code 0 (0 errors)
- **Static Audit**: Zero forbidden dependencies (`eval`, `child_process`, `fetch`, `random`, `Date.now`)
- **Regression Suite**: 100% PASS across all 12 prior milestones
