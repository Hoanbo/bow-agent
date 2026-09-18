# BOWCON V4.0 — DURABLE COMMIT & STATE CONSISTENCY MODEL (MS-1.3.15)
# MÔ HÌNH COMMIT BỀN VỮNG & TÍNH NHẤT QUÁN TRẠNG THÁI BOWCON V4.0

============================================================
BILINGUAL DEVELOPER ARCHITECTURE & LEARNING MANUAL
SỔ TAY KIẾN TRÚC & HỌC TẬP DÀNH CHO LẬP TRÌNH VIÊN SONG NGỮ
============================================================

Package: `@bow/agent`
Version: `4.0.0` STRICTLY LOCKED
Milestone: `MS-1.3.15` — Durable Commit & State Consistency Engine

---

## 1. Why Verification is Not Commit
## Tại sao Xác minh Không đồng nghĩa với Commit

**English:**
MS-1.3.14 established: `EXECUTION SUCCESS ≠ TASK SUCCESS`.
MS-1.3.15 establishes the essential next invariant: `VERIFIED TASK ≠ DURABLY COMMITTED STATE`.
A task may be verified successfully against all postconditions in runtime memory, but state persistence (writing to durable memory, database, or disk) can still fail due to I/O exhaustion, sequence drift, conflict, or process termination. The system must never claim durable success when the resulting state was not safely committed.

**Tiếng Việt:**
MS-1.3.14 đã thiết lập: `THÀNH CÔNG THỰC THI ≠ THÀNH CÔNG TÁC VỤ`.
MS-1.3.15 thiết lập bất biến thiết yếu tiếp theo: `TÁC VỤ ĐÃ XÁC MINH ≠ TRẠNG THÁI ĐÃ COMMIT BỀN VỮNG`.
Một tác vụ có thể được xác minh thành công dựa trên mọi postcondition trong bộ nhớ runtime, nhưng việc lưu trữ trạng thái (ghi vào durable memory, cơ sở dữ liệu hoặc đĩa) vẫn có thể thất bại do cạn kiệt I/O, lệch chuỗi tuần tự, xung đột hoặc tiến trình bị ngắt đột ngột. Hệ thống tuyệt đối không được tuyên bố thành công bền vững khi trạng thái kết quả chưa được commit an toàn.

---

## 2. Commit Lifecycle
## Vòng đời Commit

**English:**
The commit lifecycle governs state transition from verified task execution to confirmed persistence:

**Tiếng Việt:**
Vòng đời commit kiểm soát việc chuyển đổi trạng thái từ thực thi tác vụ đã xác minh sang lưu trữ bền vững đã xác nhận:

```
VERIFIED TASK (Stage 6)
       ↓
COMMIT_PREPARING (Stage 7a: Collect mutations & pre-snapshot)
       ↓
COMMIT_VALIDATING (Validate scope, verification status, invariants)
       ↓
COMMIT_READY (Build immutable CommitPlan)
       ↓
COMMITTING (Execute atomic state persistence)
       ↓
COMMIT_CONFIRMED (Evaluate post-snapshot & consistency)
       ↓
COMMIT_COMPLETE (Durable state confirmed)
       ↓
RESPONDING & VOICE (Stage 7b)
```

Failure / Rollback paths:
`COMMIT_PREPARING | COMMIT_VALIDATING → COMMIT_REJECTED`
`COMMITTING → COMMIT_FAILED → ROLLBACK_PENDING → ROLLED_BACK`

---

## 3. Commit States
## Các Trạng thái Commit

**English:**
- `COMMIT_PREPARING`: Gathering mutation operations and capturing pre-commit snapshot.
- `COMMIT_VALIDATING`: Validating tenant scope, verification proof, and risk preservation.
- `COMMIT_READY`: Commit plan constructed, fingerprinted, and ready for atomic execution.
- `COMMITTING`: Applying atomic operations across memory domains.
- `COMMIT_CONFIRMED`: Operations applied; consistency engine auditing post-state.
- `COMMIT_COMPLETE`: Terminal success state; state is durably consistent.
- `COMMIT_FAILED`: Commit failed due to I/O error or constraint violation.
- `COMMIT_REJECTED`: Request rejected due to unverified input or security violation.
- `ROLLBACK_PENDING`: Rollback descriptor generated awaiting recovery coordination.
- `ROLLED_BACK`: State safely reverted or marked compensating.

**Tiếng Việt:**
- `COMMIT_PREPARING`: Thu thập các thao tác đột biến và chụp snapshot trước commit.
- `COMMIT_VALIDATING`: Xác thực phạm vi tenant, bằng chứng xác minh và bảo toàn rủi ro.
- `COMMIT_READY`: Kế hoạch commit đã được lập, tạo fingerprint và sẵn sàng thực thi nguyên tử.
- `COMMITTING`: Áp dụng các thao tác nguyên tử trên các miền bộ nhớ.
- `COMMIT_CONFIRMED`: Thao tác đã áp dụng; động cơ nhất quán đang kiểm toán trạng thái sau.
- `COMMIT_COMPLETE`: Trạng thái kết thúc thành công; trạng thái đạt tính nhất quán bền vững.
- `COMMIT_FAILED`: Commit thất bại do lỗi I/O hoặc vi phạm ràng buộc.
- `COMMIT_REJECTED`: Yêu cầu bị từ chối do đầu vào chưa xác minh hoặc vi phạm an ninh.
- `ROLLBACK_PENDING`: Đã tạo bộ mô tả rollback chờ phối hợp phục hồi.
- `ROLLED_BACK`: Trạng thái đã được hoàn nguyên an toàn hoặc đánh dấu bù trừ.

---

## 4. Commit Transaction Identity
## Định danh Giao dịch Commit

**English:**
Commit transaction identities are 100% deterministic, computed via non-random 32-bit FNV-1a hashing:
`commit_<hash(userId, sessionId, verificationId, operationsHash, riskLevel)>`
Random IDs (`Math.random()`, `crypto.randomUUID()`) and timestamps are strictly forbidden as identities.

**Tiếng Việt:**
Định danh giao dịch commit hoàn toàn tất định 100%, được tính toán thông qua thuật toán băm FNV-1a 32-bit phi ngẫu nhiên:
`commit_<hash(userId, sessionId, verificationId, operationsHash, riskLevel)>`
Định danh ngẫu nhiên (`Math.random()`, `crypto.randomUUID()`) và timestamp tuyệt đối bị cấm sử dụng làm định danh.

---

## 5. Idempotency
## Tính Bất biến Lặp (Idempotency)

**English:**
Identical commit requests submitted multiple times within the same user and session boundary resolve to the exact same commit transaction identity. The system guarantees that duplicate calls do not produce duplicate mutations.

**Tiếng Việt:**
Các yêu cầu commit giống hệt nhau được gửi nhiều lần trong cùng ranh giới user và session sẽ phân giải ra chính xác cùng một định danh giao dịch commit. Hệ thống bảo đảm rằng các lệnh gọi trùng lặp không sinh ra đột biến trùng lặp.

---

## 6. Replay Protection & Conflict Detection
## Bảo vệ Chống Replay & Phát hiện Xung đột

**English:**
The commit engine distinguishes between:
1. **FIRST COMMIT**: Initial submission -> executed and recorded (`status: 'COMMITTED'`).
2. **REPLAYED COMMIT**: Identical request submitted again -> recognized and returned safely without re-executing mutations (`status: 'ALREADY_COMMITTED'`, `isReplay: true`).
3. **CONFLICTING COMMIT**: Same commit identity but modified payload -> strictly rejected (`status: 'REJECTED'`, failure: `COMMIT_CONFLICT`).

**Tiếng Việt:**
Động cơ commit phân biệt rõ ràng giữa:
1. **COMMIT LẦN ĐẦU**: Yêu cầu ban đầu -> được thực thi và ghi nhận (`status: 'COMMITTED'`).
2. **COMMIT REPLAY**: Yêu cầu giống hệt được gửi lại -> nhận diện và trả về an toàn mà không thực thi lại đột biến (`status: 'ALREADY_COMMITTED'`, `isReplay: true`).
3. **COMMIT XUNG ĐỘT**: Cùng định danh commit nhưng payload bị sửa đổi -> từ chối nghiêm ngặt (`status: 'REJECTED'`, lỗi: `COMMIT_CONFLICT`).

---

## 7. Pre-Commit Snapshot
## Ảnh chụp Trước Commit (Pre-Commit Snapshot)

**English:**
An immutable snapshot (`PreCommitSnapshot`) captured immediately before commit execution. It records: `userId`, `sessionId`, `currentState`, `sequence`, `verificationId`, `verificationFingerprint`, `stateFingerprint`, and sanitized metadata. Creating a snapshot is a non-mutating read.

**Tiếng Việt:**
Một ảnh chụp bất biến (`PreCommitSnapshot`) được ghi lại ngay trước khi thực thi commit. Nó lưu trữ: `userId`, `sessionId`, `currentState`, `sequence`, `verificationId`, `verificationFingerprint`, `stateFingerprint` và metadata đã khử trùng. Việc tạo snapshot là thao tác đọc không gây đột biến.

---

## 8. Post-Commit Snapshot
## Ảnh chụp Sau Commit (Post-Commit Snapshot)

**English:**
An immutable snapshot (`PostCommitSnapshot`) captured immediately after commit execution. It records: `userId`, `sessionId`, `committedState`, `sequence` (incremented), `commitId`, `appliedOperations`, and timestamp metadata.

**Tiếng Việt:**
Một ảnh chụp bất biến (`PostCommitSnapshot`) được ghi lại ngay sau khi thực thi commit. Nó lưu trữ: `userId`, `sessionId`, `committedState`, `sequence` (được tăng tuần tự), `commitId`, `appliedOperations` và metadata thời gian.

---

## 9. Consistency Validation
## Kiểm tra Tính Nhất quán (Consistency Validation)

**English:**
The `ConsistencyEngine` audits pre-commit and post-commit snapshots alongside the commit plan, detecting 14 distinct consistency conditions:
- `STATE_MATCH`: Full consistency confirmed.
- `EXPECTED_STATE_MISSING`: Post-commit state was not captured or was lost.
- `SEQUENCE_MISMATCH`: State sequence regressed or drifted.
- `USER_SCOPE_MISMATCH` / `SESSION_SCOPE_MISMATCH`: Cross-tenant cross-talk detected.
- `VERIFICATION_MISMATCH`: Verification token was tampered with during commit.
- `PARTIAL_COMMIT`: Not all planned operations were confirmed.

**Tiếng Việt:**
Động cơ `ConsistencyEngine` kiểm toán các snapshot trước và sau commit cùng với kế hoạch commit, phát hiện 14 điều kiện nhất quán riêng biệt:
- `STATE_MATCH`: Đã xác nhận nhất quán hoàn toàn.
- `EXPECTED_STATE_MISSING`: Trạng thái sau commit không chụp được hoặc bị mất.
- `SEQUENCE_MISMATCH`: Chuỗi tuần tự trạng thái bị thụt lùi hoặc trôi dạt.
- `USER_SCOPE_MISMATCH` / `SESSION_SCOPE_MISMATCH`: Phát hiện xâm phạm chéo giữa các tenant.
- `VERIFICATION_MISMATCH`: Token xác minh bị can thiệp trong quá trình commit.
- `PARTIAL_COMMIT`: Không phải tất cả các thao tác theo kế hoạch đều được xác nhận.

---

## 10. Partial Commit Protection
## Phòng ngừa Commit Một phần (Partial Commit)

**English:**
In distributed or multi-store persistence, some mutations may succeed while others fail (e.g. session turn saved, but durable rule write failed). The commit subsystem detects this condition explicitly (`PARTIAL_COMMIT`), refusing to report `COMMITTED`, and marking the result as `ROLLBACK_REQUIRED` with failure category `COMMIT_PARTIAL_FAILURE`.

**Tiếng Việt:**
Trong lưu trữ phân tán hoặc đa kho, một số đột biến có thể thành công trong khi số khác thất bại (ví dụ: lượt hội thoại session đã lưu, nhưng ghi rule bền vững thất bại). Phân hệ commit phát hiện tường minh tình trạng này (`PARTIAL_COMMIT`), từ chối báo cáo `COMMITTED`, và đánh dấu kết quả là `ROLLBACK_REQUIRED` với danh mục lỗi `COMMIT_PARTIAL_FAILURE`.

---

## 11. Rollback Model
## Mô hình Rollback

**English:**
When a commit fails or is inconsistent, the subsystem generates immutable `RollbackMetadata` specifying: `affectedState`, `reason`, `eligible`, `status: 'ROLLBACK_PENDING'`, and deterministic fingerprint.
**Rule:** The subsystem models rollback metadata; it does NOT execute uncontrolled automatic rollbacks or introduce hidden side effects.

**Tiếng Việt:**
Khi commit thất bại hoặc không nhất quán, phân hệ sinh ra `RollbackMetadata` bất biến chỉ rõ: `affectedState`, `reason`, `eligible`, `status: 'ROLLBACK_PENDING'` và fingerprint tất định.
**Quy tắc:** Phân hệ mô hình hóa metadata rollback; nó TUYỆT ĐỐI KHÔNG tự ý thực thi rollback tự động mất kiểm soát hoặc tạo ra tác dụng phụ ẩn.

---

## 12. Failure Classification
## Phân loại Lỗi Commit

**English:**
Commit failures are classified deterministically into 10 categories:
1. `COMMIT_VALIDATION_FAILURE`: Verification was not VERIFIED, or payload was malformed.
2. `COMMIT_AUTHORIZATION_FAILURE`: Approval token missing for HIGH/CRITICAL action.
3. `COMMIT_CONFLICT`: Conflicting payload submitted for existing commit ID.
4. `COMMIT_PERSISTENCE_FAILURE`: Underlying storage I/O failed.
5. `COMMIT_CONSISTENCY_FAILURE`: Pre/post snapshot consistency audit failed.
6. `COMMIT_PARTIAL_FAILURE`: Atomic operations only partially applied.
7. `COMMIT_REPLAY`: Replay attempt rejected.
8. `COMMIT_SCOPE_FAILURE`: Invalid or mismatched tenant scope.
9. `COMMIT_INTEGRITY_FAILURE`: Checksum or fingerprint mismatch.
10. `COMMIT_UNKNOWN_FAILURE`: Unhandled persistence anomaly.

**Tiếng Việt:**
Lỗi commit được phân loại tất định thành 10 danh mục:
1. `COMMIT_VALIDATION_FAILURE`: Xác minh không phải VERIFIED hoặc payload dị dạng.
2. `COMMIT_AUTHORIZATION_FAILURE`: Thiếu token phê duyệt cho hành động HIGH/CRITICAL.
3. `COMMIT_CONFLICT`: Gửi payload xung đột với commit ID đã tồn tại.
4. `COMMIT_PERSISTENCE_FAILURE`: Lỗi I/O của kho lưu trữ bên dưới.
5. `COMMIT_CONSISTENCY_FAILURE`: Kiểm toán nhất quán snapshot trước/sau thất bại.
6. `COMMIT_PARTIAL_FAILURE`: Các thao tác nguyên tử chỉ được áp dụng một phần.
7. `COMMIT_REPLAY`: Nỗ lực replay bị từ chối.
8. `COMMIT_SCOPE_FAILURE`: Phạm vi tenant không hợp lệ hoặc không khớp.
9. `COMMIT_INTEGRITY_FAILURE`: Không khớp checksum hoặc fingerprint.
10. `COMMIT_UNKNOWN_FAILURE`: Bất thường lưu trữ chưa được phân loại.

---

## 13. Security Model
## Mô hình An ninh

**English:**
- **Prototype pollution defense:** Disallows `__proto__`, `constructor`, `prototype`.
- **Null byte & path defense:** Disallows `\0`, `..`, and Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, etc.).
- **Secret scrubbing:** Credentials, bearer tokens, API keys, and passwords are sanitized before persistence.

**Tiếng Việt:**
- **Phòng thủ prototype pollution:** Nghiêm cấm `__proto__`, `constructor`, `prototype`.
- **Phòng thủ null byte & path traversal:** Nghiêm cấm `\0`, `..` và tên thiết bị Windows bảo lưu (`CON`, `PRN`, `AUX`, `NUL`, v.v.).
- **Tẩy sạch bí mật:** Chứng thực, token bearer, khóa API và mật khẩu đều được làm sạch trước khi lưu trữ.

---

## 14. User & Session Isolation
## Cô lập Người dùng & Phiên làm việc

**English:**
All commit plans, snapshots, and audit stores are partitioned by `${userId}::${sessionId}`. User A cannot read or modify User B's commits. Session 1 cannot pollute Session 2.

**Tiếng Việt:**
Tất cả kế hoạch commit, snapshot và kho kiểm toán đều được phân vùng theo `${userId}::${sessionId}`. Người dùng A không thể đọc hoặc sửa commit của Người dùng B. Phiên 1 không thể gây ô nhiễm Phiên 2.

---

## 15. AgentLoop Integration
## Tích hợp vào AgentLoop

**English:**
Integrated into Stage 7 of `AgentLoop`. After Stage 6 verification concludes with success, `CommitService` prepares and executes the durable commit plan. `durableCommitResult` is exposed on `AgentLoopResult`, and `getCommitService()` provides access for testing and audit.

**Tiếng Việt:**
Được tích hợp vào Giai đoạn 7 của `AgentLoop`. Sau khi bước xác minh Giai đoạn 6 kết thúc thành công, `CommitService` chuẩn bị và thực thi kế hoạch commit bền vững. `durableCommitResult` được hiển thị trên `AgentLoopResult`, và `getCommitService()` cung cấp cổng truy cập cho kiểm thử và kiểm toán.

---

## 16. Governance Boundaries
## Ranh giới Quản trị (Governance Boundaries)

**English:**
The commit engine does NOT:
- Call `PolicyDecisionPoint` (PDP).
- Generate or verify approval tokens (`ApprovalService`).
- Call or mutate `IdempotencyStore`.
- Downgrade plan risk.
Governance remains authoritative in Stage 4. Commit only preserves and asserts governance metadata.

**Tiếng Việt:**
Động cơ commit TUYỆT ĐỐI KHÔNG:
- Gọi `PolicyDecisionPoint` (PDP).
- Sinh hoặc kiểm tra token phê duyệt (`ApprovalService`).
- Gọi hoặc sửa đổi `IdempotencyStore`.
- Hạ cấp mức rủi ro của kế hoạch.
Quản trị giữ nguyên thẩm quyền tại Giai đoạn 4. Tầng Commit chỉ bảo toàn và khẳng định metadata quản trị.

---

## 17. Persistence Boundaries
## Ranh giới Lưu trữ (Persistence Boundaries)

**English:**
The commit subsystem coordinates and models commit plans and consistency. It integrates with existing working memory and durable stores (`memoryStore`, `globalBossMemory`, `globalBossFeedback`) without rewriting or bypassing their persistence invariants.

**Tiếng Việt:**
Phân hệ commit điều phối và mô hình hóa các kế hoạch commit và tính nhất quán. Nó tích hợp với bộ nhớ làm việc và các kho lưu trữ bền vững hiện có (`memoryStore`, `globalBossMemory`, `globalBossFeedback`) mà không viết lại hay phá vỡ các bất biến lưu trữ của chúng.

---

## 18. Determinism
## Tính Tất định (Determinism)

**English:**
Given identical verified input and state snapshots, output commit plans, transaction identities, consistency results, and fingerprints are 100% identical.

**Tiếng Việt:**
Với cùng đầu vào đã xác minh và các snapshot trạng thái, kế hoạch commit đầu ra, định danh giao dịch, kết quả nhất quán và fingerprint luôn giống nhau 100%.

---

## 19. Developer Examples
## Ví dụ Dành cho Lập trình viên

### Example A: Basic Commit Flow
```typescript
import { CommitService } from '@bow/agent';

const commitService = new CommitService();

const result = commitService.commit({
  requestId: 'req_001',
  userId: 'boss_user',
  sessionId: 'sess_100',
  verificationResult: {
    verificationId: 'ver_001',
    status: 'VERIFIED',
    taskSucceeded: true,
    riskLevel: 'LOW',
  },
  operations: [
    {
      operationId: 'op_turn_1',
      type: 'SESSION_TURN_APPEND',
      targetDomain: 'working_memory',
      payload: { userText: 'Please reboot server' },
      applied: true,
    },
  ],
});

console.log(result.status); // 'COMMITTED'
console.log(result.consistency.consistent); // true
```

### Example B: Replay Detection
```typescript
// Submitting the exact same request again
const replayResult = commitService.commit(sameRequest);

console.log(replayResult.status); // 'ALREADY_COMMITTED'
console.log(replayResult.isReplay); // true
```

---

## 20. Developer Rules
## Quy tắc Cốt lõi Dành cho Lập trình viên

1. **Rule 1**: Never commit an unverified, failed, unknown, or inconclusive task.
2. **Rule 2**: Never downgrade risk or erase governance requirements during commit.
3. **Rule 3**: Never use `Math.random` or `Date.now` for commit transaction identity.
4. **Rule 4**: Always validate tenant scope `${userId}::${sessionId}` before preparation.
5. **Rule 5**: Always preserve pre-commit state before executing durable writes.
6. **Rule 6**: Always flag partial commits and mandate rollback when atomicity fails.
7. **Rule 7**: Treat rollback metadata as descriptive context; do not execute uncontrolled side effects.
