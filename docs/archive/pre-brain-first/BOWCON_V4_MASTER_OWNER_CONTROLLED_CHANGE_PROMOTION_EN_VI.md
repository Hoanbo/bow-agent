# BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
# KIẾN TRÚC XÚC TIẾN THAY ĐỔI CÓ KIỂM SOÁT & TÍCH HỢP DỰ ÁN CÓ QUẢN TRỊ

---

## 1. ARCHITECTURAL TOPOLOGY & HIERARCHY / CẤU TRÚC VÀ PHÂN CẤP KIẾN TRÚC

### English
BOWCON V4.0 extends the verified MS-1.3.47 autonomous sandbox and worktree isolation layer with a governed change promotion subsystem.
The architecture establishes an immutable principle:

> **PROMOTION_PROPOSAL != AUTHORIZATION**  
> **VALIDATION != AUTHORIZATION**  
> **OWNER_APPROVAL != EXECUTION_TOKEN**  
> **CAPABILITY != AUTHORIZATION**  
> **USER_STOP > EVERYTHING_AUTONOMOUS**  
> **REVOCATION > AGENT_INTENT**

The promotion subsystem sits below Master Owner and Canonical Human Gate authority, acting as an advisory preparation and strictly controlled execution boundary:

```
MASTER OWNER (Human Authority)
      │
      ▼
SUPERVISOR / HUMAN GATE (SupervisorHumanGate)
      │
      ▼
CANONICAL AUTHORIZATION (WorldActionAuthorization)
      │
      ▼
CHANGE PROMOTION GOVERNANCE (PromotionRuntime)
      ├── Scope Validation (PromotionScopeValidator)
      ├── Proposal Preparation (PromotionProposalEngine)
      ├── Freshness & Staleness Validation (PromotionValidationEngine)
      ├── Conflict Detection (PromotionConflictEngine)
      ├── Supervisory Review Bridge (PromotionReviewEngine)
      ├── Authorization Bridge (PromotionAuthorizationEngine)
      ├── Controlled Execution Boundary (ControlledPromotionEngine)
      ├── Rollback Governance (PromotionRollbackEngine)
      └── Cryptographic Provenance Chain (PromotionProvenanceEngine)
      │
      ▼
AUTHORIZED PROJECT TARGET (Filesystem Mutation)
      │
      ▼
CANONICAL AUDIT LEDGER (AuditLedger)
```

### Tiếng Việt
BOWCON V4.0 mở rộng lớp sandbox tự trị và cô lập worktree đã được kiểm chứng của MS-1.3.47 bằng một phân hệ xúc tiến thay đổi có quản trị.
Kiến trúc thiết lập các nguyên tắc bất biến:

> **ĐỀ XUẤT XÚC TIẾN KHÔNG PHẢI LÀ ỦY QUYỀN**  
> **XÁC THỰC KHÔNG PHẢI LÀ ỦY QUYỀN**  
> **PHÊ DUYỆT CỦA OWNER KHÔNG PHẢI LÀ MÃ THỰC THI**  
> **NĂNG LỰC KHÔNG PHẢI LÀ ỦY QUYỀN**  
> **DỪNG KHẨN CẤP USER_STOP TỐI CAO HƠN MỌI TIẾN TRÌNH TỰ TRỊ**  
> **THU HỒI TỐI CAO HƠN Ý ĐỊNH CỦA TÁC TỬ**

Phân hệ xúc tiến nằm dưới thẩm quyền của Master Owner và HumanGate chuẩn tắc, đóng vai trò như một ranh giới chuẩn bị khuyến nghị và thực thi có kiểm soát nghiêm ngặt.

---

## 2. THE PROMOTION SAFETY LIFECYCLE / VÒNG ĐỜI AN TOÀN XÚC TIẾN

### English
Every change promotion follows a strict, non-skippable 8-stage safety pipeline:

1. **PROPOSE (`PromotionProposalEngine`)**:
   - Inspects verified sandbox manifest and diff.
   - Computes deterministic SHA-256 `diffHash` and `proposalHash`.
   - Packages provenance (taskId, agentId, delegationId, capabilityLeaseId, sandboxId, sessionId, deviceId).
   - Proposal state is advisory: `PROPOSED`.

2. **VALIDATE (`PromotionValidationEngine`)**:
   - Validates live context against session, task, delegation, and capability lease bindings.
   - Asserts that target project root is strictly not `C:\BOW\shopofbow`.
   - Verifies target base freshness: if target project base manifest differs from proposal base manifest, flags `STALENESS_DETECTED` and transitions to `STALE`. Never silently overwrites.
   - Recomputes and verifies SHA-256 diff integrity.
   - Asserts `USER_STOP` is not active.

3. **DETECT CONFLICTS (`PromotionConflictEngine`)**:
   - Checks for modified, deleted, or renamed files in target project after proposal generation.
   - Checks for concurrent active proposals modifying overlapping files (`OVERLAPPING_PROMOTION_ACTIVE`).
   - Preserves conflicts explicitly for human/supervisory review; never resolves conflicts by agent majority vote.

4. **REVIEW (`PromotionReviewEngine`)**:
   - Enforces `VERIFIED != OWNER_APPROVED` and `AGENT != APPROVER`.
   - Self-approval is strictly forbidden (`SELF_APPROVAL_REJECTED`).
   - Routes requests to canonical `SupervisorHumanGate`.

5. **CANONICAL AUTHORIZATION (`PromotionAuthorizationEngine`)**:
   - Enforces `OWNER_APPROVAL != EXECUTION_TOKEN`.
   - Delegates to canonical `WorldActionAuthorizationEngine` to issue a cryptographically signed, single-use, target-bound, parameter-bound `AuthorizationToken`.
   - Zero duplicate token store created.

6. **CONTROLLED EXECUTION (`ControlledPromotionEngine`)**:
   - Re-verifies `USER_STOP`, revocation, and token validity.
   - Captures previous state of all affected target files for rollback.
   - Applies changes safely using controlled filesystem APIs.
   - Zero unrestricted shell execution (`eval`, `new Function`, `execSync`, `child_process`, `SSH`, remote shell = 0).
   - Computes post-promotion target manifest hash.

7. **PROVENANCE & AUDIT (`PromotionProvenanceEngine` & `AuditLedger`)**:
   - Emits immutable `PromotionEvidenceBundle` binding the complete chain.
   - Writes cryptographically hash-chained `AuditEvent` to canonical `AuditLedger`.

8. **GOVERNED ROLLBACK (`PromotionRollbackEngine`)**:
   - Allows safe, atomic rollback of promoted changes using pre-captured backup state.
   - Respects `USER_STOP` and revocation.

### Tiếng Việt
Mọi đợt xúc tiến thay đổi đều tuân thủ quy trình an toàn 8 giai đoạn nghiêm ngặt, không thể bỏ qua:

1. **ĐỀ XUẤT (`PromotionProposalEngine`)**:
   - Kiểm tra bản kê khai sandbox và diff đã được xác minh.
   - Tính toán mã băm SHA-256 `diffHash` và `proposalHash` tất định.
   - Đóng gói nguồn gốc (taskId, agentId, delegationId, capabilityLeaseId, sandboxId, sessionId, deviceId).
   - Đề xuất chỉ mang tính khuyến nghị: trạng thái `PROPOSED`.

2. **XÁC THỰC (`PromotionValidationEngine`)**:
   - Xác thực ngữ cảnh trực tiếp so với phiên, tác vụ, ủy quyền và hợp đồng thuê năng lực.
   - Khẳng định thư mục mục tiêu tuyệt đối không phải `C:\BOW\shopofbow`.
   - Xác minh độ tươi mới của gốc mục tiêu: nếu bản kê khai gốc của dự án mục tiêu khác với bản kê khai gốc của đề xuất, đánh dấu `STALENESS_DETECTED` và chuyển sang `STALE`. Tuyệt đối không âm thầm ghi đè.
   - Tính toán lại và xác minh tính toàn vẹn SHA-256 của diff.
   - Khẳng định `USER_STOP` không kích hoạt.

3. **PHÁT HIỆN XUNG ĐỘT (`PromotionConflictEngine`)**:
   - Kiểm tra các tệp bị sửa đổi, xóa hoặc đổi tên trong dự án mục tiêu sau khi tạo đề xuất.
   - Kiểm tra các đề xuất xúc tiến đồng thời sửa đổi các tệp trùng lặp (`OVERLAPPING_PROMOTION_ACTIVE`).
   - Bảo toàn xung đột rõ ràng để người giám sát/con người đánh giá; không bao giờ tự động giải quyết xung đột bằng biểu quyết đa số của tác tử.

4. **ĐÁNH GIÁ GIÁM SÁT (`PromotionReviewEngine`)**:
   - Thực thi `VERIFIED != OWNER_APPROVED` và `AGENT != APPROVER`.
   - Nghiêm cấm tự phê duyệt (`SELF_APPROVAL_REJECTED`).
   - Chuyển tiếp yêu cầu tới `SupervisorHumanGate` chuẩn tắc.

5. **ỦY QUYỀN CHUẨN TẮC (`PromotionAuthorizationEngine`)**:
   - Thực thi `OWNER_APPROVAL != EXECUTION_TOKEN`.
   - Ủy quyền cho `WorldActionAuthorizationEngine` chuẩn tắc để cấp `AuthorizationToken` ký mã hóa, dùng một lần, gắn kết chặt chẽ với mục tiêu và tham số.
   - Không tạo kho lưu trữ mã ủy quyền thứ hai.

6. **THỰC THI CÓ KIỂM SOÁT (`ControlledPromotionEngine`)**:
   - Xác minh lại `USER_STOP`, trạng thái thu hồi và tính hợp lệ của mã ủy quyền.
   - Sao lưu trạng thái trước đó của tất cả các tệp mục tiêu bị ảnh hưởng để phục vụ hoàn tác.
   - Áp dụng các thay đổi một cách an toàn thông qua API hệ thống tệp có kiểm soát.
   - Không thực thi shell tùy tiện (`eval`, `new Function`, `execSync`, `child_process`, `SSH`, remote shell = 0).
   - Tính toán mã băm bản kê khai mục tiêu sau khi xúc tiến.

7. **NGUỒN GỐC & KIỂM TOÁN (`PromotionProvenanceEngine` & `AuditLedger`)**:
   - Xuất gói bằng chứng bất biến `PromotionEvidenceBundle` liên kết toàn bộ chuỗi ủy quyền và thực thi.
   - Ghi sự kiện kiểm toán được xâu chuỗi băm mã hóa vào `AuditLedger` chuẩn tắc.

8. **HOÀN TÁC CÓ QUẢN TRỊ (`PromotionRollbackEngine`)**:
   - Cho phép hoàn tác an toàn, nguyên tử các thay đổi đã xúc tiến bằng trạng thái sao lưu đã lưu trước đó.
   - Tôn trọng `USER_STOP` và trạng thái thu hồi.

---

## 3. ABSOLUTE PROTECTED WORKSPACE ISOLATION / CÔ LẬP TUYỆT ĐỐI KHÔNG GIAN BẢO VỆ

### English
`C:\BOW\shopofbow` is the protected workspace belonging exclusively to the Master Owner.
The promotion subsystem enforces:
```
READS = 0
WRITES = 0
IMPORTS = 0
TOUCHES = 0
```
All attempts to target the protected workspace—whether via direct path, relative traversal, UNC paths, case-variations, or path aliases—are immediately intercepted by `PromotionScopeValidator` and rejected with `SECURITY_VIOLATION`.

### Tiếng Việt
`C:\BOW\shopofbow` là không gian làm việc được bảo vệ thuộc sở hữu duy nhất của Master Owner.
Phân hệ xúc tiến thực thi tuyệt đối:
```
LƯỢT ĐỌC = 0
LƯỢT GHI = 0
LƯỢT IMPORT = 0
LƯỢT CHẠM = 0
```
Mọi nỗ lực nhắm vào không gian làm việc được bảo vệ—dù thông qua đường dẫn trực tiếp, vượt cấp tương đối, đường dẫn UNC, biến thể hoa thường hay bí danh đường dẫn—đều bị `PromotionScopeValidator` chặn đứng ngay lập tức với mã lỗi `SECURITY_VIOLATION`.

---

## 4. SUBSYSTEM COMPONENTS / CÁC THÀNH PHẦN PHÂN HỆ

| Component / Thành phần | File Path / Đường dẫn tệp | Role / Vai trò |
|---|---|---|
| `PromotionTypes` | `src/core/promotion/promotionTypes.ts` | Canonical schemas, states, interfaces, error types / Hợp đồng kiểu, trạng thái, giao diện |
| `PromotionScopeValidator` | `src/core/promotion/promotionScopeValidator.ts` | Scope containment, path traversal guard, protected workspace exclusion / Kiểm tra phạm vi, ngăn vượt cấp |
| `PromotionProposalEngine` | `src/core/promotion/promotionProposalEngine.ts` | Deterministic promotion proposals from sandbox diffs / Tạo đề xuất xúc tiến tất định |
| `PromotionValidationEngine` | `src/core/promotion/promotionValidationEngine.ts` | Context, base freshness, staleness detection, diff integrity / Xác thực ngữ cảnh, phát hiện độ cũ kỹ |
| `PromotionConflictEngine` | `src/core/promotion/promotionConflictEngine.ts` | Modified/deleted/renamed target conflict, concurrent promotion conflict / Phát hiện xung đột mục tiêu |
| `PromotionReviewEngine` | `src/core/promotion/promotionReviewEngine.ts` | Supervisory review, rejection of self-approval, HumanGate bridge / Đánh giá giám sát, chống tự phê duyệt |
| `PromotionAuthorizationEngine` | `src/core/promotion/promotionAuthorizationEngine.ts` | Canonical WorldActionAuthorization token issuance & validation / Cấp và xác thực mã ủy quyền chuẩn tắc |
| `ControlledPromotionEngine` | `src/core/promotion/controlledPromotionEngine.ts` | Safe target project file application without shell execution / Thực thi thay đổi tệp an toàn không shell |
| `PromotionRollbackEngine` | `src/core/promotion/promotionRollbackEngine.ts` | Governed restoration of pre-promotion state / Hoàn tác có quản trị về trạng thái trước xúc tiến |
| `PromotionProvenanceEngine` | `src/core/promotion/promotionProvenanceEngine.ts` | Cryptographic evidence bundles & provenance verification / Gói bằng chứng mã hóa và chuỗi nguồn gốc |
| `PromotionRuntime` | `src/core/promotion/promotionRuntime.ts` | Central subsystem coordinator & USER_STOP controller / Điều phối viên trung tâm và quản lý USER_STOP |
| `PromotionRealityGate` | `tests/test_v4_agent_controlled_change_promotion.ts` | 52-category (A..AZ) automated test gate (114/114 assertions PASS) / Cổng kiểm thử thực tế 52 hạng mục |

---

## 5. SECURITY AUDIT METRICS / CHỈ SỐ KIỂM TOÁN AN NINH

```
eval( execution paths:                0
new Function( execution paths:         0
execSync( execution paths:             0
child_process imports in promotion:    0
SSH / remote shell execution:          0
Arbitrary RPC execution:               0
Duplicate HumanGate stores:            0
Duplicate WorldAction stores:          0
Duplicate AuditLedger stores:          0
Credential / Secret persistence:       0
Authorization token persistence:       0
Protected workspace reads:             0
Protected workspace writes:            0
Protected workspace imports:           0
Protected workspace touches:           0
```
