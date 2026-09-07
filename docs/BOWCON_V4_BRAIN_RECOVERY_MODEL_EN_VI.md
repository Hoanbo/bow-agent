# BOWCON V4.0 — BRAIN RECOVERY & CRASH CONSISTENCY MODEL (MS-1.3.16)
## Mô Hình Phục Hồi Não Bộ & Tính Nhất Quán Sự Cố (Song Ngữ EN - VI)

---

### 1. Purpose / Mục Đích
- **EN**: The Brain Recovery & Crash Consistency Engine (MS-1.3.16) establishes authoritative post-crash reconstruction for the BOWCON V4.0 Agent. When the system restarts after an abrupt process termination, crash, or power loss, it deterministically determines what happened, reconstructs consistent state, prevents duplicate tool executions or commits, and classifies whether it is safe to resume or safe to stop.
- **VI**: Động cơ Phục hồi Não bộ & Tính Nhất quán Sự cố (MS-1.3.16) thiết lập cơ chế tái thiết lập có thẩm quyền sau sự cố cho Agent BOWCON V4.0. Khi hệ thống khởi động lại sau khi tiến trình bị dừng đột ngột, sự cố crash hoặc mất điện, nó xác định một cách tất định những gì đã xảy ra, tái thiết lập trạng thái nhất quán, ngăn chặn thực thi công cụ hoặc commit trùng lặp, và phân loại xem an toàn để tiếp tục hay an toàn để dừng lại.

---

### 2. Brain-First Architectural Principle / Nguyên Tắc Kiến Trúc Brain-First
- **EN**: The BOWCON Brain is the authoritative, embodiment-independent primary cognitive entity. Physical embodiments (e.g. BOW Robot, BOW Mobile) are secondary clients. Recovery logic lives entirely within the Brain and never depends on sensors, actuators, ROS, ESP32, or embodiment endpoints.
- **VI**: BOWCON Brain là thực thể nhận thức trung tâm có thẩm quyền và độc lập hoàn toàn với các hiện thân vật lý. Các hiện thân vật lý (như BOW Robot, BOW Mobile) chỉ là các client thứ cấp. Logic phục hồi nằm trọn vẹn trong Não bộ và không bao giờ phụ thuộc vào cảm biến, bộ chấp hành, ROS, ESP32 hay điểm cuối của hiện thân.

---

### 3. Crash Model / Mô Hình Sự Cố
- **EN**: The engine strictly enforces five foundational axioms:
  1. `CRASH ≠ RETRY`
  2. `CRASH ≠ EXECUTE AGAIN`
  3. `CRASH ≠ SUCCESS`
  4. `CRASH ≠ FAILURE`
  5. `CRASH = AUTHORITATIVE STATE RECONSTRUCTION + SAFETY CLASSIFICATION`
- **VI**: Động cơ thực thi nghiêm ngặt năm tiên đề nền tảng:
  1. `SỰ CỐ ≠ THỬ LẠI`
  2. `SỰ CỐ ≠ THỰC THI LẠI`
  3. `SỰ CỐ ≠ THÀNH CÔNG`
  4. `SỰ CỐ ≠ THẤT BẠI`
  5. `SỰ CỐ = TÁI THIẾT LẬP TRẠNG THÁI CÓ THẨM QUYỀN + PHÂN LOẠI AN TOÀN`

---

### 4. Recovery Lifecycle / Vòng Đời Phục Hồi
- **EN**: The recovery pipeline executes through 5 sequential phases:
  `RECOVERY_REQUIRED → RECOVERY_INSPECTING → RECOVERY_RECONSTRUCTING → RECOVERY_VALIDATING → [RECOVERY_RESUMABLE | RECOVERY_STOPPED | RECOVERY_BLOCKED] → RECOVERY_COMPLETED`.
- **VI**: Pipeline phục hồi thực thi qua 5 giai đoạn tuần tự:
  `RECOVERY_REQUIRED → RECOVERY_INSPECTING → RECOVERY_RECONSTRUCTING → RECOVERY_VALIDATING → [RECOVERY_RESUMABLE | RECOVERY_STOPPED | RECOVERY_BLOCKED] → RECOVERY_COMPLETED`.

---

### 5. Recovery States / Các Trạng Thái Phục Hồi
- **EN**:
  - `RECOVERY_REQUIRED`: Post-crash detected; reconstruction needed.
  - `RECOVERY_INSPECTING`: Reading checkpoints and execution/commit evidence.
  - `RECOVERY_RECONSTRUCTING`: Resolving LKGS and crash conditions.
  - `RECOVERY_VALIDATING`: Evaluating consistency and approval safety.
  - `RECOVERY_RESUMABLE`: Verified safe to resume or return to READY.
  - `RECOVERY_STOPPED`: Safe stop; requires external governance/approval.
  - `RECOVERY_BLOCKED`: Blocked due to conflict, unknown state, or partial commit.
  - `RECOVERY_COMPLETED`: Terminal recovery completion.
  - `RECOVERY_FAILED`: Terminal failure of the recovery engine.
- **VI**:
  - `RECOVERY_REQUIRED`: Phát hiện sau sự cố; cần tái thiết lập.
  - `RECOVERY_INSPECTING`: Đang đọc checkpoints và bằng chứng thực thi/commit.
  - `RECOVERY_RECONSTRUCTING`: Đang phân giải LKGS và điều kiện sự cố.
  - `RECOVERY_VALIDATING`: Đang đánh giá tính nhất quán và an toàn phê duyệt.
  - `RECOVERY_RESUMABLE`: Đã xác minh an toàn để tiếp tục hoặc về READY.
  - `RECOVERY_STOPPED`: Dừng an toàn; yêu cầu quản trị/phê duyệt bên ngoài.
  - `RECOVERY_BLOCKED`: Bị chặn do xung đột, trạng thái không rõ, hoặc commit một phần.
  - `RECOVERY_COMPLETED`: Hoàn thành phục hồi (trạng thái kết thúc).
  - `RECOVERY_FAILED`: Thất bại trong quá trình phục hồi (trạng thái kết thúc).

---

### 6. Recovery Transitions / Chuyển Đổi Trạng Thái Phục Hồi
- **EN**: Transitions are validated against `VALID_RECOVERY_TRANSITIONS`. Terminal states (`RECOVERY_COMPLETED`, `RECOVERY_FAILED`, `RECOVERY_BLOCKED`, `RECOVERY_STOPPED`) strictly forbid outbound transitions.
- **VI**: Các chuyển đổi được xác thực theo bảng `VALID_RECOVERY_TRANSITIONS`. Các trạng thái kết thúc (`RECOVERY_COMPLETED`, `RECOVERY_FAILED`, `RECOVERY_BLOCKED`, `RECOVERY_STOPPED`) nghiêm cấm mọi chuyển đổi ra ngoài.

---

### 7. Last Known Good State (LKGS) / Trạng Thái Tốt Được Biết Cuối Cùng
- **EN**: The Last Known Good State represents the most recent checkpoint that is verified and durably committed (e.g. `READY`, `COMPLETED`, or backed by confirmed commit). It distinguishes latest unverified state from verified durable state.
- **VI**: Trạng thái Tốt được Biết Cuối cùng đại diện cho checkpoint gần nhất đã được xác minh và commit bền vững (ví dụ `READY`, `COMPLETED`, hoặc có commit xác nhận). Nó phân biệt trạng thái mới nhất chưa xác minh với trạng thái bền vững đã xác minh.

---

### 8. Checkpoints / Điểm Kiểm Tra Vòng Đời
- **EN**: Checkpoints record sequence numbers, lifecycle states, stage, and cryptographic fingerprints. During recovery, checkpoints are sorted by sequence to establish non-regressive state history.
- **VI**: Checkpoints lưu lại số thứ tự sequence, trạng thái vòng đời, giai đoạn và mã băm mật mã. Khi phục hồi, các checkpoint được sắp xếp theo sequence để thiết lập lịch sử trạng thái không bị thoái lui.

---

### 9. Recovery Journal / Nhật Ký Phục Hồi
- **EN**: An append-only scoped journal records every recovery event (`RECOVERY_STARTED`, `STATE_INSPECTED`, `CHECKPOINT_SELECTED`, `CONSISTENCY_EVALUATED`, `CLASSIFICATION_DETERMINED`, `DECISION_RECORDED`, `RECOVERY_FINISHED`) immutably per `${userId}::${sessionId}`.
- **VI**: Một nhật ký chỉ-nối-thêm có phân phạm vi ghi lại mọi sự kiện phục hồi một cách bất biến cho mỗi `${userId}::${sessionId}`.

---

### 10. Crash Consistency / Tính Nhất Quán Sự Cố
- **EN**: Authoritatively classifies crashes into:
  `NO_ACTIVE_OPERATION`, `INTERRUPTED_BEFORE_EXECUTION`, `INTERRUPTED_DURING_EXECUTION`, `INTERRUPTED_DURING_VERIFICATION`, `INTERRUPTED_DURING_COMMIT`, `COMMIT_CONFIRMED_BEFORE_CRASH`, `UNKNOWN_DURABLE_STATE`, `CONFLICTING_DURABLE_STATE`.
- **VI**: Phân loại có thẩm quyền các sự cố thành 8 điều kiện nhất quán cụ thể nhằm loại bỏ việc suy đoán.

---

### 11. Partial Commits / Commit Một Phần
- **EN**: Partial commits (`isPartial === true` or `ROLLBACK_REQUIRED`) are classified as `PARTIAL_COMMIT` and immediately yield `BLOCK_RECOVERY`. Partial state is never presented as complete success.
- **VI**: Các commit một phần được phân loại là `PARTIAL_COMMIT` và ngay lập tức trả về `BLOCK_RECOVERY`. Trạng thái một phần không bao giờ được báo cáo là thành công hoàn chỉnh.

---

### 12. Verification Reconstruction / Tái Thiết Lập Xác Minh
- **EN**: Verification statuses (`VERIFIED`, `FAILED`, `UNKNOWN`, `INCONCLUSIVE`, `NOT_VERIFIABLE`) are preserved. `UNKNOWN` and `INCONCLUSIVE` never silently become `VERIFIED`.
- **VI**: Các trạng thái xác minh được bảo toàn nguyên vẹn. `UNKNOWN` và `INCONCLUSIVE` tuyệt đối không bao giờ được âm thầm chuyển thành `VERIFIED`.

---

### 13. Commit Reconstruction / Tái Thiết Lập Commit
- **EN**: Confirmed commits (`COMMITTED`, `ALREADY_COMMITTED`) are recognized so that already completed transactions are not re-executed or re-committed.
- **VI**: Các commit đã xác nhận được nhận diện để các giao dịch đã hoàn tất không bao giờ bị thực thi lại hoặc commit lại lần hai.

---

### 14. Replay Protection / Chống Thực Thi Trùng Lặp (Replay)
- **EN**: Interrupted executions are NEVER blindly retried. Operations with existing commit evidence yield `DUPLICATE_ALREADY_COMMITTED`. Operations interrupted during execution yield `RESUME_BLOCKED` to prevent double charges or duplicate mutations.
- **VI**: Các thao tác bị gián đoạn khi đang thực thi KHÔNG BAO GIỜ được tự động chạy lại. Các thao tác đã commit trả về `DUPLICATE_ALREADY_COMMITTED`. Thao tác gián đoạn giữa chừng trả về `RESUME_BLOCKED` nhằm chống trừ tiền kép hoặc đột biến dữ liệu trùng lặp.

---

### 15. Governance Preservation / Bảo Toàn Quản Trị
- **EN**: Recovery never bypasses PolicyDecisionPoint, ApprovalService, or IdempotencyStore. It cannot create or fabricate approval tokens.
- **VI**: Phục hồi không bao giờ vượt qua PDP, ApprovalService hay IdempotencyStore. Nó không thể tự tạo ra token phê duyệt giả mạo.

---

### 16. Approval Preservation / Bảo Toàn Phê Duyệt
- **EN**: Distinguishes `APPROVAL_UNKNOWN`, `APPROVAL_PENDING`, `APPROVAL_VALID_BUT_NOT_CONSUMED`, `APPROVAL_ALREADY_CONSUMED`, `APPROVAL_INVALID`, `APPROVAL_EXPIRED_OR_UNAVAILABLE`.
- **VI**: Phân biệt rõ ràng 6 trạng thái phê duyệt; nếu không chứng minh được tính hợp lệ thì bắt buộc phải dừng để phê duyệt lại.

---

### 17. Risk Preservation / Bảo Toàn Mức Độ Rủi Ro
- **EN**: Risk levels are monotonic (`CRITICAL > HIGH > MEDIUM > LOW`). Downgrading risk during recovery is strictly prohibited (`assertRecoveryRiskPreservation`).
- **VI**: Mức độ rủi ro là đơn điệu. Nghiêm cấm hạ cấp mức độ rủi ro trong quá trình phục hồi.

---

### 18. Failure Classification / Phân Loại Sự Cố Phục Hồi
- **EN**: Deterministic failure categories: `RECOVERY_STATE_MISSING`, `RECOVERY_CHECKPOINT_INVALID`, `RECOVERY_SCOPE_FAILURE`, `RECOVERY_FINGERPRINT_FAILURE`, `RECOVERY_SEQUENCE_FAILURE`, `RECOVERY_COMMIT_CONFLICT`, `RECOVERY_VERIFICATION_CONFLICT`, `RECOVERY_GOVERNANCE_CONFLICT`, `RECOVERY_RISK_MISMATCH`, `RECOVERY_APPROVAL_CONFLICT`, `RECOVERY_PARTIAL_STATE`, `RECOVERY_UNKNOWN_STATE`, `RECOVERY_TERMINAL_STATE`, `RECOVERY_INTERNAL_FAILURE`.
- **VI**: 14 danh mục lỗi phục hồi tất định giúp chẩn đoán sự cố an toàn và chính xác.

---

### 19. Security Boundaries / Ranh Giới An Ninh
- **EN**:
  - Prototype pollution defense (`__proto__`, `constructor`, `prototype`).
  - Null-byte defense (`\0`).
  - Path traversal defense (`..`, `/`, `\`).
  - Windows reserved devices defense (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`).
  - Secret scrubbing of Bearer tokens, passwords, and API keys.
- **VI**:
  - Phòng thủ prototype pollution.
  - Chống chèn null byte.
  - Chống duyệt đường dẫn.
  - Chống các tên thiết bị hệ thống Windows dè dặt.
  - Tự động khử trùng bí mật, token Bearer, API key.

---

### 20. Immutability / Tính Bất Biến
- **EN**: All outputs (`RecoveryResult`, `ReconstructedState`, `RecoveryJournalRecord`, `LastKnownGoodState`, `RecoveryFailure`) are deeply frozen with `deepFreeze`.
- **VI**: Mọi dữ liệu đầu ra đều được đóng băng sâu đệ quy bằng `deepFreeze`.

---

### 21. Determinism / Tính Tất Định
- **EN**: All recovery IDs and fingerprints use deterministic 32-bit FNV-1a hashing. Zero random numbers or non-deterministic IDs.
- **VI**: Tất cả ID phục hồi và fingerprint đều dùng hàm băm FNV-1a 32-bit tất định, hoàn toàn không dùng hàm ngẫu nhiên.

---

### 22. Multi-Tenant Isolation / Cô Lập Multi-Tenant
- **EN**: Partitioned strictly by `${userId}::${sessionId}`. Cross-tenant or cross-session recovery access is blocked fail-closed.
- **VI**: Phân vùng nghiêm ngặt theo `${userId}::${sessionId}`. Truy cập phục hồi chéo người dùng hoặc chéo phiên bị từ chối đóng an toàn (fail-closed).

---

### 23. AgentLoop Integration / Tích Hợp AgentLoop
- **EN**: `RecoveryService` is registered within `AgentLoop` via dependency injection and exposed via `getRecoveryService()`. `AgentLoopResult` exposes `recoveryResult?: RecoveryResult`.
- **VI**: `RecoveryService` được đăng ký vào `AgentLoop` qua dependency injection và cung cấp qua `getRecoveryService()`. `AgentLoopResult` bổ sung trường `recoveryResult?: RecoveryResult`.

---

### 24. Recovery Decision Semantics / Ngữ Nghĩa Quyết Định Phục Hồi
- **EN**:
  - `SAFE_TO_READY`: Brain was idle or transaction complete; safe to return to `READY`.
  - `SAFE_TO_RESUME`: Safe to resume in-flight processing.
  - `REQUIRE_GOVERNANCE`: Interrupted state requires policy review before continuing.
  - `REQUIRE_APPROVAL`: Operation requires explicit user approval.
  - `REQUIRE_VERIFICATION`: Post-execution verification must be finalized.
  - `BLOCK_RECOVERY`: Execution was interrupted or state is uncertain; blocked.
  - `REQUIRE_OPERATOR_INTERVENTION`: Conflicting durable evidence requires manual operator review.
- **VI**:
  - Các ngữ nghĩa quyết định chỉ dẫn chính xác hệ thống hành động an toàn mà không tự ý hành động bừa bãi.

---

### 25. Safe Resume Rules / Quy Tắc Tiếp Tục An Toàn
- **EN**: Safe resume is ONLY permitted when the operation was interrupted before tool execution, risk is LOW/MEDIUM, and no unapproved actions were pending.
- **VI**: Tiếp tục chỉ được phép khi thao tác bị gián đoạn trước khi gọi công cụ, rủi ro ở mức LOW/MEDIUM và không có hành động chờ phê duyệt chưa được thông qua.

---

### 26. Safe Stop Rules / Quy Tắc Dừng An Toàn
- **EN**: The engine transitions to `RECOVERY_STOPPED` or `RECOVERY_BLOCKED` whenever tool execution was underway, commit was partial, records conflict, or HIGH/CRITICAL approval is required.
- **VI**: Động cơ chuyển sang `RECOVERY_STOPPED` hoặc `RECOVERY_BLOCKED` khi công cụ đang chạy dở, commit bị dang dở, dữ liệu xung đột, hoặc cần phê duyệt mức HIGH/CRITICAL.

---

### 27. What Recovery MUST NOT Do / Những Điều Phục Hồi KHÔNG ĐƯỢC Phép Làm
- **EN**:
  - Recovery MUST NOT execute tools or retry tools.
  - Recovery MUST NOT make network calls (HTTP/WebSocket/Fetch).
  - Recovery MUST NOT synthesize speech or invoke VoiceService.
  - Recovery MUST NOT control physical embodiments or send robot commands.
  - Recovery MUST NOT mutate durable persistence directly.
- **VI**:
  - Phục hồi KHÔNG ĐƯỢC thực thi hay thử lại công cụ.
  - Phục hồi KHÔNG ĐƯỢC gọi mạng (HTTP/WebSocket/Fetch).
  - Phục hồi KHÔNG ĐƯỢC phát giọng nói hay gọi VoiceService.
  - Phục hồi KHÔNG ĐƯỢC điều khiển hiện thân robot hay gửi lệnh vật lý.
  - Phục hồi KHÔNG ĐƯỢC tự ý sửa đổi bộ nhớ bền vững trực tiếp.

---

### 28. Future Relationship with Robot Embodiment / Mối Quan Hệ Tương Lai Với Robot
- **EN**: The Brain recovers independently. In future milestones, when a physical Robot embodiment reconnects, it queries the Brain's recovered state. The Brain tells the robot what state is safe; the robot never dictates recovery to the Brain.
- **VI**: Não bộ phục hồi hoàn toàn độc lập. Trong các milestone tương lai, khi hiện thân Robot kết nối lại, nó sẽ truy vấn trạng thái đã phục hồi của Não bộ. Não bộ chỉ thị cho robot trạng thái nào là an toàn; robot không bao giờ áp đặt phục hồi lên Não bộ.

---

### 29. Future Relationship with Mobile Embodiment / Mối Quan Hệ Tương Lai Với Mobile
- **EN**: When a mobile companion connects, it receives authoritative recovered status and pending approvals from the Brain. Mobile is purely a client interface to Brain recovery.
- **VI**: Khi ứng dụng di động kết nối, nó nhận trạng thái phục hồi có thẩm quyền và các yêu cầu phê duyệt đang chờ từ Não bộ. Mobile chỉ là giao diện client đối với phục hồi của Não bộ.

---

### 30. Known Limitations / Giới Hạn Đã Biết
- **EN**:
  1. Recovery does not invent missing evidence; unrecorded in-flight tool states are conservatively treated as `BLOCK_RECOVERY`.
  2. Automatic compensatory rollback is descriptive-only; operational rollbacks require explicit governance workflows.
- **VI**:
  1. Phục hồi không tự bịa ra bằng chứng bị thiếu; các trạng thái công cụ không có bản ghi được xử lý dè dặt là `BLOCK_RECOVERY`.
  2. Rollback đền bù tự động chỉ mang tính chất mô tả dữ liệu; việc rollback thực tế cần quy trình quản trị tường minh.
