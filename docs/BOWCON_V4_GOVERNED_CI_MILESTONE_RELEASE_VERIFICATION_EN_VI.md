# BOWCON V4.0 — MS-1.3.50: GOVERNED CONTINUOUS INTEGRATION & MILESTONE RELEASE VERIFICATION PIPELINE
# ĐƯỜNG ỐNG QUẢN TRỊ LIÊN TỤC (CI) & XÁC MINH PHÁT HÀNH CỘT MỐC CHO DỰ ÁN

---

## 1. ARCHITECTURAL TOPOLOGY & HIERARCHY / CẤU TRÚC VÀ PHÂN CẤP KIẾN TRÚC

### English
BOWCON V4.0 extends the verified MS-1.3.47 (governed sandbox and worktree isolation), MS-1.3.48 (controlled change promotion), and MS-1.3.49 (governed project build, test, and quality gates) foundations with an authoritative governed Continuous Integration and Milestone Release Verification subsystem.

The architecture enforces strict fail-closed governance:

> **MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS**  
> **OWNER_DECISION > BOWCON_RECOMMENDATION**  
> **USER_STOP > EVERYTHING_AUTONOMOUS**  
> **REVOCATION > AGENT_INTENT**  
> **TASK != AUTHORITY**  
> **SANDBOX != AUTHORITY**  
> **WORKTREE != AUTHORITY**  
> **BUILD != AUTHORITY**  
> **TEST != AUTHORITY**  
> **QUALITY_RESULT != AUTHORITY**  
> **QUALITY_REPORT != AUTHORIZATION**  
> **RELEASE_CANDIDATE != RELEASE**  
> **RELEASE_VERIFICATION != OWNER_APPROVAL**  
> **TECHNICAL_VERIFICATION != OWNER_APPROVAL**  
> **VERIFICATION_PASS != RELEASE_APPROVAL**  
> **AUDIT_HASH != AUTHORIZATION**  
> **AUTOMATION != OWNER_WILL**  
> **AGENT_COUNT != AUTHORITY_COUNT**

The Release Subsystem operates strictly below Master Owner and Canonical Human Gate authority. Even when all build tests, acceptance criteria, multi-agent cross checks, and quality gates evaluate to 100% PASS, the system produces an advisory `VERIFIED_READY_FOR_OWNER` verification packet. It **NEVER** self-approves, self-releases, or self-promotes to production without explicit Human Owner authorization.

```
MASTER OWNER (Human Authority)
      │
      ▼
SUPERVISOR / HUMAN GATE (SupervisorHumanGate)
      │
      ▼
CANONICAL AUTHORIZATION (WorldActionAuthorizationEngine)
      │
      ▼
GOVERNED RELEASE RUNTIME (ReleaseRuntime)
      ├── Release Policy Engine (ReleasePolicyEngine)
      ├── Release Candidate Engine (ReleaseCandidateEngine)
      ├── Release Acceptance Criteria Engine (ReleaseAcceptanceCriteriaEngine)
      ├── Release Contradiction Engine (ReleaseContradictionEngine)
      └── Governed Release Verification Pipeline (GovernedReleaseVerificationPipeline)
            │
            ├── Stage 1: Candidate Ingestion & Provenance Audit
            ├── Stage 2: Scope & Isolation Boundary Guard
            ├── Stage 3: Clean Isolated Build & Deterministic Hash
            ├── Stage 4: Comprehensive Test Matrix & Quality Gate Ingestion
            ├── Stage 5: Acceptance Criteria & Milestone Scope Audit
            ├── Stage 6: Multi-Agent Cross-Check & Contradiction Detection
            ├── Stage 7: Release Verification Packet & Audit Bundle Assembly
            └── Stage 8: Advisory Decision Formulation (Strictly Advisory)
            │
            ▼
ADVISORY RELEASE PACKET (ReleaseVerificationPacket: VERIFIED_READY_FOR_OWNER)
      │
      ▼
[EXPLICIT OWNER HUMAN APPROVAL REQUIRED FOR RELEASE / PROMOTION]
```

### Tiếng Việt
BOWCON V4.0 mở rộng các nền tảng đã được kiểm chứng và khóa chặt gồm MS-1.3.47 (cô lập sandbox và worktree), MS-1.3.48 (thúc đẩy thay đổi có kiểm soát), và MS-1.3.49 (đường ống build, kiểm thử và cổng chất lượng) với hệ thống con Quản trị Tích hợp Liên tục (CI) và Xác minh Phát hành Cột mốc.

Kiến trúc áp dụng cơ chế quản trị fail-closed (chặn an toàn khi có lỗi) nghiêm ngặt:
- **Xác minh kỹ thuật KHÔNG PHẢI là sự phê duyệt của chủ sở hữu** (`TECHNICAL_VERIFICATION != OWNER_APPROVAL`).
- **Ứng viên phát hành KHÔNG PHẢI là bản phát hành chính thức** (`RELEASE_CANDIDATE != RELEASE`).
- **Xác minh thành công KHÔNG CÓ NGHĨA là tự động phát hành** (`VERIFICATION_PASS != RELEASE_APPROVAL`).

Hệ thống Release Subsystem hoạt động hoàn toàn bên dưới thẩm quyền của Master Owner và Human Gate. Dù toàn bộ ma trận build, test, tiêu chí nghiệm thu và đối chiếu đa agent đạt 100%, hệ thống chỉ tạo ra gói bằng chứng cố vấn `VERIFIED_READY_FOR_OWNER`. Hệ thống **KHÔNG BAO GIỜ** tự động phê duyệt, tự phát hành hay đưa vào môi trường sản xuất nếu không có sự ủy quyền rõ ràng từ con người.

---

## 2. INVARIANTS & CORE ARCHITECTURAL PRINCIPLES / CÁC BẤT BIẾN & NGUYÊN TẮC CỐT LÕI

### Invariant 1: Fail-Closed Default (Mặc định Chặn An Toàn)
Any validation failure, missing cryptographic hash, missing acceptance evidence, contradiction across agents, or sandbox leakage halts the pipeline immediately and transitions state to `FAILED`, `REJECTED`, or `CONTRADICTED`. No release packet can ever reach `VERIFIED_READY_FOR_OWNER` with unresolved errors or contradictions.

### Invariant 2: Cryptographic Provenance & Tamper-Evidence (Truy Xuất Nguồn Gốc & Chống Giả Mạo Mã Hóa)
Every release candidate, worktree commit, quality evidence bundle, test artifact, and verification report is bound by SHA-256 cryptographic hashes. The final `ReleaseVerificationPacket` incorporates an aggregated audit hash covering candidate identity, source commit, quality evidence, criteria checklist, and contradiction analysis.

### Invariant 3: Clean Worktree Isolation (Cô Lập Tuyệt Đối Trên Worktree)
Release build and verification procedures must execute inside an ephemeral, governed worktree created via `WorktreeIsolationEngine`. Ambient repo contamination, working tree dirty state, or uncommitted edits strictly invalidate candidate ingestion.

### Invariant 4: No Direct Production Promotion / Self-Approval (Không Tự Ý Phát Hành)
`ReleaseVerificationState` explicitly contains no `APPROVED` or `PROMOTED` state. The highest state reachable by automation is `VERIFIED_READY_FOR_OWNER`. This permanently guarantees separation of technical verification from owner authorization.

### Invariant 5: Multi-Agent Contradiction Detection (Phát Hiện Mâu Thuẫn Đa Agent)
Independent agents or audit runs evaluating the same milestone candidate submit assertions. The `ReleaseContradictionEngine` detects conflicting pass/fail judgments, disparate hashes, regression disputes, or metric disparities, transitioning the state to `CONTRADICTED`.

---

## 3. SUBSYSTEM COMPONENTS & IMPLEMENTATION / CÁC THÀNH PHẦN HỆ THỐNG VÀ HIỆN THỰC

### 3.1 `src/core/release/releaseTypes.ts`
- **EN:** Defines core data models, enumerations, interfaces, and state machines for release candidate verification (`ReleaseCandidate`, `MilestoneAcceptanceCriteria`, `ReleaseVerificationState`, `ReleaseVerificationPacket`, `MultiAgentAssertion`, `ReleaseContradictionAnalysis`).
- **VI:** Định nghĩa các mô hình dữ liệu cốt lõi, enum, interface và máy trạng thái cho việc xác minh ứng viên phát hành.

### 3.2 `src/core/release/releasePolicyEngine.ts`
- **EN:** Enforces fail-closed validation rules on release targets, semantic versions, acceptance thresholds, required security scans, and mandatory clean git state.
- **VI:** Thi hành các quy tắc chính sách fail-closed đối với mục tiêu phát hành, phiên bản semver, ngưỡng nghiệm thu, quét bảo mật bắt buộc và trạng thái git sạch.

### 3.3 `src/core/release/releaseCandidateEngine.ts`
- **EN:** Manages release candidate registration, SHA-256 fingerprinting, immutable manifest snapshotting, and provenance binding.
- **VI:** Quản lý việc đăng ký ứng viên phát hành, băm định danh SHA-256, chụp snapshot manifest bất biến và ràng buộc nguồn gốc.

### 3.4 `src/core/release/releaseAcceptanceCriteriaEngine.ts`
- **EN:** Evaluates milestone acceptance criteria checklists (unit tests, coverage thresholds, performance budgets, documentation completeness) against quality evidence.
- **VI:** Đánh giá danh mục tiêu chí nghiệm thu cột mốc (kiểm thử đơn vị, ngưỡng bao phủ, ngân sách hiệu năng, tính hoàn chỉnh của tài liệu) so với bằng chứng chất lượng.

### 3.5 `src/core/release/releaseContradictionEngine.ts`
- **EN:** Ingests assertions from multiple evaluating agents and flags discrepancies in verification status, hash mismatches, regression disagreements, or severity conflicts.
- **VI:** Tiếp nhận khẳng định từ nhiều agent đánh giá và gắn cờ các sai lệch về trạng thái xác minh, không khớp băm, bất đồng hồi quy hoặc xung đột mức độ nghiêm trọng.

### 3.6 `src/core/release/releaseVerificationPipeline.ts`
- **EN:** Governed 8-stage verification pipeline orchestrating provenance audit, isolation boundaries, clean in-sandbox build, test matrix ingestion, criteria verification, multi-agent cross-checks, and audit packet assembly.
- **VI:** Đường ống xác minh 8 giai đoạn có quản trị điều phối kiểm toán nguồn gốc, ranh giới cô lập, build sạch trong sandbox, tiếp nhận ma trận test, xác minh tiêu chí, đối chiếu đa agent và đóng gói audit packet.

### 3.7 `src/core/release/releaseRuntime.ts`
- **EN:** Central coordinator unifying candidate registration, criteria management, verification pipeline execution, packet retrieval, and audit ledger persistence.
- **VI:** Điều phối viên trung tâm hợp nhất đăng ký ứng viên, quản lý tiêu chí, thực thi đường ống xác minh, truy xuất gói tin và lưu trữ sổ cái kiểm toán.

### 3.8 `src/core/release/index.ts`
- **EN:** Public module exports providing unified access to all types, engines, and runtime abstractions.
- **VI:** Export module công khai cung cấp quyền truy cập thống nhất vào tất cả các kiểu dữ liệu, engine và runtime.

---

## 4. VERIFICATION EVIDENCE & TEST COVERAGE / BẰNG CHỨNG XÁC MINH & BAO PHỦ KIỂM THỬ

- **Unit & Integration Suite:** `tests/test_v4_agent_governed_release_verification.ts`
  - **70/70 assertions PASSING**.
  - Covers candidate registration, tamper-evidence, provenance mismatch rejection, clean-worktree enforcement, acceptance criteria evaluation, multi-agent contradiction detection, full 8-stage pipeline, and runtime coordinator.
- **Full Regression Suite:** `scratch/run_full_regression.mjs`
  - **53/53 test suites PASSING** (including all MS-1.3.47, MS-1.3.48, MS-1.3.49, and MS-1.3.50 suites).
  - 0 type errors (`npm run typecheck`), clean compile (`npm run build`), 0 git diff whitespace issues (`git diff --check`).
- **Target Invariant:** Zero unauthorized access or writes to protected directories (`C:\BOW\shopofbow`).
