# BOWCON V4.0 — REAL WORLD ACTION & GOVERNED EXECUTION RUNTIME MODEL (EN / VI)
# MÔ HÌNH THỰC THI HÀNH ĐỘNG THẾ GIỚI THỰC & ĐIỀU HÀNH ĐƯỢC KIỂM SOÁT

**Milestone:** MS-1.3.33  
**Package:** `@bow/agent@4.0.0` (STRICT VERSION LOCK)  
**Execution Workspace:** `C:\Users\MSI_dualXeon\Desktop\BOW\bow-agent`  
**Protected Workspace:** `C:\BOW\shopofbow` (**READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0**)  
**Standard Compliance:** ISO/IEC 42001, ISO/IEC 23894, NIST AI RMF, OWASP Agent Security Standards  

---

## 1. Executive Summary / Tóm tắt Cấp cao

### English
Milestone **MS-1.3.33** establishes the governed real-world physical execution layer of BOWCON V4.0 on the host machine. While previous milestones delivered cognitive understanding, intent classification, and continuous background service runtimes, MS-1.3.33 grants BOWCON the authority and mechanism to enact **observable, verified, and strictly governed mutations** on the host environment (Filesystem, Process Table, Child Process Lifecycle, and Governed Executable Binaries).

The governing principle of this milestone is that **no physical mutation may ever occur solely because an LLM or cognitive provider recommended it**. A cognitive proposal is strictly an advisory request. Every consequential action must pass through cryptographic authorization binding, central Policy Decision Point (PDP) evaluation, single-use token consumption, deterministic resource locking, real host execution, independent physical verification (such as SHA-256 hash checking and OS process polling), and gated two-phase commit.

### Tiếng Việt
Cột mốc **MS-1.3.33** thiết lập tầng thực thi vật lý thế giới thực được kiểm soát chặt chẽ của BOWCON V4.0 trên máy chủ (host machine). Trong khi các cột mốc trước cung cấp năng lực nhận thức, phân loại ý định và runtime dịch vụ nền liên tục, MS-1.3.33 trao cho BOWCON thẩm quyền và cơ chế để tạo ra **các thay đổi thực tế, có thể quan sát, được kiểm chứng độc lập và chịu sự kiểm soát nghiêm ngặt** trên môi trường máy chủ (Hệ thống tệp, Bảng tiến trình, Vòng đời tiến trình con và Các tệp thực thi nằm trong danh sách cho phép).

Nguyên tắc quản trị cốt lõi của cột mốc này là: **không một đột biến vật lý nào được phép diễn ra chỉ vì mô hình LLM hoặc cognitive provider đề xuất nó**. Một đề xuất nhận thức thuần túy là một yêu cầu tư vấn. Mọi hành động có hệ quả phải đi qua ràng buộc ủy quyền mật mã, thẩm định PDP, tiêu thụ token dùng một lần, khóa tài nguyên xác định, thực thi trên máy chủ thực, kiểm chứng vật lý độc lập (như kiểm tra băm SHA-256 và thăm dò tiến trình HĐH) và commit hai pha có cổng chặn.

---

## 2. The Invariant Laws of Governed Execution / Các Định luật Bất biến của Thực thi Được kiểm soát

$$\begin{aligned}
\text{LLM\_PROPOSE} &\neq \text{EXECUTE} \\
\text{CONFIDENCE} &\neq \text{AUTHORIZATION} \\
\text{INTENT} &\neq \text{AUTHORIZATION} \\
\text{PLAN} &\neq \text{AUTHORIZATION} \\
\text{PREVIEW} &\neq \text{EXECUTION} \\
\text{REQUEST} &\neq \text{AUTHORIZATION} \\
\text{AUTHORIZATION} &\neq \text{TOOL\_EXECUTION} \\
\text{TOOL\_EXECUTION} &\neq \text{VERIFICATION} \\
\text{VERIFICATION} &\neq \text{COMMIT} \\
\text{PREVIOUS\_APPROVAL} &\neq \text{CURRENT\_APPROVAL}
\end{aligned}$$

---

## 3. End-to-End Governance Pipeline / Luồng Xử lý Kiểm soát Đầu-cuối

```
User / Surface Request
        ↓
CognitivePipeline (Intent & Plan)
        ↓ [Cognitive Proposal Only]
WorldActionPlanner (Phase 1: PREPARE — Zero Physical Mutation)
        ↓
Risk Assessment & Policy Decision Point (PDP)
        ↓
WorldActionAuthorization (Cryptographically Bound Token)
        ↓
Concurrency Manager (Deterministic Resource Lock)
        ↓
WorldActionExecutor (Phase 2: Real Physical Execution)
        ↓
WorldActionVerifier (Phase 3: Independent OS Inspection)
        ↓
WorldActionCommit (Phase 4: Gated Commit & Audit Chaining)
        ↓
Append-Only Audit Trail + Idempotency Cache
```

---

## 4. Canonical Action Model / Mô hình Hành động Chuẩn tắc

Every real-world operation is represented by the `WorldAction` envelope:

| Field | Type | Description |
|---|---|---|
| `actionId` | `string` | Unique deterministic action identifier (`act_...`) |
| `requestId` | `string` | Correlation identifier of the originating request |
| `traceId` | `string` | Distributed trace correlation identifier |
| `tenantId` | `string` | Multi-tenant physical partition key |
| `deviceId` | `string` | Originating host hardware device fingerprint |
| `sessionId` | `string` | Scoped interaction session identity |
| `userId` | `string` | Authenticated principal requesting execution |
| `actionType` | `string` | Canonical tool identifier (`world_fs_write`, etc.) |
| `target` | `string` | Normalized filesystem path or process target |
| `parameters` | `Record<string, any>` | Normalized parameter dictionary |
| `parametersHash` | `string` | SHA-256 digest of sorted parameters |
| `riskLevel` | `ActionRiskLevel` | Risk classification (`OBSERVE` .. `CRITICAL`) |
| `authorizationState` | `ActionAuthorizationState` | Token and approval status |
| `executionState` | `ActionExecutionState` | Physical execution lifecycle state |
| `verificationState`| `ActionVerificationState`| Independent post-execution status |
| `lifecycleState` | `ActionLifecycleState` | Comprehensive state machine status |
| `createdAt` | `number` | Unix epoch milliseconds |
| `expiresAt` | `number` | TTL expiration boundary |
| `idempotencyKey` | `string` | Anti-replay idempotency identifier |
| `isDryRun` | `boolean` | Flag enforcing zero-mutation simulation |

---

## 5. Risk Classification Taxonomy / Phân loại Cấp độ Rủi ro

1. **`OBSERVE` (Không tác dụng phụ / Read-Only):**
   - Đọc siêu dữ liệu tệp tin, xem nội dung tệp, liệt kê tiến trình hệ thống, kiểm tra tính tồn tại của tiến trình.
   - Không làm thay đổi bất kỳ trạng thái nào trên hệ điều hành.
2. **`LOW` (Tác động tối thiểu / Safe Scratch):**
   - Tạo thư mục tạm trong vùng sandbox `scratch/`, ghi các tệp thử nghiệm không làm ảnh hưởng tệp hệ thống.
   - Cho phép tự động thực thi nếu trong sandbox được chỉ định.
3. **`REVERSIBLE` (Tác động có thể đảo ngược / Reversible Mutations):**
   - Tạo tệp tin mới, ghi thêm vào tệp (append), đổi tên tệp (rename), sao chép tệp (copy), di chuyển tệp (move).
   - Bắt buộc phải có `AuthorizationToken` và chiến lược khôi phục (Rollback) được kiểm chứng độc lập.
4. **`ELEVATED` (Tác động nâng cao / Destructive or Process Controls):**
   - Xóa tệp người dùng, dừng một tiến trình đang chạy, khởi động tiến trình con.
   - Bắt buộc phải có sự xác nhận của người dùng (`EXPLICIT_CONFIRMATION`).
5. **`HIGH` (Tác động nguy hiểm / Privileged Operations):**
   - Thực thi tệp thực thi cho phép (`world_exec_allowlisted`), thay đổi cấu hình mạng hoặc bảo mật.
   - Bắt buộc có token xác nhận đơn lẻ của người dùng cấp cao.
6. **`CRITICAL` (Cấm hoặc Rủi ro phá hủy / Irreversible System State):**
   - Thao tác ngoài không gian làm việc, chạm vào `C:\BOW\shopofbow`, thực thi shell không giới hạn.
   - Bị từ chối tự động bởi chính sách mặc định đóng (`Default Deny`).

---

## 6. Real Tool Adapters / Các Bộ Tiếp hợp Công cụ Thực

| Tool Identifier | Domain | Reversibility | Verification Strategy | Rollback Strategy |
|---|---|---|---|---|
| `world_fs_write` | Filesystem | REVERSIBLE | Read content & SHA-256 match | Delete created file |
| `world_fs_read` | Filesystem | READ_ONLY | Schema check | None (Read-only) |
| `world_fs_append` | Filesystem | REVERSIBLE | File ends with appended bytes | Truncate to previous size |
| `world_fs_mkdir` | Filesystem | REVERSIBLE | OS directory stat check | Remove created directory |
| `world_fs_rename` | Filesystem | REVERSIBLE | Source gone & dest exists | Rename dest back to source |
| `world_fs_copy` | Filesystem | REVERSIBLE | Dest exists & size matches | Delete copied destination |
| `world_fs_move` | Filesystem | REVERSIBLE | Source gone & dest exists | Move dest back to source |
| `world_fs_delete` | Filesystem | IRREVERSIBLE | OS absence check (`!exists`) | None |
| `world_process_list` | Process Obs | READ_ONLY | Memory usage schema check | None |
| `world_process_inspect` | Process Obs | READ_ONLY | OS `process.kill(pid, 0)` | None |
| `world_process_exists` | Process Obs | READ_ONLY | Probe existence check | None |
| `world_process_start` | Process Life | REVERSIBLE | OS process table verification | Terminate spawned PID |
| `world_process_stop` | Process Life | IRREVERSIBLE | OS process absence check | None |
| `world_exec_allowlisted`| Command Exec | IRREVERSIBLE | Exit code 0 & output check | None |

---

## 7. Independent Physical Verification / Kiểm chứng Vật lý Độc lập

**Nguyên lý:** Một công cụ kết thúc mà không ném ra ngoại lệ (exception) **không bao giờ** được xem là thành công.
Hệ thống BOWCON V4.0 bắt buộc phải kích hoạt một trình quan sát độc lập:
1. **Kiểm tra tệp tin:** Sử dụng các lệnh cấp thấp của hệ điều hành (`fs.existsSync`, `fs.statSync`, `fs.readFileSync`) và tính toán mã băm SHA-256 của luồng byte trên đĩa cứng để đối chiếu với kỳ vọng.
2. **Kiểm tra tiến trình:** Sử dụng tín hiệu thăm dò nhân hệ điều hành `process.kill(pid, 0)` để xác nhận rằng tiến trình con thực sự đang tồn tại và hoạt động trong bảng tiến trình của HĐH.
3. **Kiểm tra xóa/dừng:** Xác nhận rằng tài nguyên hoặc tiến trình thực sự **không còn tồn tại** trên hệ điều hành sau khi lệnh thực thi hoàn tất.

---

## 8. Cryptographically Bound Single-Use Authorization Token / Token Ủy quyền Đơn lẻ Ràng buộc Mật mã

Một token ủy quyền (`AuthorizationToken`) được ký bằng HMAC-SHA256 và ràng buộc chặt chẽ với:
- `tokenId` (Mã token duy nhất)
- `actionId` (Hành động duy nhất được cấp phép)
- `userId` & `deviceId` (Danh tính người dùng và thiết bị)
- `toolId` & `target` (Công cụ và mục tiêu tài nguyên cụ thể)
- `parametersHash` (Mã băm SHA-256 của các tham số đầu vào)
- `expiresAt` (Thời hạn TTL nghiêm ngặt)

**Chống Tấn công Phát lại (Anti-Replay):** Khi hành động vật lý được thực thi thành công, token chuyển nguyên tử sang trạng thái `CONSUMED`. Bất kỳ lần sử dụng lại nào của token này sẽ lập tức bị chặn với lỗi `AUTHORIZATION_FAILURE`.

---

## 9. Concurrency & Deterministic Resource Locking / Đồng thời & Khóa Tài nguyên Xác định

Để ngăn chặn tình trạng tương tranh (race conditions) khi nhiều tác vụ đồng thời cố gắng sửa đổi cùng một tệp tin hoặc tài nguyên:
- Hệ thống chuẩn hóa đường dẫn đích (normalized path) thành một khóa tài nguyên xác định (`resourceKey`).
- Trước khi thực thi vật lý, runtime phải lấy được khóa tài nguyên (`acquireLock`).
- Nếu tài nguyên đang bị chiếm giữ bởi một hành động khác, hành động mới bị chặn ngay lập tức với lỗi `RESOURCE_LOCKED`.
- Khóa tài nguyên được giải phóng an toàn trong khối `finally`.

---

## 10. Global Emergency Stop (`SAFE_STOP`) / Công tắc Dừng Khẩn cấp Toàn cục

Khi phát hiện sự cố an ninh hoặc nhận được chỉ thị từ người quản trị:
- Gọi `activateEmergencyStop(reason)`.
- Runtime lập tức chuyển sang trạng thái `SAFE_STOP`.
- Mọi hành động mới hoặc đang đợi hàng đợi bị hủy bỏ và ném lỗi `EMERGENCY_STOP_ACTIVE`.
- Ghi nhật ký kiểm toán với loại sự kiện `SECURITY_BLOCK`.
- Việc khôi phục yêu cầu token của nhà vận hành (`resetEmergencyStop(operatorToken)`).

---

## 11. Append-Only Cryptographic Audit Trail / Nhật ký Kiểm toán Bất biến Nối tiếp

Mỗi bước chuyển đổi trong vòng đời thực thi đều được ghi lại vào nhật ký nối tiếp (append-only ledger):
- Mã băm SHA-256 của payload.
- Chuỗi liên kết băm (`previousHash`) để phát hiện bất kỳ sự can thiệp hoặc sửa đổi dữ liệu lịch sử.
- **Tẩy xóa dữ liệu nhạy cảm đệ quy (Recursive Secret Scrubbing):** Mọi token, khóa bí mật, mật khẩu, chuỗi authorization bearer đều được tự động thay thế bằng `[REDACTED_SECRET]` trước khi lưu vào nhật ký.

---

## 12. Absolute Protected Workspace Isolation / Cách ly Tuyệt đối Không gian Bảo vệ

Không gian làm việc `C:\BOW\shopofbow` là vùng cấm tuyệt đối theo hiến pháp hệ thống:
- **READS = 0**
- **WRITES = 0**
- **IMPORTS = 0**
- **TOUCHES = 0**

Bất kỳ đường dẫn nào hướng tới hoặc chứa chuỗi `C:\BOW\shopofbow` đều bị chặn ngay tại tầng phân tích đường dẫn (`validateAndResolvePath`) với lỗi `SECURITY_VIOLATION`.

---

## 13. Reality Gate Methodology & "Test-Pass != Real-World Proof" / Phương pháp Luận Reality Gate

Nhiều hệ thống AI giả mạo sự hoàn thành bằng cách tạo ra các bài kiểm tra giả định (mocked unit tests) trả về `{ success: true }`.
BOWCON V4.0 tuân thủ nguyên tắc: **Một bài test vượt qua không đồng nghĩa với bằng chứng thế giới thực** nếu không có:
1. Đột biến thực sự trên hệ thống tệp tin được quan sát độc lập từ hệ điều hành.
2. Kiểm tra mã băm SHA-256 trên nội dung đọc từ đĩa cứng.
3. Kiểm tra PID tiến trình thực từ bảng tiến trình hệ điều hành.
4. Đảm bảo chế độ Dry-run thực sự không tạo ra bất kỳ đột biến vật lý nào trên đĩa cứng.
5. Đảm bảo hành động không có thẩm quyền không để lại bất kỳ tệp tin rác nào.

Cột mốc MS-1.3.33 cung cấp bài kiểm tra thực tế `tests/test_v4_agent_real_world_action_runtime.ts` với **71 khẳng định kiểm chứng thực tế** vượt qua 100%.
