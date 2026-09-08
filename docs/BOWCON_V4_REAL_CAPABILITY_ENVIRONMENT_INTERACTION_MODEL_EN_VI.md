# BOWCON V4.0 — REAL CAPABILITY & ENVIRONMENT INTERACTION RUNTIME MODEL (EN / VI)
# MÔ HÌNH RUNTIME TƯƠNG TÁC MÔI TRƯỜNG & NĂNG LỰC THỰC BOWCON V4.0

**Milestone:** MS-1.3.34  
**Package:** `@bow/agent@4.0.0` (STRICT VERSION LOCK)  
**Execution Workspace:** `C:\Users\MSI_dualXeon\Desktop\BOW\bow-agent`  
**Protected Workspace:** `C:\BOW\shopofbow` (**READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0**)  
**Standards Compliance:** ISO/IEC 42001, ISO/IEC 23894, NIST AI RMF, OWASP Agent Security Standards  

---

## 1. Executive Summary / Tóm tắt Cấp cao

### English
Milestone **MS-1.3.34** establishes the **Real Capability & Environment Interaction Runtime** of BOWCON V4.0. Prior milestones created cognitive reasoning (MS-1.3.32) and physical host mutation mechanisms (MS-1.3.33). MS-1.3.34 unifies these into an environment-aware, self-discovering capability registry that answers the foundational operational question:
$$\text{"What can BOWCON actually do on this specific machine, under what permissions, and with what guarantees?"}$$

This milestone eliminates hardcoded assumptions about host hardware. Rather than presuming a specific single-CPU workstation or dual-Xeon server, the runtime dynamically probes the host operating system, CPU architecture, core topology, RAM capacity, active network interfaces, and allowlisted binaries. Most critically, it enforces the separation of five fundamental cognitive and governance states:
1. **"I can do this"** (Capability Discovery & Registry Availability)
2. **"I am allowed to do this"** (Policy Decision Point & Permission Bounds)
3. **"I should do this"** (Cognitive Intent & Reasoning Proposal)
4. **"I have been authorized to do this"** (Cryptographically Bound Authorization Token)
5. **"I successfully did this"** (Independently Verified Physical Commit)

### Tiếng Việt
Cột mốc **MS-1.3.34** thiết lập **Runtime Tương tác Môi trường & Năng lực Thực** của BOWCON V4.0. Các cột mốc trước đã xây dựng năng lực lập luận nhận thức (MS-1.3.32) và cơ chế tác động vật lý lên máy chủ (MS-1.3.33). MS-1.3.34 hợp nhất các thành phần này thành một hệ thống registry năng lực tự khám phá, nhận biết môi trường, giải quyết câu hỏi vận hành nền tảng:
$$\text{"BOWCON thực sự có thể làm được những gì trên cỗ máy cụ thể này, dưới quyền hạn nào, và với các cam kết an toàn ra sao?"}$$

Cột mốc này loại bỏ hoàn toàn các giả định mã hóa cứng về phần cứng máy chủ. Thay vì mặc định là máy trạm một CPU hay máy chủ dual-Xeon, runtime tự động thăm dò hệ điều hành thực, kiến trúc CPU, số nhân, dung lượng RAM, các giao diện mạng đang hoạt động và các tệp nhị phân cho phép. Đặc biệt, nó phân định rạch ròi 5 trạng thái nhận thức và kiểm soát:
1. **"Tôi có năng lực làm việc này"** (Khám phá Năng lực & Sẵn sàng trong Registry)
2. **"Tôi được phép làm việc này"** (Điểm Ra quyết định Chính sách PDP & Giới hạn Quyền)
3. **"Tôi nên làm việc này"** (Đề xuất Lập luận & Ý định Nhận thức)
4. **"Tôi đã được ủy quyền làm việc này"** (Token Ủy quyền Ràng buộc Mật mã)
5. **"Tôi đã thực hiện thành công việc này"** (Commit Vật lý được Kiểm chứng Độc lập)

---

## 2. Invariant Principles / Các Nguyên tắc Bất biến

$$\begin{aligned}
\text{CAPABILITY} &\neq \text{AUTHORIZATION} \\
\text{DISCOVERY} &\neq \text{EXECUTION} \\
\text{OBSERVATION} &\neq \text{MUTATION} \\
\text{LLM\_PROPOSE} &\neq \text{EXECUTE} \\
\text{CONFIDENCE} &\neq \text{AUTHORIZATION} \\
\text{PLAN} &\neq \text{EXECUTION} \\
\text{EXECUTION} &\neq \text{VERIFICATION} \\
\text{VERIFICATION} &\neq \text{COMMIT} \\
\text{FAILURE} &\neq \text{BRAIN\_DEATH} \\
\text{ONE\_BRAIN} &= \text{ONE\_AUTHORITATIVE\_BRAIN}
\end{aligned}$$

---

## 3. End-to-End Capability Execution Flow / Luồng Thực thi Năng lực Đầu-cuối

```
Cognitive Reasoning / Intent Proposal
        ↓ [Proposal Only]
CapabilityResolver (Resolve Intent → Canonical CapabilityDescriptor)
        ↓
CapabilityPlanner (Phase 1: Validate Schema & Parameters; Dry-Run Preview)
        ↓
CapabilityRisk & Permission Evaluation (PDP Assessment)
        ↓
Authorization Check (Cryptographically Bound Single-Use Token)
        ↓
Concurrency Guard (Deterministic Resource Lock)
        ↓
CapabilityExecutor (Phase 2: Real Physical Adapter Invocation)
        ↓
Single-Use Token Consumption (Anti-Replay Invalidation)
        ↓
CapabilityVerifier (Phase 3: Independent Low-Level OS Probe)
        ↓
CapabilityRecovery (Graceful Boundary: FAILURE != BRAIN_DEATH)
        ↓
Append-Only Audit Trail + Resource Lock Release
```

---

## 4. Canonical Capability Descriptor Model / Mô hình Mô tả Năng lực Chuẩn tắc

Each capability in BOWCON V4.0 must be registered via an immutable `CapabilityDescriptor`:

| Attribute | Type | Description |
|---|---|---|
| `capabilityId` | `string` | Canonical unique identifier (`cap_fs_write`, `cap_proc_start`, etc.) |
| `name` | `string` | Human-readable title |
| `version` | `string` | Semantic capability version (`4.0.0`) |
| `description` | `string` | Functional operational description |
| `category` | `CapabilityCategory` | `OBSERVATION`, `FILESYSTEM`, `PROCESS`, `SYSTEM`, `NETWORK` |
| `inputSchema` | `Record<string, any>` | Formal JSON Schema validating input arguments |
| `outputSchema` | `Record<string, any>` | Formal JSON Schema validating output payload |
| `riskLevel` | `ActionRiskLevel` | Risk classification (`OBSERVE`, `LOW`, `REVERSIBLE`, `ELEVATED`, `HIGH`, `CRITICAL`) |
| `permissionLevel` | `PermissionLevel` | Operational permission requirement |
| `reversible` | `boolean` | Indicates whether physical mutation can be undone |
| `requiresHumanApproval`| `boolean`| Triggers explicit human confirmation before token issuance |
| `requiresExplicitAuthorization`| `boolean`| Requires cryptographic single-use `AuthorizationToken` |
| `supportsDryRun` | `boolean` | Guarantees zero-mutation simulation via preview |
| `supportsVerification`| `boolean`| Provides independent post-execution physical observation |
| `supportsRollback` | `boolean` | Exposes compensating action hook |
| `supportedHostModes`| `HostMode[]` | Supported environments (`WORKSTATION`, `SERVER`, `PRODUCTION`, etc.) |
| `supportedOperatingSystems`| `string[]`| Platform constraints (`win32`, `linux`, `darwin`) |
| `dependencies` | `string[]` | Required system binaries or prerequisites |
| `timeoutMs` | `number` | Maximum permissible execution duration |
| `resourceRequirements`| `object` | Minimum CPU cores or RAM required |
| `state` | `CapabilityState`| Dynamic state (`AVAILABLE`, `DEGRADED`, `UNAVAILABLE`, etc.) |

---

## 5. Real Host Environment Discovery / Khám phá Môi trường Máy chủ Thực

BOWCON dynamically queries genuine host operating system APIs without fabricating data:

```typescript
const snapshot = globalCapabilityDiscovery.captureSnapshot();
```

The snapshot captures:
- **Operating System:** Platform (`win32`), Release (`10.0.19045`), Architecture (`x64`), Hostname.
- **Dynamic Host Mode Heuristic:** Dynamically marks `SERVER` when cores $\ge 24$ or RAM $\ge 64\text{ GB}$ (e.g. dual-Xeon setups), `WORKSTATION` when cores $\ge 8$, `DEVELOPMENT` otherwise.
- **CPU Topology:** Model (`Intel(R) Xeon(R) CPU E5-2680 v4`), core count (28 logical cores), clock speed (2394 MHz), load averages.
- **Memory Subsystem:** Total physical memory, free memory, percentage utilization.
- **Network Interfaces:** Active interface adapters, IPv4/IPv6 addresses, MAC addresses, online status.
- **Process Environment:** PID, Node.js runtime version, uptime, heap/RSS memory utilization.
- **Allowlisted Binaries:** Confirmed availability of authorized binaries (`node`, `git`).

---

## 6. Real Capability Categories / Các Danh mục Năng lực Thực

1. **`OBSERVATION`:**
   - `cap_obs_fs`: Inspects file existence, stats, and metadata within workspace.
   - `cap_obs_process`: Inspects host process table, PID count, and process memory.
   - `cap_obs_system`: Inspects CPU, memory, and OS specifications.
   - `cap_obs_network`: Discovers active network interfaces and connectivity.
2. **`FILESYSTEM`:**
   - `cap_fs_write`: Writes files within workspace. Reversible, verified via SHA-256.
   - `cap_fs_read`: Reads file content without mutation.
   - `cap_fs_append`: Appends bytes to existing files. Reversible, verified via size checks.
   - `cap_fs_mkdir`: Creates directories in workspace. Reversible, verified via `isDirectory()`.
   - `cap_fs_rename`: Renames workspace files. Reversible, verified via source/destination probes.
   - `cap_fs_delete`: Controlled deletion of files. Elevated risk, requires explicit human confirmation.
3. **`PROCESS`:**
   - `cap_proc_start`: Spawns governed background processes from allowlisted commands. Verified via `process.kill(pid, 0)`.
   - `cap_proc_stop`: Terminates governed child processes. Verified via independent absence probes.
4. **`SYSTEM`:**
   - `cap_sys_snapshot`: Captures full environmental telemetry and dynamic host mode classification.
5. **`NETWORK`:**
   - `cap_net_interfaces`: Discovers network topology and interface metadata (Discovery only; zero arbitrary remote execution).

---

## 7. Resilience Architecture: `FAILURE != BRAIN_DEATH`

In traditional naive agents, an unhandled exception or failed command causes the process to crash or exit.
In BOWCON V4.0:
- Failures are classified into:
  - `RECOVERABLE`: Parameter errors, missing files, expected validation rejections.
  - `DEGRADED`: Transient verification timeouts; marks capability `DEGRADED` without stopping the runtime.
  - `AUTHORIZATION_REQUIRED`: Token missing or expired; clean policy block.
  - `POLICY_DENIED`: Target outside workspace boundary; blocked with audit entry.
  - `UNAVAILABLE`: Unimplemented or missing capability; safely rejected.
  - `FATAL`: Reserved strictly for critical runtime corruption.
- The `CapabilityRecoveryManager` catches errors at the capability boundary, logs the failure with scrubbed arguments, and restores the runtime to `OPERATIONAL`.

---

## 8. Dry-Run Zero-Mutation Guarantee / Cam kết Chế độ Dry-Run Không Đột biến

When `isDryRun: true` is provided:
1. All parameter validation and policy evaluation rules are enforced.
2. The execution adapter returns a structured `DRY_RUN_PREVIEW` result.
3. **Zero physical mutation occurs on the host disk or process table.**
4. The verifier confirms that no file was created, no directory was modified, and no process was spawned.

---

## 9. Protected Workspace Absolute Isolation / Cách ly Tuyệt đối Không gian Bảo vệ

Workspace `C:\BOW\shopofbow` is strictly protected:
- **READS = 0**
- **WRITES = 0**
- **IMPORTS = 0**
- **TOUCHES = 0**

Any attempt to target `C:\BOW\shopofbow` triggers an immediate `SECURITY_VIOLATION` at the path resolution gate.

---

## 10. Reality Gate Evidence (MS-1.3.34)

Dedicated Reality Gate: [`tests/test_v4_agent_real_capability_runtime.ts`](file:///C:/Users/MSI_dualXeon/Desktop/BOW/bow-agent/tests/test_v4_agent_real_capability_runtime.ts)  
**Result:** **87 / 87 assertions PASSED (100%) across Categories A through AL**.
Full Regression: **36 / 36 test suites PASS (0 regressions)**.
