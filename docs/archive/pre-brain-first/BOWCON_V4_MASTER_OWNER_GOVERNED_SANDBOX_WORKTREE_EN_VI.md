# BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
# HỆ THỐNG SANDBOX DỰ ÁN TỰ TRỊ ĐƯỢC QUẢN TRỊ & CÔ LẬP WORKTREE CÓ KIỂM SOÁT

==================================================
DOCUMENTATION / TÀI LIỆU HƯỚNG DẪN KỸ THUẬT
BILINGUAL EDITION (ENGLISH - TIẾNG VIỆT)
==================================================

## 1. ARCHITECTURAL MISSION & OVERVIEW / SỨ MỆNH & TỔNG QUAN KIẾN TRÚC

### English
Milestone **MS-1.3.47** extends the verified and locked foundation of MS-1.3.35 through MS-1.3.46 with a **Governed Autonomous Project Sandbox & Controlled Worktree Isolation** subsystem.
The objective is to provide autonomous agents with a strictly bounded, isolated, and auditable workspace wherein governed tasks can create, modify, inspect, validate, and compute deterministic filesystem changes WITHOUT granting agents unrestricted filesystem access, shell execution, or ambient host authority.

Key architectural realities:
- **SANDBOX != AUTHORITY**: Creating or owning a sandbox grants zero external filesystem authority.
- **WORKTREE != AUTHORITY**: Worktrees are bounded child workspaces that cannot exceed the parent sandbox scope.
- **DIFF != AUTHORIZATION**: Generating a verifiable diff or manifest does NOT authorize exporting or committing changes to production.
- **VALIDATION != AUTHORIZATION**: Passing syntactic or integrity checks does NOT equate to Master Owner approval.
- **EVIDENCE != AUTHORITY**: Aggregating evidence or hashes does not create collective authority (`AGENT_COUNT != AUTHORITY_COUNT`).
- **PROTECTED WORKSPACE ISOLATION**: `C:\BOW\shopofbow` remains strictly untouched (`READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0`). Any access fails closed with `SECURITY_VIOLATION`.
- **USER_STOP SUPREMACY**: Immediate unconditional halt across all active and pending sandbox operations.

### Tiếng Việt
Cột mốc **MS-1.3.47** mở rộng nền tảng đã được xác minh và khóa từ MS-1.3.35 đến MS-1.3.46 với phân hệ **Sandbox Dự Án Tự Trị Được Quản Trị & Cô Lập Worktree Có Kiểm Soát**.
Mục tiêu là cung cấp cho các tác nhân tự trị một không gian làm việc bị giới hạn nghiêm ngặt, cô lập và có thể kiểm toán, nơi các tác vụ được quản trị có thể tạo, chỉnh sửa, kiểm tra, xác thực và tính toán các thay đổi hệ thống tệp tất định mà KHÔNG cấp cho tác nhân quyền truy cập hệ thống tệp không hạn chế, thực thi shell hoặc quyền hạn môi trường máy chủ.

Các nguyên lý kiến trúc cốt lõi:
- **SANDBOX != THẨM QUYỀN**: Việc tạo hoặc sở hữu sandbox không cấp bất kỳ quyền hạn hệ thống tệp bên ngoài nào.
- **WORKTREE != THẨM QUYỀN**: Worktree là các không gian con có giới hạn và không bao giờ được mở rộng vượt quá phạm vi của sandbox cha.
- **DIFF != CẤP PHÉP**: Việc tạo diff hoặc bản kê khai (manifest) có thể kiểm chứng KHÔNG đồng nghĩa với việc cho phép xuất hoặc commit các thay đổi vào sản xuất.
- **XÁC THỰC != CẤP PHÉP**: Vượt qua các kiểm tra cú pháp hoặc tính toàn vẹn không đồng nghĩa với việc Master Owner phê duyệt.
- **BẰNG CHỨNG != THẨM QUYỀN**: Việc tổng hợp bằng chứng hoặc mã băm không tạo ra quyền lực tập thể (`AGENT_COUNT != AUTHORITY_COUNT`).
- **CÔ LẬP KHÔNG GIAN ĐƯỢC BẢO VỆ**: `C:\BOW\shopofbow` được bảo vệ tuyệt đối (`READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0`). Mọi nỗ lực truy cập đều bị từ chối ngay lập tức với `SECURITY_VIOLATION`.
- **TỐI THƯỢNG CỦA USER_STOP**: Dừng khẩn cấp vô điều kiện ngay lập tức trên mọi thao tác sandbox đang hoạt động hoặc chờ xử lý.

---

## 2. CANONICAL INVARIANTS & SECURITY MODEL / CÁC TIÊN ĐỀ BẤT BIẾN & MÔ HÌNH BẢO MẬT

```
AGENT_REQUEST
    ↓
SESSION VALIDATION (Session matching, cross-session rejection)
    ↓
TASK VALIDATION (Task binding check)
    ↓
DELEGATION VALIDATION (Parent delegation active & unrevoked)
    ↓
CAPABILITY VALIDATION (Capability lease valid, unexpired, unrevoked)
    ↓
SANDBOX POLICY (Allowed operations, file limits, extension rules)
    ↓
PATH GUARD (Containment check, traversal rejection, protected workspace guard)
    ↓
CONTROLLED FILESYSTEM OPERATION (Create, Read, Update, Rename, Delete, List, Stat)
    ↓
MANIFEST ENGINE (Deterministic SHA-256 manifest over sandbox files)
    ↓
DIFF ENGINE (Cryptographic change set generation: ADDED, MODIFIED, DELETED, RENAMED)
    ↓
EVIDENCE ENGINE (Artifact evidence binding, provenance records)
    ↓
SUPERVISORY REVIEW (Canonical SupervisorHumanGate review; VERIFIED != OWNER_APPROVED)
    ↓
OWNER APPROVAL WHEN REQUIRED (Explicit Master Owner authorization)
    ↓
CONTROLLED EXPORT (Governed promotion to authorized project destination; Audit logged)
```

### Path Security Invariants / Các Bất Biến Về An Toàn Đường Dẫn
1. **Canonical Normalization**: All paths are resolved and normalized using deterministic POSIX style separators internally.
2. **Traversal Rejection**: Sequences such as `../`, `..\\`, encoded `%2e%2e`, `%2f`, `%5c`, and null bytes `\0` are rejected fail-closed.
3. **Absolute Path Rejection**: Agent-supplied paths must be relative; absolute paths (e.g. `C:\`, `/etc/`) or UNC paths (`\\server\share`) are rejected.
4. **Symlink Escape Detection**: Symlinks or junctions pointing outside the sandbox boundary are detected and rejected.
5. **Protected Workspace Rejection**: Any path mentioning or resolving to `C:\BOW\shopofbow` triggers an immediate `SECURITY_VIOLATION`.
6. **Cross-Session Path Rejection**: Paths cannot access other session workspaces or cross-sandbox boundaries.

---

## 3. COMPONENT ARCHITECTURE / KIẾN TRÚC THÀNH PHẦN

### 1. `sandboxTypes.ts`
- **EN**: Provides canonical types, branded IDs (`SandboxId`, `WorktreeId`), states (`CREATED`, `INITIALIZED`, `ACTIVE`, `MODIFICATION_PENDING`, `VALIDATING`, `REVIEW_PENDING`, `APPROVED`, `EXPORTED`, `ROLLED_BACK`, `DISCARDED`, `REJECTED`, `EXPIRED`, `REVOKED`, `BLOCKED`, `INTERRUPTED`), scopes, and change records.
- **VI**: Cung cấp các định kiểu chuẩn tắc, định danh thương hiệu (`SandboxId`, `WorktreeId`), trạng thái vòng đời, phạm vi và bản ghi thay đổi.

### 2. `sandboxPathGuard.ts`
- **EN**: Path containment, traversal rejection, normalization, UNC/device rejection, and protected workspace guard (`C:\BOW\shopofbow`).
- **VI**: Kiểm tra bao chứa đường dẫn, từ chối duyệt ngược thư mục, chuẩn hóa, từ chối đường dẫn UNC/thiết bị và bảo vệ không gian làm việc được bảo vệ.

### 3. `sandboxPolicyEngine.ts`
- **EN**: Evaluates operations against session binding, task binding, delegation status, capability leases, allowed operations, extensions, quotas, and USER_STOP.
- **VI**: Đánh giá thao tác dựa trên phiên, tác vụ, trạng thái ủy quyền, hợp đồng thuê năng lực, danh mục thao tác được phép, đuôi tệp, hạn ngạch và USER_STOP.

### 4. `governedSandboxManager.ts`
- **EN**: Manages sandbox lifecycle, isolated directory creation under `data/sandboxes/<sandboxId>`, state transitions, emergency freeze, and revocation propagation.
- **VI**: Quản lý vòng đời sandbox, tạo thư mục cô lập tại `data/sandboxes/<sandboxId>`, chuyển đổi trạng thái, đóng băng khẩn cấp và lan truyền thu hồi.

### 5. `sandboxFilesystemEngine.ts`
- **EN**: Governed filesystem operations (`createFile`, `readFile`, `updateFile`, `renameFile`, `deleteFile`, `listFiles`, `statFile`), credential scrubbing, and staging map tracking.
- **VI**: Các thao tác hệ thống tệp có kiểm soát, thanh lọc thông tin xác thực nhạy cảm và theo dõi sơ đồ thay đổi chuyển tiếp (staging map).

### 6. `worktreeIsolationEngine.ts`
- **EN**: Manages isolated sub-worktrees within the sandbox boundary; strictly verifies `WORKTREE_SCOPE_CANNOT_EXCEED_SANDBOX`.
- **VI**: Quản lý các worktree con cô lập bên trong ranh giới sandbox; thực thi nghiêm ngặt việc phạm vi worktree không vượt quá sandbox cha.

### 7. `sandboxManifestEngine.ts`
- **EN**: Computes deterministic filesystem manifests containing relative paths, entry types, sizes, mtimes, and SHA-256 hashes.
- **VI**: Tính toán bản kê khai hệ thống tệp tất định chứa đường dẫn tương đối, kiểu mục, kích thước, thời gian mtime và mã băm SHA-256.

### 8. `sandboxDiffEngine.ts`
- **EN**: Computes deterministic change sets between base and target manifests (`ADDED`, `MODIFIED`, `DELETED`, `RENAMED`) with SHA-256 `diffHash`.
- **VI**: Tính toán tập thay đổi tất định giữa bản kê khai gốc và đích với mã băm SHA-256 `diffHash`.

### 9. `sandboxRollbackEngine.ts`
- **EN**: Restores sandbox to base state or rolls back selected changes, respecting USER_STOP, revocation, and session isolation.
- **VI**: Khôi phục sandbox về trạng thái ban đầu hoặc hoàn tác các thay đổi được chọn, tuân thủ USER_STOP, thu hồi và cô lập phiên.

### 10. `sandboxReviewEngine.ts`
- **EN**: Conducts supervisory reviews pre-export, enforces `VERIFIED != OWNER_APPROVED`, rejects self-approvals, and interfaces with `SupervisorHumanGate`.
- **VI**: Thực hiện đánh giá giám sát trước khi xuất, thực thi `VERIFIED != OWNER_APPROVED`, từ chối tự phê duyệt và giao tiếp với `SupervisorHumanGate`.

### 11. `sandboxExportEngine.ts`
- **EN**: Governed export of validated changes to authorized project root targets (strictly guarded against `C:\BOW\shopofbow`), logging to `AuditLedger`.
- **VI**: Xuất có quản trị các thay đổi đã xác thực tới thư mục dự án đích được phép (bảo vệ nghiêm ngặt chống `C:\BOW\shopofbow`), ghi vào `AuditLedger`.

### 12. `sandboxRuntime.ts`
- **EN**: Unified coordinator connecting all 11 sandbox engines, audit logging, and global USER_STOP controls.
- **VI**: Điều phối viên thống nhất kết nối tất cả 11 động cơ sandbox, ghi nhật ký kiểm toán và kiểm soát USER_STOP toàn cục.

---

## 4. VERIFICATION EVIDENCE / BẰNG CHỨNG XÁC MINH THỰC TẾ

The dedicated Reality Gate test suite (`tests/test_v4_agent_governed_sandbox_worktree_isolation.ts`) executes 49 test categories (A through AW) with **79 deterministic assertions**:
- **Category A**: Master Owner Authority
- **Category B**: BOW Identity
- **Category C**: BOWCON Identity
- **Category D**: Agent Identity Separation (`AGENT != MASTER_OWNER`)
- **Category E**: Governed Sandbox Creation
- **Category F**: Governed Sandbox Lifecycle State Machine
- **Category G**: Session Binding
- **Category H**: Task Binding
- **Category I**: Delegation Binding
- **Category J**: Capability Lease Binding
- **Category K**: Sandbox Root Path Containment
- **Category L**: Path Traversal Rejection (`../`, `%2e%2e`, `\0`)
- **Category M**: Absolute Path Rejection
- **Category N**: Symlink/Junction Escape Rejection
- **Category O**: Protected Workspace Rejection (`C:\BOW\shopofbow`)
- **Category P**: Cross-Session Sandbox Access Rejection
- **Category Q**: Cross-Sandbox Path Access Rejection
- **Category R**: Controlled File Creation
- **Category S**: Controlled File Modification
- **Category T**: Controlled File Rename
- **Category U**: Controlled File Deletion
- **Category V**: Deterministic Manifest Generation
- **Category W**: Manifest SHA-256 Hash Integrity
- **Category X**: Deterministic Diff Generation
- **Category Y**: Diff Cryptographic Integrity
- **Category Z**: Sandbox Change Rollback
- **Category AA**: Worktree Isolation Under Sandbox Root
- **Category AB**: Worktree Scope Containment
- **Category AC**: Universal USER_STOP Supremacy
- **Category AD**: Revocation Supremacy
- **Category AE**: Expiration Enforcement
- **Category AF**: Evidence Generation
- **Category AG**: Evidence Provenance Tracking
- **Category AH**: Evidence Cryptographic Integrity
- **Category AI**: Contradiction Preservation
- **Category AJ**: No Collective Authority (`AGENT_COUNT != AUTHORITY_COUNT`)
- **Category AK**: Supervisory Review Separation
- **Category AL**: HumanGate Integration
- **Category AM**: WorldActionAuthorization Reuse
- **Category AN**: No Duplicate Authority Systems
- **Category AO**: No Duplicate Token Stores
- **Category AP**: No Duplicate Audit Ledgers
- **Category AQ**: Zero Unrestricted Shell Execution (`eval`, `new Function`, `execSync`)
- **Category AR**: Credential Persistence Rejection
- **Category AS**: Corrupted State Rejection
- **Category AT**: Restart Reconstruction & Persistence
- **Category AU**: Governed Export to Authorized Target
- **Category AV**: Protected Workspace Isolation During Export
- **Category AW**: End-to-End Governed Lifecycle
