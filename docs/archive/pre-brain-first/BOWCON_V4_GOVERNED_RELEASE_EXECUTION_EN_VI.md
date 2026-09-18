# BOWCON V4.0 — MS-1.3.51: GOVERNED RELEASE EXECUTION & AUTHORIZED DEPLOYMENT BOUNDARY
# RANH GIỚI THỰC THI PHÁT HÀNH CÓ QUẢN TRỊ & TRIỂN KHAI ĐƯỢC ỦY QUYỀN

---

## 1. ARCHITECTURAL TOPOLOGY & HIERARCHY / CẤU TRÚC VÀ PHÂN CẤP KIẾN TRÚC

### English
BOWCON V4.0 extends the verified MS-1.3.50 Governed CI & Milestone Release Verification subsystem with a governed physical mutation and release deployment boundary.

While MS-1.3.50 is purely **advisory technical verification** culminating in `VERIFIED_READY_FOR_OWNER`, MS-1.3.51 establishes the **governed execution boundary** that translates an approved release proposal into an authorized deployment on explicit project targets.

The architecture enforces strict fail-closed governance:

> **MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS**  
> **OWNER_DECISION > BOWCON_RECOMMENDATION**  
> **USER_STOP > EVERYTHING_AUTONOMOUS**  
> **REVOCATION > AGENT_INTENT**  
> **RELEASE_VERIFICATION != OWNER_APPROVAL**  
> **RELEASE_VERIFICATION != RELEASE_AUTHORIZATION**  
> **OWNER_APPROVAL != EXECUTION_TOKEN**  
> **EXECUTION_TOKEN != RELEASE_RESULT**  
> **AUTOMATION != OWNER_WILL**  
> **AGENT_COUNT != AUTHORITY_COUNT**  
> **VERIFIED_READY_FOR_OWNER != AUTO_RELEASE**

The only valid path to mutation is:
```
RELEASE_CANDIDATE
        │
        ▼
RELEASE_VERIFICATION (MS-1.3.50)
        │
        ▼
VERIFIED_READY_FOR_OWNER (Strictly Advisory)
        │
        ▼
SUPERVISOR_HUMAN_GATE (SupervisorHumanGate)
        │
        ▼
OWNER_APPROVAL (ReleaseExecutionReviewBridge: OWNER_APPROVED)
        │
        ▼
WORLD_ACTION_AUTHORIZATION (WorldActionAuthorizationEngine)
        │
        ▼
SINGLE_USE_EXECUTION_TOKEN (ReleaseExecutionAuthorizationBridge: AUTHORIZED)
        │
        ▼
GOVERNED_RELEASE_EXECUTION (GovernedReleaseExecutionEngine: EXECUTING)
        │ (Atomic backups captured, zero shell execution)
        ▼
POST_RELEASE_VERIFICATION (ReleaseExecutionVerificationEngine: VERIFYING)
        │ (Detects partial mutation or missing assets)
        ▼
RELEASE_RESULT (ReleaseExecutionProvenanceEngine: COMPLETED or FAILED)
        │ (Automatic rollback if post-verification fails)
        ▼
CANONICAL_AUDIT_LEDGER (AuditLedger: Append-only cryptographic log)
```

### Tiếng Việt
BOWCON V4.0 mở rộng phân hệ Xác minh Phát hành Cột mốc & CI Có quản trị của MS-1.3.50 với ranh giới triển khai phát hành và đột biến vật lý có quản trị.

Trong khi MS-1.3.50 là quy trình **xác minh kỹ thuật mang tính cố vấn** kết thúc tại `VERIFIED_READY_FOR_OWNER`, MS-1.3.51 thiết lập **ranh giới thực thi có quản trị** giúp chuyển đổi đề xuất phát hành đã duyệt thành hành động triển khai được ủy quyền lên các mục tiêu dự án cụ thể.

Kiến trúc áp dụng cơ chế quản trị fail-closed (chặn an toàn khi có lỗi) nghiêm ngặt:
- **Xác minh phát hành KHÔNG PHẢI là sự phê duyệt của chủ sở hữu** (`RELEASE_VERIFICATION != OWNER_APPROVAL`).
- **Phê duyệt của chủ sở hữu KHÔNG PHẢI là mã thực thi** (`OWNER_APPROVAL != EXECUTION_TOKEN`).
- **Mã thực thi KHÔNG PHẢI là kết quả phát hành thành công** (`EXECUTION_TOKEN != RELEASE_RESULT`).
- **Trạng thái sẵn sàng KHÔNG BAO GIỜ tự động phát hành** (`VERIFIED_READY_FOR_OWNER != AUTO_RELEASE`).

---

## 2. INVARIANTS & GOVERNED BOUNDARIES / CÁC BẤT BIẾN & RANH GIỚI QUẢN TRỊ

### Invariant 1: Separation of Verification, Approval, and Authorization (Phân tách Xác minh, Phê duyệt và Ủy quyền)
Technical verification evaluates test suites and criteria. Human review records operator decision. Authorization issues a single-use token bound cryptographically to candidate, target, session, task, and operator. Each stage is strictly isolated and fails closed.

### Invariant 2: Single-Use Token & Anti-Replay (Mã Dùng Một Lần & Chống Phát Lại)
Execution tokens issued via `WorldActionAuthorizationEngine` are valid for a single execution cycle. Once consumed, any attempt to re-execute fails closed with `TOKEN_REPLAY_REJECTED`. Raw token secrets are never persisted in durable evidence.

### Invariant 3: Zero Unrestricted Shell Execution (Không Thực Thi Lệnh Shell Tự Do)
Release execution operates strictly through controlled Node.js filesystem APIs with path containment (`SandboxPathGuard`). Runtime logic contains zero `eval(`, `new Function(`, `execSync(`, `child_process`, `spawn`, `fork`, or `SSH`.

### Invariant 4: Protected Workspace Absolute Isolation (Cô Lập Tuyệt Đối Không Gian Được Bảo Vệ)
`C:\BOW\shopofbow` remains strictly isolated:
> **READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0**  
Any release execution request or rollback targeting `C:\BOW\shopofbow` immediately fails closed with `PROTECTED_WORKSPACE_VIOLATION`.

### Invariant 5: Mandatory Post-Release Verification & Atomic Rollback (Xác Minh Sau Thực Thi & Hoàn Tác Nguyên Tử)
A release is never reported as successful merely because the mutation call completed. Target manifest is re-scanned and verified. If post-verification fails, atomic rollback restores the target from pre-execution backups.

### Invariant 6: Multi-Agent Contradiction Preservation (Bảo Tồn Mâu Thuẫn Đa Tác Nhân)
Contradictory execution reports from multiple evaluating agents reject majority voting (`AGENT_COUNT != AUTHORITY_COUNT`) and immediately transition to `CONTRADICTED`, escalating to `SupervisorHumanGate`.

---

## 3. SUBSYSTEM COMPONENTS / CÁC THÀNH PHẦN HỆ THỐNG CON

### 3.1 `src/core/releaseExecution/releaseExecutionTypes.ts`
- **EN:** Canonical types, branded identifiers (`ReleaseExecutionId`), fail-closed state machines (`REQUESTED`, `REVIEW_PENDING`, `OWNER_APPROVED`, `AUTHORIZED`, `EXECUTING`, `VERIFYING`, `COMPLETED`), and `ReleaseExecutionError` hierarchy.
- **VI:** Các kiểu dữ liệu chuẩn tắc, định danh có thương hiệu (`ReleaseExecutionId`), máy trạng thái fail-closed và phân cấp lỗi `ReleaseExecutionError`.

### 3.2 `src/core/releaseExecution/releaseExecutionPolicyEngine.ts`
- **EN:** Fail-closed policy evaluator checking candidate validity, verification PASS state, target safety, path traversal guards, session/task bindings, `USER_STOP`, and `REVOCATION`.
- **VI:** Động cơ đánh giá chính sách fail-closed kiểm tra tính hợp lệ của ứng viên, trạng thái xác minh PASS, an toàn mục tiêu, chống duyệt đường dẫn, ràng buộc phiên/tác vụ, `USER_STOP` và `REVOCATION`.

### 3.3 `src/core/releaseExecution/releaseExecutionAuthorizationBridge.ts`
- **EN:** Bridges to canonical `WorldActionAuthorizationEngine` (`globalWorldActionAuth`) to issue and consume single-use, cryptographically bound tokens with anti-replay guarantees.
- **VI:** Cầu nối đến `WorldActionAuthorizationEngine` chuẩn tắc để cấp và tiêu thụ mã dùng một lần được liên kết mã hóa kèm bảo đảm chống phát lại.

### 3.4 `src/core/releaseExecution/releaseExecutionReviewBridge.ts`
- **EN:** Bridges to canonical `SupervisorHumanGate` (`globalSupervisorHumanGate`), enforces `AGENT != APPROVER` (rejecting self-approval), and distinguishes Master Owner approval.
- **VI:** Cầu nối đến `SupervisorHumanGate` chuẩn tắc, thực thi `AGENT != APPROVER` (từ chối tự phê duyệt) và phân biệt sự phê duyệt của Master Owner.

### 3.5 `src/core/releaseExecution/releaseExecutionManifestEngine.ts`
- **EN:** Scans target project directories and computes deterministic SHA-256 manifests to detect additions, removals, and modifications.
- **VI:** Quét thư mục dự án mục tiêu và tính toán bản kê khai SHA-256 tất định để phát hiện thêm, xóa và sửa đổi.

### 3.6 `src/core/releaseExecution/governedReleaseExecutionEngine.ts`
- **EN:** Governed mutation engine applying release files to authorized target roots with pre-execution atomic backups and zero shell execution.
- **VI:** Động cơ đột biến có quản trị áp dụng các tệp phát hành vào thư mục gốc mục tiêu được phép kèm theo sao lưu nguyên tử trước thực thi và không dùng shell.

### 3.7 `src/core/releaseExecution/releaseExecutionVerificationEngine.ts`
- **EN:** Post-execution verifier ensuring all expected release assets exist and verifying that the target manifest was properly updated.
- **VI:** Động cơ xác minh sau thực thi đảm bảo tất cả các tài sản phát hành dự kiến tồn tại và bản kê khai mục tiêu đã được cập nhật chính xác.

### 3.8 `src/core/releaseExecution/releaseExecutionRollbackEngine.ts`
- **EN:** Governed rollback engine that restores target state from atomic backups upon verification or mutation failure.
- **VI:** Động cơ hoàn tác có quản trị khôi phục trạng thái mục tiêu từ bản sao lưu nguyên tử khi xác minh hoặc đột biến thất bại.

### 3.9 `src/core/releaseExecution/releaseExecutionProvenanceEngine.ts`
- **EN:** Cryptographic provenance engine computing deterministic SHA-256 hashes for execution request, evidence, and result bundles.
- **VI:** Động cơ nguồn gốc mật mã tính toán các mã băm SHA-256 tất định cho gói yêu cầu thực thi, bằng chứng và kết quả.

### 3.10 `src/core/releaseExecution/releaseExecutionRuntime.ts`
- **EN:** Central coordinator unifying the full release execution lifecycle, multi-agent contradiction detection, and canonical `AuditLedger` event logging.
- **VI:** Điều phối viên trung tâm hợp nhất toàn bộ vòng đời thực thi phát hành, phát hiện mâu thuẫn đa tác nhân và ghi nhật ký sự kiện `AuditLedger` chuẩn tắc.

### 3.11 `src/core/releaseExecution/index.ts`
- **EN:** Public module exports providing unified access to all release execution types and runtime components.
- **VI:** Xuất khẩu mô-đun công khai cung cấp quyền truy cập thống nhất vào tất cả các kiểu dữ liệu và thành phần runtime thực thi phát hành.

---

## 4. VERIFICATION EVIDENCE & REALITY GATE / BẰNG CHỨNG XÁC MINH & CỔNG THỰC TẾ

- **Dedicated Reality Gate:** `tests/test_v4_agent_governed_release_execution.ts`
  - Categories verified: **A through AR (44 categories)**.
  - Result: **44 / 44 assertions PASSING** (0 failures).
- **Full Regression Suite:** `scratch/run_full_regression.mjs`
  - Suite 54: `tests/test_v4_agent_governed_release_execution.ts` registered.
  - Total suites: **54 / 54 PASSING** (exit code 0).
- **Typecheck & Build:**
  - `npm run typecheck` (0 errors).
  - `npm run build` (clean compilation).
  - `git diff --check` (0 whitespace errors).
- **Protected Workspace Invariant:**
  - `C:\BOW\shopofbow`: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0.
