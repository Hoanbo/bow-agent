# BOWCON V4.0 - MS-1.3.45
# MASTER OWNER DELEGATION GOVERNANCE, MULTI-AGENT FEDERATION & AUTHORITY LEASE ARCHITECTURE
# Bilingual Architectural Specification: English / Tiếng Việt

---

## ENGLISH

### 1. Master Architectural Hierarchy & Delegation Constraints

BOWCON exists exclusively within the Master Owner's canonical governance hierarchy:

```
MASTER_OWNER_AUTHORITY (Supreme Authority)
        ↓
       BOW
        ↓
      BOWCON
        ↓
PROJECTS / OPTIONAL INTEGRATIONS (e.g., ShopOfBow)
```

**Core Delegation Invariants:**
- `MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS`
- `OWNER_DECISION > BOWCON_RECOMMENDATION`
- `USER_STOP > EVERYTHING_AUTONOMOUS`
- `DELEGATION != AUTHORITY`
- `RECOMMENDATION != EXECUTION`
- `LEARNING != AUTHORIZATION`
- `PREDICTION != FACT`
- `INFERENCE != FACT`
- `MEMORY != TRUTH`
- `SELF_REFLECTION != AUTHORITY`
- `AGENT != MASTER_OWNER`
- `DEVICE != MASTER_OWNER`
- `DELEGATED_AUTHORITY <= OWNER_GRANTED_SCOPE`
- `CHILD_DELEGATION_SCOPE <= PARENT_DELEGATION_SCOPE`
- `CHILD_CAPABILITIES ⊆ PARENT_CAPABILITIES`
- `CHILD_EXPIRATION <= PARENT_EXPIRATION`
- `CHILD_CONSTRAINTS ⊇ PARENT_CONSTRAINTS`
- `REVOCATION > AGENT_INTENT`
- `CAPABILITY != AUTHORIZATION`

**Protected Workspace Guard:**
- Target: `C:\BOW\shopofbow`
- READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0.
- All direct, delegated, and child-delegated attempts to target this workspace fail closed with `SECURITY_VIOLATION`.

---

### 2. Delegation Subsystem Architecture (`src/core/delegation/`)

MS-1.3.45 introduces the governed delegation layer for multi-agent and federated device coordination:

#### A. Delegation Scope & Constraint Validation (`DelegationScopeValidator`)
- **File:** `src/core/delegation/delegationScopeValidator.ts`
- **Scope Containment:** Verifies that a delegated scope never exceeds the Master Owner grant, and that any sub-delegation to child agents satisfies:
  - `child.maxScopePercentage <= parent.maxScopePercentage`
  - `child.allowedCapabilities ⊆ parent.allowedCapabilities`
  - `child.expiresAt <= parent.expiresAt`
  - `child.currentDepth = parent.currentDepth + 1 <= parent.maxChildDelegationDepth`
  - `parent.allowSubDelegation === true`
- **Path Guard:** Rejects any target path matching `shopofbow` or `C:\BOW\shopofbow`.

#### B. Governed Agent Identity (`AgentIdentityManager`)
- **File:** `src/core/delegation/agentIdentityManager.ts`
- **Agent Separation:** Strictly enforces `AGENT_ID != MASTER_OWNER_ID`. No agent may register with Master Owner identifiers or aliases (`master_operator`, `boss_user`, `operator`, etc.).
- **Session Bounded:** Agents are registered within and bound to explicit sessions.

#### C. Federated Device Registry (`FederatedDeviceRegistry`)
- **File:** `src/core/delegation/federatedDeviceRegistry.ts`
- **Device Separation:** Enforces `DEVICE_ID != MASTER_OWNER_ID` and `DEVICE_TRUST != EXECUTION_AUTHORITY`.
- **Trust Lifecycle:** `UNREGISTERED` → `REGISTERED` → `TRUST_PENDING` → `TRUSTED` → `SUSPENDED` → `REVOKED`. Only Master Owner authority can promote a device to `TRUSTED`.

#### D. Capability Lease Management (`CapabilityLeaseManager`)
- **File:** `src/core/delegation/capabilityLeaseManager.ts`
- **Purpose:** Issues scoped, time-bounded, revocable capability leases tied to active delegations.
- **Principle:** `CAPABILITY != AUTHORIZATION`. A lease grants permission within a bounded scope, but executing mutating actions still requires canonical `WorldActionAuthorization` tokens and `HumanGate` approval where required.
- **Revocation Supremacy:** Revoking a lease terminates validity immediately in-memory without requiring process restarts.

#### E. Durable Delegation State Persistence (`DurableDelegationStore`)
- **File:** `src/core/delegation/durableDelegationStore.ts`
- **Restart Safety:** Persists delegations and active leases with schema version `v4.0.0` and SHA-256 integrity hash verification.
- **Strict Non-Persistence:** NEVER persists credentials, secrets, execution tokens, or temporary HumanGate approvals. Expired authorizations never revive upon restart.
- **Fail-Closed:** Corrupted files or mismatched checksums are rejected and fail closed.

#### F. Delegation Governance Runtime (`DelegationGovernanceRuntime`)
- **File:** `src/core/delegation/delegationGovernanceRuntime.ts`
- **State Machine:** Governs transitions: `REQUESTED` → `PENDING_AUTHORIZATION` → `AUTHORIZED` → `ACTIVE` → `COMPLETED` (or `REVOKED` / `EXPIRED`).
- **USER_STOP Supremacy:** Active `USER_STOP` unconditionally halts all delegation requests, authorizations, activations, child delegations, and lease issuances.
- **Replay Protection:** Unique delegation IDs prevent reuse of expired, revoked, or completed delegations.
- **Audit Integration:** All lifecycle transitions record to the canonical `AuditLedger`.

---

### 3. Future Distributed Execution Boundary

> [!IMPORTANT]
> MS-1.3.45 establishes the **governance and contract layer only**. It does NOT implement unrestricted SSH execution, remote shell execution, arbitrary RPC execution, or autonomous agent-to-agent command dispatch. All execution remains governed by the canonical local runtimes (`MasterHumanAuthority`, `HumanGate`, `WorldActionAuthorization`).

---

## TIẾNG VIỆT

### 1. Phân Cấp Kiến Trúc Chuẩn & Ràng Buộc Ủy Quyền

BOWCON tồn tại độc quyền trong hệ phân cấp quản trị chuẩn mực của Master Owner:

```
MASTER_OWNER_AUTHORITY (Quyền Hạn Tối Cao Của Chủ Sở Hữu)
        ↓
       BOW
        ↓
      BOWCON
        ↓
CÁC DỰ ÁN / TÍCH HỢP TÙY CHỌN (ví dụ: ShopOfBow)
```

**Bất Biến Ủy Quyền Cốt Lõi:**
- `QUYEN_CHU_SO_HUU > BOW > BOWCON > DU_AN`
- `QUYET_DINH_CHU_SO_HUU > DE_XUAT_BOWCON`
- `DUNG_NGUOI_DUNG > MOI_HOAT_DONG_TU_DONG`
- `UY_QUYEN != THAM_QUYEN`
- `AGENT != MASTER_OWNER`
- `THIET_BI != MASTER_OWNER`
- `THAM_QUYEN_UY_QUYEN <= PHAM_VI_CHU_SO_HUU_CAP`
- `PHAM_VI_CON <= PHAM_VI_CHA`
- `NANG_LUC_CON ⊆ NANG_LUC_CHA`
- `THOI_HAN_CON <= THOI_HAN_CHA`
- `THU_HOI > Y_DINH_AGENT` (Khi bị thu hồi, quyền lập tức chấm dứt; agent không thể tiếp tục).
- `NANG_LUC != UY_QUYEN_THI_HANH`

**Bảo Vệ Vùng Làm Việc ShopOfBow:**
- Mục tiêu: `C:\BOW\shopofbow`
- ĐỌC = 0, GHI = 0, IMPORT = 0, CHẠM = 0.
- Mọi nỗ lực nhắm vào đường dẫn này (trực tiếp, ủy quyền hay ủy quyền con) đều bị chặn ngay lập tức với lỗi `SECURITY_VIOLATION`.

---

### 2. Kiến Trúc Phân Hệ Ủy Quyền (`src/core/delegation/`)

#### A. Kiểm Tra Phạm Vi & Ràng Buộc (`DelegationScopeValidator`)
- **Tập tin:** `src/core/delegation/delegationScopeValidator.ts`
- Đảm bảo tính đóng kín của phạm vi ủy quyền: phạm vi của agent con không bao giờ vượt quá tỷ lệ phần trăm, danh mục năng lực hay thời hạn của ủy quyền cha; kiểm tra độ sâu ủy quyền và cấm tuyệt đối các đường dẫn đến `shopofbow`.

#### B. Định Danh Agent Có Kiểm Soát (`AgentIdentityManager`)
- **Tập tin:** `src/core/delegation/agentIdentityManager.ts`
- Ngăn chặn hoàn toàn việc agent mạo danh Master Owner (`agentId != MASTER_OWNER_ID` và không trùng các bí danh như `master_operator`, `boss_user`,...).

#### C. Sổ Đăng Ký Thiết Bị Liên Hợp (`FederatedDeviceRegistry`)
- **Tập tin:** `src/core/delegation/federatedDeviceRegistry.ts`
- Quản lý trạng thái tin cậy của thiết bị (`UNREGISTERED` → `REGISTERED` → `TRUST_PENDING` → `TRUSTED` → `SUSPENDED` → `REVOKED`).
- Bất biến: Độ tin cậy của thiết bị KHÔNG ĐỒNG NGHĨA với quyền thực thi (`DEVICE_TRUST != EXECUTION_AUTHORITY`). Chỉ có Master Owner mới có quyền nâng cấp thiết bị lên `TRUSTED`.

#### D. Quản Lý Hạn Ngạch Năng Lực (`CapabilityLeaseManager`)
- **Tập tin:** `src/core/delegation/capabilityLeaseManager.ts`
- Cấp phát các hạn ngạch năng lực có giới hạn thời gian, có phạm vi cụ thể và có thể thu hồi tức thì trong bộ nhớ (`REVOCATION > AGENT_INTENT`).

#### E. Lưu Trữ Bền Vững Trạng Thái Ủy Quyền (`DurableDelegationStore`)
- **Tập tin:** `src/core/delegation/durableDelegationStore.ts`
- Lưu trữ bền vững qua các lần khởi động lại với mã băm toàn vẹn SHA-256. Tuyệt đối không lưu mật khẩu, token bí mật hay phê duyệt tạm thời của HumanGate. Trạng thái hỏng hóc sẽ bị từ chối theo nguyên tắc fail-closed.

#### F. Runtime Quản Trị Ủy Quyền (`DelegationGovernanceRuntime`)
- **Tập tin:** `src/core/delegation/delegationGovernanceRuntime.ts`
- Điều phối toàn bộ vòng đời ủy quyền, tích hợp cơ chế dừng khẩn cấp `USER_STOP`, chống phát lại (replay protection) và ghi nhận toàn bộ sự kiện vào `AuditLedger` chuẩn mực.

---

### 3. Ranh Giới Thi Hành Phân Tán Tương Lai

> [!IMPORTANT]
> MS-1.3.45 chỉ thiết lập **lớp hợp đồng quản trị và liên hợp**. Milestone này KHÔNG triển khai việc thực thi từ xa qua SSH, shell từ xa, gọi hàm từ xa tùy ý hay lệnh agent-to-agent tự phát. Mọi thao tác thực thi vẫn hoàn toàn phụ thuộc vào các runtime chuẩn mực tại máy cục bộ (`MasterHumanAuthority`, `HumanGate`, `WorldActionAuthorization`).
