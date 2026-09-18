# BOWCON V4.0 — AGENT EXECUTION VERIFICATION & POSTCONDITION MODEL (MS-1.3.14)
# MÔ HÌNH XÁC MINH THỰC THI & ĐIỀU KIỆN SAU (POSTCONDITION) AGENT BOWCON V4.0

============================================================
BILINGUAL DEVELOPER ARCHITECTURE & LEARNING MANUAL
SỔ TAY KIẾN TRÚC & HỌC TẬP DÀNH CHO LẬP TRÌNH VIÊN SONG NGỮ
============================================================

Package: `@bow/agent`
Version: `4.0.0` STRICTLY LOCKED
Milestone: `MS-1.3.14` — Execution Verification & Postcondition Engine

---

## 1. Verification Architecture
## Kiến trúc Xác minh

**English:**
The Execution Verification subsystem provides an authoritative, deterministic verification layer between Governed Tool Execution and State Commit. While execution runtimes dispatch actions to capabilities and verify technical completion, the Verification Engine determines whether the semantic objectives (postconditions) of the action have actually been realized in the observed state.

**Tiếng Việt:**
Phân hệ Xác minh Thực thi cung cấp một lớp kiểm chứng có thẩm quyền, tất định nằm giữa tầng Thực thi Công cụ có Quản trị và tầng Lưu Trạng thái (State Commit). Trong khi runtime thực thi phát hành hành động tới các capability và xác nhận việc hoàn thành kỹ thuật, Động cơ Xác minh (Verification Engine) xác định xem các mục tiêu ngữ nghĩa (postconditions) của hành động đã thực sự đạt được trong trạng thái quan sát hay chưa.

```
Cognitive Pipeline:
User Request
    ↓
Conversation Context (Stage 2)
    ↓
Intent Understanding (Stage 2)
    ↓
Context-Aware Planning (Stage 3)
    ↓
Decision Reasoning (Stage 4)
    ↓
Action Orchestration (Stage 5)
    ↓
Governance (PDP Evaluation)
    ↓
Approval (Boss Token Verification)
    ↓
Governed Tool Execution (Stage 6)
    ↓
Result Normalization
    ↓
Postcondition Evaluation (Stage 6 Verification Engine)
    ↓
Verification Result (VERIFIED | FAILED | UNKNOWN | INCONCLUSIVE)
    ↓
Lifecycle Transition (VERIFYING → COMMITTING | FAILED)
    ↓
State Commit (Stage 7a)
    ↓
Voice Streaming (Stage 7b)
    ↓
Completed
```

---

## 2. Execution Result vs Verification Result
## Kết quả Thực thi vs Kết quả Xác minh

**English:**
An execution result (`ExecutionResult`) answers: *"Did the tool execute without an unhandled exception or crash?"*
A verification result (`VerificationResult`) answers: *"Did the execution achieve the intended real-world or state postcondition?"*
These two results are orthogonal and must never be conflated.

**Tiếng Việt:**
Kết quả thực thi (`ExecutionResult`) trả lời câu hỏi: *"Công cụ có chạy mà không bị ngoại lệ chưa xử lý hay crash không?"*
Kết quả xác minh (`VerificationResult`) trả lời câu hỏi: *"Việc thực thi có đạt được điều kiện sau (postcondition) về trạng thái thực tế như mong muốn không?"*
Hai kết quả này độc lập với nhau và tuyệt đối không được đánh đồng làm một.

---

## 3. Postcondition Model
## Mô hình Điều kiện sau (Postcondition)

**English:**
A postcondition is a pure data contract describing an expected attribute, value, or predicate on the state resulting from an action. Postconditions strictly forbid executable code, function predicates, or dynamic JavaScript expressions.

**Tiếng Việt:**
Postcondition là một hợp đồng dữ liệu thuần túy mô tả một thuộc tính, giá trị, hoặc vị từ kỳ vọng trên trạng thái sau khi hành động diễn ra. Postcondition nghiêm cấm chứa mã thực thi, các hàm predicate hoặc biểu thức JavaScript động.

Key properties:
- `id`: Unique identifier (e.g. `pc_order_cancelled`)
- `targetPath`: Safe dot-delimited property path (e.g. `order.status`)
- `operator`: Deterministic predicate operator (e.g. `EQUALS`, `GREATER_THAN`)
- `expectedValue`: Target value or reference array
- `required`: Boolean flag indicating if failure aborts task success
- `priority`: `CRITICAL | HIGH | MEDIUM | LOW`

---

## 4. Evidence Model
## Mô hình Bằng chứng (Evidence)

**English:**
Verification decisions cannot be based on guesswork or implicit assumptions. Every evaluation requires concrete, observed evidence derived from execution output, working memory, context, or sensor/perception streams.

**Tiếng Việt:**
Các quyết định xác minh không được dựa trên suy đoán hoặc giả định ngầm. Mọi đánh giá đều đòi hỏi bằng chứng quan sát cụ thể thu được từ kết quả thực thi, working memory, ngữ cảnh hoặc luồng cảm biến/tri giác.

Evidence statuses:
- `OBSERVED`: Property and value directly confirmed in output.
- `EXPECTED`: Target baseline from specification.
- `UNKNOWN`: Property is absent or unmeasurable.
- `CONFLICTING`: Contradictory evidence detected across sources.

---

## 5. UNKNOWN Status
## Trạng thái UNKNOWN (Chưa xác định)

**English:**
The `UNKNOWN` status indicates that execution completed without throwing an error, but the observed state lacked sufficient evidence to evaluate required postconditions. The engine safely fails closed, preventing unverified actions from masquerading as verified success.

**Tiếng Việt:**
Trạng thái `UNKNOWN` biểu thị rằng việc thực thi đã hoàn tất mà không phát sinh lỗi kỹ thuật, nhưng trạng thái quan sát thiếu bằng chứng cần thiết để đánh giá các postcondition bắt buộc. Động cơ xác minh sẽ kích hoạt cơ chế fail-closed an toàn, ngăn không cho các hành động chưa xác minh bị mạo danh là thành công.

---

## 6. INCONCLUSIVE Status
## Trạng thái INCONCLUSIVE (Không thể kết luận)

**English:**
The `INCONCLUSIVE` status occurs when contradictory or conflicting evidence is observed (e.g. execution output reports a database delete success, but context cache indicates the record still exists). It mandates manual inspection or controlled recovery.

**Tiếng Việt:**
Trạng thái `INCONCLUSIVE` xảy ra khi có bằng chứng mâu thuẫn được ghi nhận (ví dụ: output thực thi báo xóa cơ sở dữ liệu thành công, nhưng cache ngữ cảnh lại cho thấy bản ghi vẫn tồn tại). Trạng thái này yêu cầu kiểm tra thủ công hoặc kích hoạt đường phục hồi có kiểm soát.

---

## 7. Verification Predicates
## Các Vị từ Xác minh

**English:**
The engine supports 14 deterministic, safe predicate operators without dynamic code evaluation:

**Tiếng Việt:**
Động cơ hỗ trợ 14 toán tử vị từ tất định, an toàn mà không cần đánh giá mã động:

| Operator | English Description | Mô tả Tiếng Việt |
| :--- | :--- | :--- |
| `EQUALS` | Deep equality comparison | So sánh bằng sâu |
| `NOT_EQUALS` | Inverted equality comparison | So sánh khác giá trị |
| `EXISTS` | Property is present and not null/undefined | Thuộc tính tồn tại và không null/undefined |
| `NOT_EXISTS` | Property is absent or null/undefined | Thuộc tính vắng mặt hoặc null/undefined |
| `GREATER_THAN` | Strict numeric greater than (`>`) | Lớn hơn nghiêm ngặt (`>`) |
| `LESS_THAN` | Strict numeric less than (`<`) | Nhỏ hơn nghiêm ngặt (`<`) |
| `GREATER_OR_EQUAL` | Numeric greater than or equal (`>=`) | Lớn hơn hoặc bằng (`>=`) |
| `LESS_OR_EQUAL` | Numeric less than or equal (`<=`) | Nhỏ hơn hoặc bằng (`<=`) |
| `IN` | Value exists within expected array | Giá trị nằm trong mảng kỳ vọng |
| `NOT_IN` | Value does not exist in array | Giá trị không nằm trong mảng |
| `BOOLEAN_TRUE` | Value strictly equals boolean `true` | Giá trị đúng bằng boolean `true` |
| `BOOLEAN_FALSE` | Value strictly equals boolean `false` | Giá trị đúng bằng boolean `false` |
| `ALL` | All items in array match expected | Tất cả phần tử trong mảng khớp kỳ vọng |
| `ANY` | At least one item in array matches | Ít nhất một phần tử trong mảng khớp kỳ vọng |

---

## 8. Safe Path Resolution
## Phân giải Đường dẫn An toàn

**English:**
The `resolveSafePath` utility navigates nested objects and arrays using dot notation (e.g. `order.items.0.price`). It defensively sanitizes inputs, rejecting prototype pollution keywords (`__proto__`, `constructor`, `prototype`), null bytes (`\0`), path traversal (`..`), and Windows reserved device names (`CON`, `PRN`, etc.).

**Tiếng Việt:**
Tiện ích `resolveSafePath` duyệt các đối tượng và mảng lồng nhau thông qua dấu chấm (ví dụ: `order.items.0.price`). Nó lọc dữ liệu phòng thủ, từ chối các từ khóa ô nhiễm prototype (`__proto__`, `constructor`, `prototype`), null byte (`\0`), path traversal (`..`) và các tên thiết bị bảo lưu của Windows (`CON`, `PRN`, v.v.).

---

## 9. Security Model
## Mô hình An ninh

**English:**
- **Zero dynamic code:** No `eval`, `new Function`, or dynamic script execution.
- **Secret scrubbing:** Credentials, tokens, passwords, and private keys are scrubbed before reaching verification logs or failure records.
- **Fail-closed:** Malformed paths, polluted objects, or unhandled errors default to `FAILED` or `SECURITY_FAILURE`.

**Tiếng Việt:**
- **Không mã động:** Tuyệt đối không dùng `eval`, `new Function`, hay thực thi script động.
- **Tẩy sạch bí mật:** Chứng thực, token, mật khẩu và khóa riêng tư được tẩy sạch trước khi vào log xác minh hoặc bản ghi lỗi.
- **Fail-closed:** Đường dẫn dị dạng, đối tượng bị ô nhiễm hoặc lỗi không xử lý được sẽ mặc định chuyển thành `FAILED` hoặc `SECURITY_FAILURE`.

---

## 10. Scope Isolation
## Cô lập Phạm vi (Scope Isolation)

**English:**
Every verification request and audit history is partitioned by `${userId}::${sessionId}`. User A cannot inspect User B's verification outcomes, and Session 1 cannot pollute Session 2.

**Tiếng Việt:**
Mọi yêu cầu xác minh và lịch sử kiểm toán đều được phân vùng theo `${userId}::${sessionId}`. Người dùng A không thể đọc kết quả xác minh của Người dùng B, và Phiên 1 không thể gây ô nhiễm Phiên 2.

---

## 11. Immutability
## Tính Bất biến (Immutability)

**English:**
All objects returned by the verification engine (`VerificationResult`, `PostconditionResult`, `VerificationEvidence`, `VerificationSummary`) are deeply frozen using `Object.freeze()`. Mutations throw exceptions in strict mode.

**Tiếng Việt:**
Tất cả các đối tượng do động cơ xác minh trả về (`VerificationResult`, `PostconditionResult`, `VerificationEvidence`, `VerificationSummary`) đều được đóng băng sâu bằng `Object.freeze()`. Mọi nỗ lực chỉnh sửa sẽ ném ra ngoại lệ trong chế độ strict mode.

---

## 12. Determinism
## Tính Tất định (Determinism)

**English:**
Given identical execution results and postcondition contracts, the verification outcome, status, confidence score, and fingerprint are 100% identical. Randomness (`Math.random`, `crypto.randomUUID`) and timestamp-based identity generation are strictly forbidden.

**Tiếng Việt:**
Với cùng kết quả thực thi và hợp đồng postcondition đầu vào, kết quả xác minh, trạng thái, điểm tin cậy và fingerprint luôn giống nhau 100%. Tính ngẫu nhiên (`Math.random`, `crypto.randomUUID`) và định danh dựa trên timestamp hoàn toàn bị cấm.

---

## 13. Confidence Bounds
## Giới hạn Độ Tin cậy (Confidence)

**English:**
Confidence scores are bounded in `[0.0, 1.0]` and rounded deterministically. `NaN`, `Infinity`, and negative values are strictly rejected. Confidence reflects evidence quality and never overrides a failed postcondition.

**Tiếng Việt:**
Điểm tin cậy được giới hạn trong khoảng `[0.0, 1.0]` và làm tròn tất định. `NaN`, `Infinity` và các giá trị âm bị từ chối tuyệt đối. Điểm tin cậy phản ánh chất lượng bằng chứng và không bao giờ ghi đè một postcondition đã thất bại.

---

## 14. Risk Preservation
## Bảo toàn Mức độ Rủi ro (Risk Preservation)

**English:**
Verification operations cannot downgrade plan risk. A `CRITICAL` or `HIGH` risk execution retains its risk level throughout the verification phase, ensuring governance audits remain strict.

**Tiếng Việt:**
Các thao tác xác minh không thể hạ cấp mức rủi ro của kế hoạch. Một thực thi có rủi ro `CRITICAL` hoặc `HIGH` sẽ giữ nguyên mức rủi ro trong suốt giai đoạn xác minh, bảo đảm việc kiểm toán quản trị luôn nghiêm ngặt.

---

## 15. Governance Preservation
## Bảo toàn Quản trị (Governance Preservation)

**English:**
The Verification Engine operates purely as an audit and assertion layer. It does not authorize actions, consume approval tokens, bypass PDP policies, or write to idempotency stores.

**Tiếng Việt:**
Động cơ Xác minh hoạt động thuần túy như một lớp kiểm toán và khẳng định. Nó không ủy quyền hành động, không tiêu thụ token phê duyệt, không bỏ qua chính sách PDP và không ghi vào kho lưu trữ idempotency.

---

## 16. Lifecycle Integration
## Tích hợp Vòng đời (Lifecycle Integration)

**English:**
The Verification Engine connects with MS-1.3.13 Lifecycle Management:
- Enters stage via transition: `EXECUTING → VERIFYING`.
- Upon `VERIFIED` outcome: transitions `VERIFYING → COMMITTING`.
- Upon `FAILED` outcome: transitions `VERIFYING → FAILED` or `RECOVERABLE`.

**Tiếng Việt:**
Động cơ Xác minh liên kết với Quản lý Vòng đời MS-1.3.13:
- Tiến vào giai đoạn qua chuyển đổi: `EXECUTING → VERIFYING`.
- Khi kết quả là `VERIFIED`: chuyển trạng thái `VERIFYING → COMMITTING`.
- Khi kết quả là `FAILED`: chuyển trạng thái `VERIFYING → FAILED` hoặc `RECOVERABLE`.

---

## 17. AgentLoop Integration
## Tích hợp AgentLoop

**English:**
Integrated into Stage 6 of `AgentLoop`. For each planned step, after raw tool execution concludes, the engine normalizes output, evaluates declared postconditions, and populates `governedVerificationResult` on `AgentLoopResult`.

**Tiếng Việt:**
Được tích hợp vào Giai đoạn 6 của `AgentLoop`. Đối với từng bước trong kế hoạch, sau khi công cụ hoàn tất thực thi thô, động cơ chuẩn hóa output, đánh giá các postcondition đã khai báo và điền `governedVerificationResult` vào `AgentLoopResult`.

---

## 18. Failure Handling & Classification
## Xử lý & Phân loại Lỗi

**English:**
Failures are categorized deterministically:
1. `EXECUTION_FAILURE`: Tool itself failed or crashed.
2. `POSTCONDITION_FAILURE`: Observed state did not satisfy postcondition requirements.
3. `MISSING_EVIDENCE`: Required state attributes were missing.
4. `CONFLICTING_EVIDENCE`: Contradictory evidence observed across sources.
5. `SECURITY_FAILURE`: Prototype pollution, injection, or illegal path detected.
6. `SCOPE_FAILURE`: Mismatched or invalid tenant context.

**Tiếng Việt:**
Lỗi được phân loại một cách tất định:
1. `EXECUTION_FAILURE`: Bản thân công cụ thất bại hoặc crash.
2. `POSTCONDITION_FAILURE`: Trạng thái quan sát không đáp ứng yêu cầu postcondition.
3. `MISSING_EVIDENCE`: Thiếu các thuộc tính trạng thái bắt buộc.
4. `CONFLICTING_EVIDENCE`: Phát hiện bằng chứng mâu thuẫn từ nhiều nguồn.
5. `SECURITY_FAILURE`: Phát hiện ô nhiễm prototype, chèn mã hoặc đường dẫn bất hợp pháp.
6. `SCOPE_FAILURE`: Ngữ cảnh tenant không khớp hoặc không hợp lệ.

---

## 19. Why Verification Must Not Execute Tools
## Tại sao Xác minh Tuyệt đối Không được Thực thi Công cụ

**English:**
If the verification layer executed tools to verify state (e.g. calling a tool to check if another tool succeeded), it would trigger recursion, bypass the Policy Decision Point (PDP), violate idempotency locks, and create unmonitored side effects. Verification is strictly **ASSERTION OVER DATA**, not execution.

**Tiếng Việt:**
Nếu tầng xác minh tự ý thực thi công cụ để kiểm tra trạng thái (ví dụ gọi một công cụ khác để xem công cụ trước có chạy được không), nó sẽ tạo ra vòng lặp đệ quy, bỏ qua Cổng Quyết định Chính sách (PDP), vi phạm khóa idempotency và tạo ra tác dụng phụ không được giám sát. Xác minh nghiêm ngặt là **KHẲNG ĐỊNH TRÊN DỮ LIỆU**, chứ không phải thực thi.

---

## 20. Why "Tool Success ≠ Task Success"
## Tại sao "Thành công Thực thi ≠ Thành công Tác vụ"

**English:**
A network socket can successfully close without the target server terminating. A file can be written without the intended content parsing correctly. A database transaction can commit without the external business constraint holding true. Separating technical execution from postcondition verification guarantees high-integrity autonomous systems.

**Tiếng Việt:**
Một socket mạng có thể đóng thành công nhưng máy chủ đích chưa dừng. Một tệp có thể được ghi nhưng nội dung bên trong bị lỗi phân tích cú pháp. Một transaction cơ sở dữ liệu có thể commit nhưng ràng buộc nghiệp vụ bên ngoài vẫn chưa thỏa mãn. Tách biệt thực thi kỹ thuật khỏi xác minh điều kiện sau là nền tảng bảo đảm tính toàn vẹn cao cho hệ thống tự chủ.

---

## 21. Developer Examples
## Ví dụ Dành cho Lập trình viên

### Example A: Basic Postcondition Verification
```typescript
import { VerificationService } from '@bow/agent';

const service = new VerificationService();

const result = service.verify({
  requestId: 'req_001',
  userId: 'boss_user',
  sessionId: 'sess_100',
  toolName: 'cancel_subscription',
  executionResult: {
    success: true,
    output: {
      subscriptionId: 'sub_999',
      status: 'CANCELLED',
      effectiveImmediately: true,
    },
  },
  postconditions: [
    {
      id: 'pc_status',
      description: 'Subscription status must be CANCELLED',
      targetPath: 'status',
      operator: 'EQUALS',
      expectedValue: 'CANCELLED',
      required: true,
    },
    {
      id: 'pc_immediate',
      description: 'Must take effect immediately',
      targetPath: 'effectiveImmediately',
      operator: 'BOOLEAN_TRUE',
      required: true,
    },
  ],
});

console.log(result.status); // 'VERIFIED'
console.log(result.taskSucceeded); // true
```

### Example B: Execution Success with Postcondition Failure
```typescript
const failedTaskResult = service.verify({
  requestId: 'req_002',
  userId: 'boss_user',
  sessionId: 'sess_100',
  toolName: 'set_room_temperature',
  executionResult: {
    success: true, // Tool reported HTTP 200
    output: { currentTemp: 28 }, // But room is still 28°C
  },
  postconditions: [
    {
      id: 'pc_target_temp',
      description: 'Target temperature must reach 22°C',
      targetPath: 'currentTemp',
      operator: 'EQUALS',
      expectedValue: 22,
      required: true,
    },
  ],
});

console.log(failedTaskResult.status); // 'FAILED'
console.log(failedTaskResult.taskSucceeded); // false
console.log(failedTaskResult.recommendation); // 'RETRY_RECOMMENDED'
```

---

## 22. Future Perception Integration
## Tích hợp Tri giác Tương lai (Future Perception)

**English:**
While MS-1.3.14 remains a software-only BRAIN milestone without hardware or robot drivers, the Evidence model explicitly defines `PERCEPTION` provenance. In future milestones, physical camera or audio vision streams can submit verified perceptual observations into the Verification Engine as standard `VerificationEvidence` records.

**Tiếng Việt:**
Dù MS-1.3.14 là cột mốc BOWCON BRAIN thuần phần mềm không có driver phần cứng hay robot, mô hình Evidence đã định nghĩa sẵn nguồn gốc `PERCEPTION`. Trong các cột mốc tương lai, luồng tri giác thị giác hoặc âm thanh từ camera có thể gửi các quan sát tri giác đã xác minh vào Động cơ Xác minh dưới dạng các bản ghi `VerificationEvidence` tiêu chuẩn.

---

## 23. BOWCON Brain Architecture Summary
## Tóm tắt Kiến trúc Bộ não BOWCON

**English:**
The cognitive sequence is now complete from request to verification:
`Understand → Plan → Decide → Orchestrate → Execute → Verify → Commit`.
BOWCON BRAIN possesses an authoritative verification layer capable of distinguishing simulated execution from actual goal completion.

**Tiếng Việt:**
Chuỗi nhận thức hiện đã hoàn chỉnh từ tiếp nhận yêu cầu tới xác minh:
`Hiểu ý định → Lập kế hoạch → Ra quyết định → Điều phối → Thực thi → Xác minh → Lưu trạng thái`.
BOWCON BRAIN sở hữu một tầng xác minh có thẩm quyền có khả năng phân biệt việc thực thi mô phỏng với việc hoàn thành mục tiêu thực tế.
