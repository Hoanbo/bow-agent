# BOWCON V4.0 — MS-1.3.46
# MASTER OWNER MULTI-AGENT TASK ORCHESTRATION & DISTRIBUTED EVIDENCE VERIFICATION
# Tài liệu song ngữ / Bilingual Documentation (EN | VI)

---

## ENGLISH

### 1. Executive Overview

MS-1.3.46 builds directly on the foundational delegation and federation architecture established in MS-1.3.45. It introduces a governed multi-agent task orchestration, verifiable artifact handoff, and cryptographic evidence verification layer to the BOWCON Core Personal Cognitive Operating System.

The primary mission is to coordinate complex, multi-stage workflows across multiple governed agents and federated devices without ever granting collective authority, without introducing unrestricted remote execution, and without diluting the absolute supremacy of the Master Owner.

```
MASTER OWNER
      │
MASTER HUMAN AUTHORITY
      │
SUPERVISOR / HUMAN GATE
      │
DELEGATION GOVERNANCE (MS-1.3.45)
      │
TASK ORCHESTRATION (MS-1.3.46)
      │
AGENT TASKS & EVIDENCE
      │
CRYPTOGRAPHIC VERIFICATION & CONTRADICTION PRESERVATION
      │
ADVISORY OUTCOME
```

### 2. Absolute Architectural Invariants

```
MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS / OPTIONAL INTEGRATIONS

OWNER_DECISION       > BOWCON_RECOMMENDATION
USER_STOP            > EVERYTHING_AUTONOMOUS
REVOCATION           > AGENT_INTENT

DELEGATION           != AUTHORITY
DELEGATION           != EXECUTION
CAPABILITY           != AUTHORIZATION

AGENT                != MASTER_OWNER
DEVICE               != MASTER_OWNER
DEVICE_TRUST         != EXECUTION_AUTHORITY

LEARNING             != AUTHORIZATION
LEARNING             != EXECUTION
PREDICTION           != FACT
INFERENCE            != FACT
MEMORY               != TRUTH

EVIDENCE             != AUTHORITY
VERIFICATION         != AUTHORIZATION
TASK_COMPLETION      != OWNER_APPROVAL
SUB_AGENT_RESULT     != FACT

AGENT_COUNT          != AUTHORITY_COUNT (No collective authority; consensus != authority)
PROTECTED WORKSPACE  : C:\BOW\shopofbow -> READS=0, WRITES=0, IMPORTS=0, TOUCHES=0
```

### 3. Core Subsystem Components

1. **`taskOrchestrationTypes.ts`**:
   Canonical type contracts for `TaskId`, `TaskGroupId`, `TaskExecutionState` (15 strictly advisory states), `TaskDependency`, `TaskAssignment`, `TaskArtifact`, `EvidenceRecord`, `EvidenceBundle`, `EvidenceVerificationResult`, `TaskContradiction`, and `TaskReviewState`.
2. **`taskDependencyEngine.ts`**:
   Validates directed acyclic dependency graphs, detects self-referential or mutual cycles (`TASK_DEPENDENCY_CYCLE`), enforces session boundaries, and propagates failed or interrupted dependencies fail-closed (`TASK_DEPENDENCY_FAILED` $\to$ `BLOCKED`).
3. **`artifactEvidenceEngine.ts`**:
   Governs artifact creation, calculates deterministic SHA-256 integrity hashes, scrubs sensitive credentials/tokens (`FORBIDDEN_CREDENTIAL_PERSISTENCE`), and strictly isolates protected workspaces.
4. **`evidenceVerificationEngine.ts`**:
   Cryptographically and epistemically evaluates evidence records, confirms task and agent bindings, verifies SHA-256 checksums, and detects contradictions across agents without auto-resolving them.
5. **`evidenceAggregationEngine.ts`**:
   Bundles multi-agent evidence into an immutable `EvidenceBundle` with a deterministic integrity hash (`SHA-256(sorted constituent hashes)`). Evaluates bundle epistemic states (`EVIDENCE_VERIFIED`, `EVIDENCE_CONTRADICTED`, `EVIDENCE_INCOMPLETE`, `EVIDENCE_REJECTED`).
6. **`taskReviewEngine.ts`**:
   Enforces supervisory review before task completion. Enforces `VERIFIED != OWNER_APPROVED`, rejects agent self-approval (`SELF_APPROVAL_REJECTED`), and reuses canonical `globalSupervisorHumanGate` and `globalWorldActionAuth` when human authorization is required.
7. **`governedTaskOrchestrator.ts`**:
   Coordinates task group and task lifecycles, validates agent registrations against `AgentIdentityManager`, verifies delegation scopes against `DelegationGovernanceRuntime`, and enforces `DELEGATED_AUTHORITY <= OWNER_GRANTED_SCOPE`.
8. **`orchestrationRuntime.ts`**:
   Authoritative coordinator for the entire orchestration flow, enforcing `USER_STOP` supremacy and logging all governance events into the append-only cryptographic `AuditLedger`.

### 4. Contradiction & Multi-Agent Governance Model

When multiple agents evaluate the same problem or execute cross-check tasks and return divergent claims:
- **No Majority Voting**: Consensus does not constitute fact or authority.
- **Explicit Preservation**: A `TaskContradiction` record is created containing full provenance from both sources (`sourceA` and `sourceB`).
- **Epistemic Classification**: The resulting bundle is categorized as `EVIDENCE_CONTRADICTED`, visible to the supervisor and Master Owner.

### 5. Protected Workspace & Security Invariants

- **`C:\BOW\shopofbow`**: Zero reads, zero writes, zero imports, zero touches. Any task or artifact attempting to target this path fails closed with `SECURITY_VIOLATION`.
- **Security Boundaries**: `eval( = 0`, `new Function( = 0`, `execSync( = 0` in all production orchestration modules. No unrestricted remote shells, no SSH, no arbitrary RPC.

---

## TIẾNG VIỆT

### 1. Tổng quan Điều hành

MS-1.3.46 phát triển trực tiếp trên nền tảng quản trị ủy quyền và liên kết đã được khóa trong MS-1.3.45. Cột mốc này bổ sung tầng điều phối tác vụ đa tác tử có quản trị, bàn giao hiện vật có thể kiểm chứng, và xác minh bằng chứng mật mã cho Hệ điều hành Nhận thức Cá nhân BOWCON.

Mục tiêu cốt lõi là điều phối các luồng công việc phức tạp nhiều giai đoạn qua nhiều agent và thiết bị liên kết mà tuyệt đối không tạo ra thẩm quyền tập thể, không mở thực thi từ xa không kiểm soát, và duy trì quyền tối thượng tuyệt đối của Chủ sở hữu Tối cao (Master Owner).

### 2. Các Bất biến Kiến trúc Bắt buộc

- `MASTER_OWNER_AUTHORITY > BOW > BOWCON > CÁC DỰ ÁN`
- `QUYẾT ĐỊNH CỦA CHỦ > ĐỀ XUẤT CỦA BOWCON`
- `USER_STOP > MỌI HOẠT ĐỘNG TỰ ĐỘNG`
- `THU HỒI > Ý ĐỊNH CỦA TÁC TỬ`
- `ỦY QUYỀN != THẨM QUYỀN` & `ỦY QUYỀN != THỰC THI`
- `NĂNG LỰC != ỦY THÁC`
- `TÁC TỬ != CHỦ SỞ HỮU` & `THIẾT BỊ != CHỦ SỞ HỮU`
- `ĐỘ TIN CẬY THIẾT BỊ != THẨM QUYỀN THỰC THI`
- `BẰNG CHỨNG != THẨM QUYỀN`
- `XÁC MINH != ỦY QUYỀN`
- `HOÀN THÀNH TÁC VỤ != CHỦ SỞ HỮU PHÊ DUYỆT`
- `KẾT QUẢ TÁC TỬ CON != SỰ THẬT`
- `SỐ LƯỢNG TÁC TỬ != SỐ LƯỢNG THẨM QUYỀN` (Không có thẩm quyền tập thể; biểu quyết không tạo ra thẩm quyền)
- `C:\BOW\shopofbow`: ĐỌC = 0, GHI = 0, IMPORT = 0, CHẠM = 0

### 3. Các Thành phần Cốt lõi

1. **`taskOrchestrationTypes.ts`**: Hợp đồng kiểu chuẩn cho tác vụ, hiện vật, bằng chứng, mâu thuẫn, và trạng thái rà soát.
2. **`taskDependencyEngine.ts`**: Động cơ phụ thuộc tác vụ, phát hiện và chặn đứt chu trình phụ thuộc vòng kín (`TASK_DEPENDENCY_CYCLE`), cô lập phiên và truyền lan lỗi.
3. **`artifactEvidenceEngine.ts`**: Động cơ quản trị hiện vật tác vụ, băm SHA-256 xác thực, loại trừ triệt để lưu trữ token/chứng thư nhạy cảm, bảo vệ vùng workspace cách ly.
4. **`evidenceVerificationEngine.ts`**: Động cơ xác minh bằng chứng mật mã, phát hiện và bảo toàn bất biến các mâu thuẫn kết quả giữa các tác tử mà không biểu quyết xóa bỏ.
5. **`evidenceAggregationEngine.ts`**: Động cơ gom nhóm bằng chứng thành các `EvidenceBundle` có mã băm toàn vẹn tất định, đánh giá trạng thái nhận thức.
6. **`taskReviewEngine.ts`**: Động cơ rà soát giám sát, tách bạch hoàn toàn giữa `VERIFIED` và `OWNER_APPROVED`, tái sử dụng cổng HumanGate chuẩn của hệ thống, cấm tác tử tự phê duyệt.
7. **`governedTaskOrchestrator.ts`**: Quản lý vòng đời nhóm tác vụ và tác vụ cá nhân, ràng buộc chặt chẽ với phạm vi ủy quyền của MS-1.3.45.
8. **`orchestrationRuntime.ts`**: Tầng điều phối thống nhất toàn bộ quy trình, áp đặt quyền tối cao của `USER_STOP` và ghi sổ cái kiểm toán bất biến `AuditLedger`.
