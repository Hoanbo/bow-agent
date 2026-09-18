# BOWCON V4.0 — AGENT DECISION REASONING & ACTION SELECTION MODEL
# MÔ HÌNH SUY LUẬN QUYẾT ĐỊNH & LỰA CHỌN HÀNH ĐỘNG AGENT

**Milestone ID:** MS-1.3.10  
**Package:** `@bow/agent`  
**Package Version:** `4.0.0 STRICTLY LOCKED`  
**Standard:** Level 4.0 Autonomous Governance & ISO/IEC 42001  

---

## 1. Architectural Overview & Boundary
### Tổng quan Kiến trúc & Ranh giới

```
User Request
    ↓
Conversation Context (MS-1.3.7)
    ↓
Intent Understanding (MS-1.3.8)
    ↓
Context-Aware Planning (MS-1.3.9)
    ↓
Decision Reasoning (MS-1.3.10)   ← [THIS MILESTONE / MILESTONE NÀY]
    ↓
Candidate Action Selection (MS-1.3.10)
    ↓
Governance / PDP (Stage 4)
    ↓
Approval Token (Stage 5)
    ↓
Tool Execution (Stage 6)
    ↓
State Commit (Stage 7)
    ↓
Voice Synthesis (Stage 7b)
```

### English
Milestone 1.3.10 introduces the pure, deterministic Decision Reasoning and Candidate Action Selection subsystem (`src/core/decision/`). It sits strictly between Stage 2 (Planning) and Stage 4 (Policy Decision Point). It determines:
1. What the agent believes the user wants to accomplish.
2. What candidate actions are possible.
3. Which candidate is preferred and why (explainable rationale).
4. What uncertainty remains and whether clarification is required.
5. Whether governance evaluation or human approval will be mandatory downstream.

**Invariant Boundary (INV-1, INV-8, INV-9):**
The decision subsystem is **DATA-ONLY**. It **NEVER** executes tools, calls `ToolRegistry`, invokes `PolicyDecisionPoint`, consumes approval tokens, mutates durable memory, or initiates external network requests.

### Tiếng Việt
Milestone 1.3.10 thiết lập subsystem Suy luận Quyết định và Chọn Lựa Candidate Action thuần túy, mang tính tất định (`src/core/decision/`). Tầng này nằm chính xác giữa Stage 2 (Planning) và Stage 4 (Policy Decision Point - PDP). Nó xác định:
1. Agent tin rằng người dùng đang muốn đạt được điều gì.
2. Những candidate action nào có thể khả thi.
3. Candidate nào được ưu tiên nhất và lý do vì sao (cơ sở lý luận có thể giải thích).
4. Tính bất định nào còn tồn tại và liệu có cần người dùng làm rõ hay không.
5. Liệu việc đánh giá quản trị (governance) hay phê duyệt từ con người (approval) có bắt buộc ở các tầng sau hay không.

**Ranh giới Bất biến (INV-1, INV-8, INV-9):**
Subsystem quyết định **CHỈ XỬ LÝ DỮ LIỆU**. Nó **TUYỆT ĐỐI KHÔNG** thực thi công cụ, không gọi `ToolRegistry`, không gọi `PolicyDecisionPoint`, không tiêu thụ token phê duyệt, không thay đổi durable memory, và không tạo bất kỳ kết nối mạng ngoại vi nào.

---

## 2. Decision Model & Schema
### Mô hình Quyết định & Lược đồ Dữ liệu

```typescript
export interface DecisionResult {
  readonly success: boolean;
  readonly state: DecisionState;
  readonly userId: string;
  readonly sessionId: string;
  readonly intent: SemanticIntent;
  readonly selectedAction?: CandidateAction;
  readonly candidates: readonly DecisionCandidate[];
  readonly confidence: number;
  readonly uncertainty: readonly DecisionUncertainty[];
  readonly requiresClarification: boolean;
  readonly clarification?: StructuredClarification;
  readonly riskLevel: PlanRiskLevel;
  readonly governanceRequired: boolean;
  readonly approvalRequired: boolean;
  readonly rationale: DecisionRationale;
  readonly deterministicFingerprint: string;
}
```

### English
- `state`: Lifecycle decision state (`NO_ACTION`, `RESPOND`, `CLARIFY`, `PROPOSE_ACTION`, `DEFER`, `BLOCK`).
- `confidence`: Bounded floating-point value ($0.0 \le c \le 1.0$) indicating decision confidence.
- `selectedAction`: The preferred candidate action proposed to the governance layer. Undefined if clarification is required.
- `governanceRequired`: Flagged `true` for `MEDIUM`, `HIGH`, or `CRITICAL` risk operations.
- `approvalRequired`: Flagged `true` for `HIGH` or `CRITICAL` risk operations requiring explicit operator sign-off.
- `deterministicFingerprint`: 32-bit FNV-1a hash uniquely identifying the exact decision inputs and outcome.

### Tiếng Việt
- `state`: Trạng thái quyết định vòng đời (`NO_ACTION`, `RESPOND`, `CLARIFY`, `PROPOSE_ACTION`, `DEFER`, `BLOCK`).
- `confidence`: Giá trị số thực có chặn ($0.0 \le c \le 1.0$) thể hiện mức độ tin cậy của quyết định.
- `selectedAction`: Candidate action ưu tiên được đề xuất cho tầng quản trị. Là `undefined` nếu cần làm rõ.
- `governanceRequired`: Đặt là `true` đối với các thao tác rủi ro `MEDIUM`, `HIGH`, hoặc `CRITICAL`.
- `approvalRequired`: Đặt là `true` đối với các thao tác rủi ro `HIGH` hoặc `CRITICAL` đòi hỏi con người ký duyệt.
- `deterministicFingerprint`: Mã băm 32-bit FNV-1a định danh duy nhất dữ liệu đầu vào và kết quả quyết định.

---

## 3. Candidate Evaluation & Transparent Scoring
### Đánh giá Candidate & Chấm điểm Tường minh

### English
Candidate evaluation is governed by transparent, explainable weights defined in `src/core/decision/decisionScorer.ts`. No black-box models or hidden parameters are used:

| Factor | Weight | Condition | Explainable Tag |
|---|---|---|---|
| **Intent Alignment** | `0.35` | Candidate `intentType` matches `intent.intentType` | `intent_alignment` |
| **Required Fields Complete** | `0.25` | `missingParameters.length === 0` | `required_fields_complete` |
| **Reference Resolution** | `0.20` | All pronouns/references successfully resolved | `context_reference_resolved` |
| **Memory / Context Relevance** | `0.10` | Contextual memory/recent turns present | `memory_context_relevant` |
| **Intent Confidence Contribution** | `0.10` | Scaled by `bounded(intent.confidence) * 0.10` | `intent_confidence` |

### Tiếng Việt
Việc đánh giá candidate được điều khiển bởi các trọng số tường minh, minh bạch trong `src/core/decision/decisionScorer.ts`. Không sử dụng mô hình hộp đen hay tham số ẩn:

| Yếu tố | Trọng số | Điều kiện | Thẻ giải thích |
|---|---|---|---|
| **Khớp Intent** | `0.35` | `intentType` của candidate trùng khớp với `intent.intentType` | `intent_alignment` |
| **Đầy đủ Trường bắt buộc** | `0.25` | `missingParameters.length === 0` | `required_fields_complete` |
| **Giải quyết Tham chiếu** | `0.20` | Toàn bộ đại từ/tham chiếu được định danh thành công | `context_reference_resolved` |
| **Liên quan Bộ nhớ / Context** | `0.10` | Có sự hiện diện của memory/lượt hội thoại gần nhất | `memory_context_relevant` |
| **Đóng góp Độ tin cậy Intent** | `0.10` | Tỷ lệ theo `bounded(intent.confidence) * 0.10` | `intent_confidence` |

---

## 4. Action Selection, Validation, & Tie-Breaking
### Lựa chọn Hành động, Xác thực, & Xử lý Hòa điểm (Tie-Breaking)

### English
`ActionSelector` enforces the following deterministic procedure:
1. **Candidate Validation (INV-6)**: Verifies candidate structure and rejects unknown capabilities or unsupported intent types with reason `unknown_capability`.
2. **Ranking**: Sorts candidates in descending score order. Secondary tie-breaking is deterministic alphabetical sorting by `intentType`.
3. **Tie Detection (INV-5)**: If the difference between the top two candidates is within `DECISION_THRESHOLDS.tieDelta` ($0.02$), the system **refuses to arbitrarily guess**. It sets `tied: true`, leaves `selected: undefined`, and forces `requiresClarification = true`.

### Tiếng Việt
`ActionSelector` thực thi quy trình tất định sau:
1. **Xác thực Candidate (INV-6)**: Kiểm tra cấu trúc candidate và loại bỏ các năng lực lạ hoặc intent type không hỗ trợ với lý do `unknown_capability`.
2. **Xếp hạng**: Sắp xếp candidate theo điểm số giảm dần. Tiêu chí phụ khi hòa điểm là thứ tự bảng chữ cái của `intentType`.
3. **Phát hiện Hòa điểm (INV-5)**: Nếu chênh lệch giữa hai candidate dẫn đầu nằm trong `DECISION_THRESHOLDS.tieDelta` ($0.02$), hệ thống **tuyệt đối không đoán tùy tiện**. Hệ thống đặt `tied: true`, gán `selected: undefined`, và ép buộc `requiresClarification = true`.

---

## 5. Centralized Confidence Model
### Mô hình Độ tin cậy Tập trung

```typescript
export const DECISION_THRESHOLDS = Object.freeze({
  highlyConfident: 0.95,
  confident: 0.80,
  uncertain: 0.60,
  lowConfidence: 0.40,
  clarification: 0.40,
  tieDelta: 0.02,
});
```

### English
- **Strict Bounding**: `bounded(val)` ensures values are clamped between `0.0` and `1.0` and rounded to 4 decimal places to eliminate floating point precision artifacts.
- **Low Confidence Guard**: When confidence drops below `0.40`, the system automatically enters the `CLARIFY` state with uncertainty reason `LOW_CONFIDENCE`.

### Tiếng Việt
- **Chặn Chặt chẽ**: Hàm `bounded(val)` đảm bảo giá trị luôn nằm trong khoảng `0.0` đến `1.0` và làm tròn 4 chữ số thập phân để triệt tiêu sai số dấu phẩy động.
- **Bộ chặn Độ tin cậy Thấp**: Khi độ tin cậy giảm xuống dưới `0.40`, hệ thống tự động chuyển sang trạng thái `CLARIFY` kèm lý do bất định `LOW_CONFIDENCE`.

---

## 6. Risk-Aware Reasoning & Risk Preservation (INV-7)
### Suy luận Nhận biết Rủi ro & Bảo tồn Rủi ro

### English
`preserveRisk(planningRisk, candidateRisk)` enforces that risk classification generated by planning can **never be downgraded**:
$$\text{CRITICAL} \not\to \text{HIGH} \not\to \text{MEDIUM} \not\to \text{LOW}$$

- **LOW**: Informational queries, safe lookups (`RESPOND` or low-risk `PROPOSE_ACTION`). Governance not required.
- **MEDIUM**: Read-heavy or parameterized requests. Preserves `governanceRequired = true`.
- **HIGH**: Mutating operations (e.g. order cancellation). Enforces `governanceRequired = true` and `approvalRequired = true`.
- **CRITICAL**: Destructive operations (e.g. data deletion). Strictly requires `governanceRequired = true` and `approvalRequired = true`. Never converts directly into an executable tool payload.

### Tiếng Việt
Hàm `preserveRisk(planningRisk, candidateRisk)` đảm bảo phân loại rủi ro từ tầng planning **không bao giờ bị hạ cấp**:
$$\text{CRITICAL} \not\to \text{HIGH} \not\to \text{MEDIUM} \not\to \text{LOW}$$

- **LOW**: Truy vấn thông tin, tra cứu an toàn (`RESPOND` hoặc `PROPOSE_ACTION` rủi ro thấp). Không cần quản trị.
- **MEDIUM**: Các yêu cầu đọc dữ liệu hoặc có tham số. Giữ nguyên `governanceRequired = true`.
- **HIGH**: Các thao tác thay đổi dữ liệu (ví dụ hủy đơn hàng). Bắt buộc `governanceRequired = true` và `approvalRequired = true`.
- **CRITICAL**: Các thao tác phá hủy (ví dụ xóa dữ liệu). Bắt buộc `governanceRequired = true` và `approvalRequired = true`. Tuyệt đối không tự động chuyển thành payload thực thi tool.

---

## 7. Reference Resolution Integration (MS-1.3.7)
### Tích hợp Giải quyết Tham chiếu

### English
The decision reasoning layer evaluates contextual references extracted in MS-1.3.7 & MS-1.3.8:
- **Zero Resolution ("Xóa nó" with no turns)**: Unresolved reference $\to$ adds `UNRESOLVED_REFERENCE` uncertainty $\to$ triggers `CLARIFY`.
- **Ambiguous Resolution ("Xóa nó" with multiple orders)**: Multiple candidates $\to$ triggers `CLARIFY`.
- **Unique Resolution ("Xóa nó" with exactly one order)**: Reference resolved $\to$ scores candidate with `context_reference_resolved` $\to$ proceeds to `PROPOSE_ACTION`.

### Tiếng Việt
Tầng suy luận quyết định đánh giá các tham chiếu ngữ cảnh đã trích xuất từ MS-1.3.7 & MS-1.3.8:
- **Không tìm thấy Tham chiếu ("Xóa nó" khi chưa có hội thoại)**: Tham chiếu chưa giải quyết $\to$ thêm bất định `UNRESOLVED_REFERENCE` $\to$ kích hoạt `CLARIFY`.
- **Tham chiếu Mơ hồ ("Xóa nó" khi có nhiều đơn hàng)**: Nhiều đối tượng trùng lặp $\to$ kích hoạt `CLARIFY`.
- **Tham chiếu Duy nhất ("Xóa nó" khi có chính xác một đơn hàng)**: Tham chiếu được định danh $\to$ chấm điểm với thẻ `context_reference_resolved` $\to$ tiến vào `PROPOSE_ACTION`.

---

## 8. Structured Clarification & Explainable Rationale
### Làm rõ có Cấu trúc & Cơ sở Lý luận Giải thích được

### English
- **Structured Clarification**: Contains the specific missing parameters, the uncertainty reason, and safe candidate options (in the case of ties). Never hallucinates external choices.
- **Explainable Rationale**: Documents the primary factors contributing to candidate selection and records rejected candidates alongside explicit reasons (`lower_confidence_score`, `unknown_capability`, `missing_intent_type`).

### Tiếng Việt
- **Làm rõ có Cấu trúc (Clarification)**: Chứa các tham số còn thiếu cụ thể, lý do bất định, và danh sách lựa chọn an toàn (trong trường hợp hòa điểm). Tuyệt đối không bịa đặt lựa chọn bên ngoài.
- **Cơ sở Lý luận (Rationale)**: Ghi lại các yếu tố chính dẫn đến việc lựa chọn candidate và lưu lại danh sách candidate bị loại kèm lý do tường minh (`lower_confidence_score`, `unknown_capability`, `missing_intent_type`).

---

## 9. Security & Hardened Isolation
### An toàn & Cô lập Tăng cường

### English
1. **Prototype Pollution**: All inputs are inspected for `__proto__`, `constructor`, or `prototype`. Detected violations immediately return `state: 'BLOCK'`.
2. **Secret Safety (INV-10)**: Inputs with Bearer tokens, API keys, passwords, or private keys fail validation. All rationale and trace strings undergo automated regex redaction.
3. **Multi-Tenant Isolation (INV-4)**: Scope mismatches between `DecisionContext.userId` and `ContextAwarePlan.userId` or session IDs immediately trigger `BLOCK`.

### Tiếng Việt
1. **Ô nhiễm Prototype (Prototype Pollution)**: Toàn bộ đầu vào được rà soát để tìm `__proto__`, `constructor`, hoặc `prototype`. Vi phạm sẽ lập tức trả về `state: 'BLOCK'`.
2. **An toàn Bí mật (INV-10)**: Đầu vào chứa Bearer token, API key, mật khẩu hoặc private key sẽ bị từ chối xác thực. Mọi chuỗi rationale và trace đều được khử trùng tự động.
3. **Cô lập Đa người dùng (INV-4)**: Bất kỳ sự sai lệch phạm vi nào giữa `DecisionContext.userId` và `ContextAwarePlan.userId` hoặc sessionId sẽ lập tức kích hoạt `BLOCK`.

---

## 10. AgentLoop Integration Contract
### Hợp đồng Tích hợp AgentLoop

```
Stage 1: Intent Resolution (sanitizedText → intent)
Stage 2: Context / Memory Retrieval
         Intent Understanding (SemanticIntent)
         Context-Aware Planning (ContextAwarePlan)
         Decision Reasoning (DecisionResult)  ← MS-1.3.10
Stage 3: Bounded Planning (createPlan)
Stage 4: Policy Decision Point (PDP Evaluation)
Stage 5: Approval Verification
Stage 6: Tool Execution
Stage 7: State Commit & Voice Synthesis
```

`AgentLoop` instantiates `DecisionService` during construction and evaluates `this.decisionService.decide(...)` within Stage 2. The resulting `DecisionResult` is attached as an immutable intelligence artifact in `AgentLoopResult.decisionResult`. Existing Stage 4 PDP and Stage 6 Tool Execution boundaries remain strictly untouched.

---

## 11. End-to-End Verification Record
### Hồ sơ Xác minh Toàn diện

- **Automated Test Suite**: `tests/test_v4_agent_decision_reasoning.ts`
- **Total Assertions**: 35 / 35 PASS (100%)
- **TypeScript Typecheck**: Clean (`tsc -b --noEmit` exits with code 0)
- **Production Build**: Clean (`tsc -b && node scripts/sync_ecosystem.js` exits with code 0)
- **Static Audit**: 0 forbidden runtime dependencies (`eval`, `child_process`, `network`, `random`, `Date.now`, `fs.write`)
