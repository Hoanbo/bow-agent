# BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION MODEL (MS-1.3.23)
## BILINGUAL SPECIFICATION & ARCHITECTURAL REFERENCE (EN / VI)

---

## 1. PURPOSE / MỤC ĐÍCH

### English
Milestone MS-1.3.23 establishes the authoritative **Device Pairing & Trust Runtime Foundation** for BOWCON V4.0. Its primary purpose is to enable future client surfaces (such as `BOW-Mobile`, `BOW-Robot`, `Desktop`, `Web`, and `Voice`) to establish deterministic, cryptographically verifiable device trust with the **ONE AUTHORITATIVE BOWCON BRAIN** without requiring repetitive, manual username/password login flows on every connection.

### Tiếng Việt
Cột mốc MS-1.3.23 thiết lập nền tảng **Device Pairing & Trust Runtime** có thẩm quyền cho BOWCON V4.0. Mục đích cốt lõi là cho phép các bề mặt client tương lai (như `BOW-Mobile`, `BOW-Robot`, `Desktop`, `Web`, và `Voice`) thiết lập mức độ tin cậy thiết bị xác định, có thể xác minh được với **MỘT BỘ NÃO BOWCON DUY NHẤT CÓ THẨM QUYỀN** mà không cần người dùng phải đăng nhập thủ công bằng tài khoản/mật khẩu trong mỗi lần kết nối lại.

---

## 2. ARCHITECTURAL POSITION / VỊ TRÍ KIẾN TRÚC

```text
                     ONE AUTHORITATIVE BOWCON BRAIN
                                   │
                                   ▼
                        Coordination (MS-1.3.17)
                                   │
                                   ▼
                       Synchronization (MS-1.3.18)
                                   │
                                   ▼
                          Transport (MS-1.3.19)
                                   │
                                   ▼
                    Secure Remote Gateway (MS-1.3.20)
                                   │
                                   ▼
                        Network Runtime (MS-1.3.21)
                                   │
                                   ▼
                       Connection Runtime (MS-1.3.22)
                                   │
                                   ▼
                PAIRING & TRUST RUNTIME (MS-1.3.23)
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
   BOW-Mobile                  BOW-Robot                   Desktop
    Surface                     Surface                    Surface
```

### English
Pairing resides below the Connection Runtime and above individual client surfaces. Pairing is strictly a **trust establishment layer**. It does not sit above the Brain and does not form an alternative cognitive authority.

### Tiếng Việt
Tầng ghép đôi (Pairing) nằm dưới Connection Runtime và nằm trên các bề mặt client riêng lẻ. Pairing là một **tầng thiết lập độ tin cậy (trust establishment layer)** thuần túy. Nó không bao giờ nằm trên Brain và không thể trở thành một cơ quan nhận thức thay thế.

---

## 3. DEVICE IDENTITY / DANH TÍNH THIẾT BỊ

### English
Primary device identity is strictly deterministic:
- Canonical format: `device_<fingerprint>` (e.g. `device_a1b2c3d4`).
- Computed using 32-bit FNV-1a hex digest over canonical device pairing metadata (`deviceType`, `surfaceId`, hardware model, platform).
- Zero randomness: `Math.random()`, `crypto.randomUUID()`, random UUID generators, and timestamps are strictly prohibited in primary device identity.

### Tiếng Việt
Danh tính thiết bị chính mang tính tất định tuyệt đối:
- Định dạng chuẩn: `device_<fingerprint>` (ví dụ: `device_a1b2c3d4`).
- Được tính toán bằng mã băm 32-bit FNV-1a trên siêu dữ liệu ghép đôi chuẩn của thiết bị (`deviceType`, `surfaceId`, model phần cứng, nền tảng).
- Không có yếu tố ngẫu nhiên: Nghiêm cấm dùng `Math.random()`, `crypto.randomUUID()`, UUID ngẫu nhiên hay timestamp trong việc tạo danh tính chính.

---

## 4. DEVICE TYPES / CÁC LOẠI THIẾT BỊ

### English
The runtime natively supports 5 explicit surface categories:
1. `BOW-MOBILE`: Portable handheld surfaces (iOS, Android, smart wearables).
2. `BOW-ROBOT`: Embodied robotic surfaces with physical actuators and sensors.
3. `DESKTOP`: Local or remote workstation operator consoles.
4. `WEB`: Browser-based remote user dashboards.
5. `VOICE`: Ambient voice speakers and microphone terminals.

### Tiếng Việt
Runtime hỗ trợ sẵn 5 loại bề mặt (surface) rõ ràng:
1. `BOW-MOBILE`: Bề mặt cầm tay di động (iOS, Android, thiết bị đeo thông minh).
2. `BOW-ROBOT`: Bề mặt robot thể hiện có cơ cấu chấp hành vật lý và cảm biến.
3. `DESKTOP`: Bàn điều khiển vận hành máy tính trạm cục bộ hoặc từ xa.
4. `WEB`: Bảng điều khiển người dùng trên trình duyệt web.
5. `VOICE`: Thiết bị loa và micro nhận diện giọng nói môi trường xung quanh.

---

## 5. PAIRING LIFECYCLE / VÒNG ĐỜI GHÉP ĐÔI

```text
UNPAIRED
   │ (Pairing Request)
   ▼
PAIRING_REQUESTED
   │ (Validation Passed)
   ▼
PAIRING_PENDING
   │ (Explicit User Confirmation)
   ▼
PAIRING_CONFIRMED
   │ (Handshake Verified)
   ▼
 PAIRED
   │ (Trust Evaluation)
   ▼
TRUSTED
   │ (Revocation by User/Admin)
   ▼
REVOKED ──── (Re-pairing Flow) ────► PAIRING_REQUESTED
```

### English
The pairing finite-state machine enforces 10 discrete states: `UNPAIRED`, `PAIRING_REQUESTED`, `PAIRING_PENDING`, `PAIRING_CONFIRMED`, `PAIRED`, `TRUSTED`, `REVOKED`, `EXPIRED`, `REJECTED`, and `FAILED`. Transitions must follow the authoritative transition matrix; invalid transitions fail closed immediately.

### Tiếng Việt
Máy trạng thái hữu hạn kiểm soát 10 trạng thái riêng biệt: `UNPAIRED`, `PAIRING_REQUESTED`, `PAIRING_PENDING`, `PAIRING_CONFIRMED`, `PAIRED`, `TRUSTED`, `REVOKED`, `EXPIRED`, `REJECTED`, và `FAILED`. Mọi sự chuyển đổi phải tuân theo ma trận chuyển đổi có thẩm quyền; các chuyển đổi không hợp lệ sẽ bị từ chối đóng ngay lập tức (fail-closed).

---

## 6. TRUST LIFECYCLE / VÒNG ĐỜI TIN CẬY

### English
Device trust levels:
- `NONE`: No trust established.
- `PAIRED`: Device identity confirmed, awaiting final trust graduation.
- `TRUSTED`: Authorized device recognized for trusted connections.
- `LIMITED`: Temporary constrained capabilities.
- `SUSPENDED`: Temporarily halted pending review.
- `REVOKED`: Trust permanently invalidated; cannot re-escalate without fresh pairing.

### Tiếng Việt
Các cấp độ tin cậy thiết bị:
- `NONE`: Chưa có bất kỳ sự tin cậy nào.
- `PAIRED`: Danh tính thiết bị đã xác nhận, chờ cấp độ tin cậy hoàn thiện.
- `TRUSTED`: Thiết bị được công nhận chính thức cho các kết nối tin cậy.
- `LIMITED`: Năng lực bị giới hạn tạm thời.
- `SUSPENDED`: Tạm đình chỉ chờ xem xét.
- `REVOKED`: Độ tin cậy bị hủy bỏ vĩnh viễn; không thể tự ý phục hồi mà không qua quy trình ghép đôi mới.

---

## 7. CONFIRMATION BOUNDARY / RANH GIỚI XÁC NHẬN NGƯỜI DÙNG

### English
A device is **never** automatically trusted simply because it connected or initiated a network frame. Trust requires passing through an explicit user confirmation step:
`PAIRING_PENDING` -> `confirmPairing()` -> `PAIRING_CONFIRMED` -> `PAIRED` -> `TRUSTED`.

### Tiếng Việt
Một thiết bị **không bao giờ** được tự động tin cậy chỉ vì nó vừa kết nối hoặc gửi một gói tin mạng. Độ tin cậy bắt buộc phải đi qua ranh giới xác nhận tường minh của người dùng:
`PAIRING_PENDING` -> `confirmPairing()` -> `PAIRING_CONFIRMED` -> `PAIRED` -> `TRUSTED`.

---

## 8. REVOCATION / THU HỒI ĐỘ TIN CẬY

### English
Authoritative revocation via `revokeDeviceTrust()`:
- Transitions pairingState to `REVOKED` and trustLevel to `REVOKED`.
- Inactivates trust record (`active = false`).
- Records revocation timestamp and justification reason.
- Preserves audit history permanently.
- Prevents silent trust restoration.

### Tiếng Việt
Thu hồi có thẩm quyền thông qua `revokeDeviceTrust()`:
- Chuyển `pairingState` sang `REVOKED` và `trustLevel` sang `REVOKED`.
- Vô hiệu hóa bản ghi tin cậy (`active = false`).
- Ghi nhận dấu thời gian thu hồi và lý do cụ thể.
- Lưu giữ vĩnh viễn bằng chứng kiểm toán (audit).
- Ngăn chặn triệt để việc âm thầm khôi phục độ tin cậy.

---

## 9. RE-PAIRING SEMANTICS / NGUYÊN TẮC GHÉP ĐÔI LẠI

### English
Direct transition from `REVOKED` to `TRUSTED` is strictly forbidden and fails closed. A revoked device wishing to regain trust must initiate a fresh, authentic re-pairing flow:
`REVOKED` -> `PAIRING_REQUESTED` -> `PAIRING_PENDING` -> `confirmPairing()` -> `PAIRED` -> `TRUSTED`.

### Tiếng Việt
Chuyển đổi trực tiếp từ `REVOKED` sang `TRUSTED` bị nghiêm cấm hoàn toàn. Thiết bị đã bị thu hồi muốn lấy lại độ tin cậy bắt buộc phải bắt đầu lại toàn bộ quy trình ghép đôi mới:
`REVOKED` -> `PAIRING_REQUESTED` -> `PAIRING_PENDING` -> `confirmPairing()` -> `PAIRED` -> `TRUSTED`.

---

## 10. 9-TUPLE SCOPE ISOLATION / CÔ LẬP PHẠM VI 9-TUPLE

### English
Extends the connection 8-tuple with `deviceId`:
`${userId}::${sessionId}::${brainId}::${surfaceId}::${transportId}::${gatewayId}::${adapterId}::${connectionId}::${deviceId}`
- **Cross-User**: A device paired to User A cannot be accessed or accepted for User B.
- **Cross-Brain**: A device paired to Brain A is rejected by Brain B.
- **Cross-Surface**: A Mobile surface cannot impersonate a Robot surface.
- Defends against prototype pollution (`__proto__`, `constructor`), null byte injection (`\0`), path traversal (`..`), and Windows reserved device names (`CON`, `PRN`, `COM1-9`, `LPT1-9`).

### Tiếng Việt
Mở rộng bộ 8-tuple của kết nối với thêm thành phần `deviceId`:
`${userId}::${sessionId}::${brainId}::${surfaceId}::${transportId}::${gatewayId}::${adapterId}::${connectionId}::${deviceId}`
- **Chéo người dùng (Cross-User)**: Thiết bị ghép đôi với User A không thể được truy cập hay chấp nhận cho User B.
- **Chéo Brain (Cross-Brain)**: Thiết bị ghép đôi với Brain A sẽ bị Brain B từ chối.
- **Chéo bề mặt (Cross-Surface)**: Bề mặt Mobile không thể mạo danh bề mặt Robot.
- Bảo vệ triệt để chống lại prototype pollution, chèn byte rỗng, duyệt đường dẫn và tên thiết bị dành riêng của Windows.

---

## 11. CAPABILITY BOUNDARY / RANH GIỚI NĂNG LỰC

### English
Pairing distinguishes **Device Capabilities** from **Execution Capabilities**:
- **Permitted Safe Capabilities**:
  - `REQUEST_SCREEN_CAPTURE`
  - `REQUEST_ROBOT_STATUS`
  - `RECEIVE_EVENTS`
  - `RECEIVE_SCREEN_RESULT`
  - `RECEIVE_ROBOT_TELEMETRY`
- **Strictly Forbidden Escalation Capabilities**:
  - `EXECUTE_TOOL`
  - `MUTATE_BRAIN`
  - `BYPASS_PDP`
  - `BYPASS_APPROVAL`
  - `MUTATE_COMMIT`
  - `FORCE_RECOVERY`
  - `CHANGE_GOVERNANCE`
Requesting any forbidden capability results in immediate fail-closed rejection with `[PAIRING_CAPABILITY_REJECTED]`.

### Tiếng Việt
Tách biệt rõ ràng **Năng lực Thiết bị** với **Năng lực Thực thi**:
- **Năng lực an toàn được phép**:
  - Yêu cầu chụp màn hình (`REQUEST_SCREEN_CAPTURE`)
  - Yêu cầu trạng thái robot (`REQUEST_ROBOT_STATUS`)
  - Nhận sự kiện (`RECEIVE_EVENTS`)
  - Nhận kết quả màn hình (`RECEIVE_SCREEN_RESULT`)
  - Nhận dữ liệu viễn trắc robot (`RECEIVE_ROBOT_TELEMETRY`)
- **Năng lực leo thang bị nghiêm cấm**:
  - Thực thi công cụ (`EXECUTE_TOOL`)
  - Làm biến đổi bộ nhớ não (`MUTATE_BRAIN`)
  - Vượt qua kiểm soát chính sách (`BYPASS_PDP`)
  - Bỏ qua phê duyệt (`BYPASS_APPROVAL`)
  - Làm biến đổi trạng thái commit (`MUTATE_COMMIT`)
  - Ép buộc khôi phục (`FORCE_RECOVERY`)
  - Thay đổi quản trị (`CHANGE_GOVERNANCE`)

---

## 12. ORDER-INDEPENDENT CAPABILITY FINGERPRINTING / BĂM NĂNG LỰC ĐỘC LẬP THỨ TỰ

### English
Capabilities are deduplicated and lexicographically sorted before computing FNV-1a digests. Two devices presenting the same set of capabilities in different array orders produce identical capability fingerprints.

### Tiếng Việt
Danh sách năng lực được loại trùng và sắp xếp theo thứ tự từ điển trước khi băm FNV-1a. Hai thiết bị cung cấp cùng một tập hợp năng lực nhưng khác thứ tự mảng sẽ luôn tạo ra mã băm năng lực hoàn toàn đồng nhất.

---

## 13. REPLAY DEFENSE / BẢO VỆ CHỐNG TẤN CÔNG PHÁT LẠI

### English
`PairingReplayDetector` tracks nonces and sequence numbers per device scope, distinguishing:
1. `VALID_NEW`: Monotonic sequence increment with fresh nonce.
2. `IDEMPOTENT_DUPLICATE`: Same nonce with identical fingerprint (safe retry).
3. `STALE_REPLAY`: Non-monotonic or rewound sequence number.
4. `MUTATED_REPLAY`: Reused nonce with altered payload.
5. `CROSS_SCOPE_REPLAY`: Request replayed into a mismatched scope.
6. `CROSS_DEVICE_REPLAY`: Request replayed under another device ID.
7. `REVOKED_REPLAY`: Replay attempt from a revoked device.
All unsafe conditions fail closed immediately.

### Tiếng Việt
`PairingReplayDetector` theo dõi nonces và số thứ tự trên từng phạm vi thiết bị, phân loại rõ:
1. `VALID_NEW`: Số thứ tự tăng dần đơn điệu với nonce mới.
2. `IDEMPOTENT_DUPLICATE`: Cùng nonce với mã băm trùng khớp (thử lại an toàn).
3. `STALE_REPLAY`: Số thứ tự bị lùi hoặc cũ.
4. `MUTATED_REPLAY`: Tái sử dụng nonce nhưng thay đổi nội dung payload.
5. `CROSS_SCOPE_REPLAY`: Phát lại vào phạm vi bị sai lệch.
6. `CROSS_DEVICE_REPLAY`: Phát lại dưới danh tính thiết bị khác.
7. `REVOKED_REPLAY`: Yêu cầu phát lại từ thiết bị đã bị thu hồi.
Mọi tình huống không an toàn đều bị chặn đứng tức thì.

---

## 14. PROTOCOL VERSION / PHIÊN BẢN GIAO THỨC

### English
The protocol version is strictly locked at `4.0.0`. Protocol downgrade (e.g. `3.9.0`) or incompatible future versions (e.g. `5.0.0`) fail closed with typed error `PAIRING_PROTOCOL_MISMATCH`.

### Tiếng Việt
Phiên bản giao thức được khóa cứng ở mức `4.0.0`. Mọi nỗ lực hạ cấp giao thức hoặc giao thức tương lai không tương thích đều bị từ chối với lỗi `PAIRING_PROTOCOL_MISMATCH`.

---

## 15. AUDIT & SECRET SCRUBBING / KIỂM TOÁN & LÀM SẠCH BÍ MẬT

### English
Every lifecycle event is recorded in the append-only `PairingAuditLedger`. All credentials and sensitive fields (`password`, `token`, `secret`, `apiKey`, `authorization`, `cookie`, `privateKey`, `credential`) are scrubbed and replaced with `[REDACTED]` prior to writing to audits or error descriptors.

### Tiếng Việt
Mọi sự kiện vòng đời đều được ghi nhận vào sổ kiểm toán append-only `PairingAuditLedger`. Tất cả các khóa nhạy cảm và thông tin xác thực đều được tự động thay thế bằng `[REDACTED]` trước khi ghi vào nhật ký kiểm toán hoặc thông báo lỗi.

---

## 16. MOBILE READINESS / SẴN SÀNG CHO BOW-MOBILE

### English
Enables the target future user experience for BOW-Mobile:
1. First connection: Pair device -> Brain generates `device_<fp>` -> User confirms -> Device is `TRUSTED`.
2. Subsequent connections: App opens -> Presents device presentation -> `recognizeDevice()` confirms trust -> ConnectionRuntime established -> Session active **without username/password prompts**.

### Tiếng Việt
Hiện thực hóa trải nghiệm đích cho BOW-Mobile:
1. Lần đầu: Ghép đôi -> Brain tạo `device_<fp>` -> Người dùng bấm xác nhận -> Thiết bị thành `TRUSTED`.
2. Các lần tiếp theo: Mở app -> Trình diện danh tính thiết bị -> `recognizeDevice()` xác nhận tin cậy -> Thiết lập ConnectionRuntime -> Phiên hoạt động **không cần hỏi mật khẩu**.

---

## 17. ROBOT READINESS / SẴN SÀNG CHO BOW-ROBOT

### English
A `BOW-ROBOT` device surface can be paired and trusted. However:
`ROBOT_TRUSTED ≠ PHYSICAL_ACTUATION_AUTHORIZED`.
Actuator movement remains strictly governed by Brain planning, PDP policies, physical interlocks, and VerificationService.

### Tiếng Việt
Bề mặt `BOW-ROBOT` có thể được ghép đôi và tin cậy. Tuy nhiên:
`ROBOT_TRUSTED ≠ ĐƯỢC_QUYỀN_CHUYỂN_ĐỘNG_VẬT_LÝ`.
Mọi cử động của cơ cấu chấp hành vẫn phải qua lập kế hoạch của Brain, kiểm tra PDP, khóa liên động phần cứng và xác minh sau thực thi.

---

## 18. DESKTOP READINESS / SẴN SÀNG CHO DESKTOP

### English
Operator workstations paired as `DESKTOP` surfaces gain recognized communication channels, but do not automatically acquire rights to execute tools or bypass human approval requirements.

### Tiếng Việt
Máy trạm vận hành ghép đôi dưới loại `DESKTOP` có được kênh truyền thông tin cậy, nhưng không tự động có quyền thực thi công cụ tùy tiện hay bỏ qua yêu cầu phê duyệt của con người.

---

## 19. NO-LOGIN MODEL / MÔ HÌNH KHÔNG DÙNG MẬT KHẨU

### English
Eliminates traditional credential entry without compromising security. Security is derived from deterministic identities, 9-tuple scope isolation, FNV-1a digests, replay defense, and authoritative revocation.

### Tiếng Việt
Loại bỏ việc nhập tài khoản/mật khẩu truyền thống mà không làm suy giảm an ninh. Tính an toàn dựa trên danh tính tất định, cô lập phạm vi 9-tuple, mã băm FNV-1a, phòng chống phát lại và thu hồi có thẩm quyền.

---

## 20. SECURITY INVARIANTS / CÁC BẤT BIẾN AN NINH

```text
CONNECTED             ≠  PAIRED
PAIRED                ≠  AUTHENTICATED
AUTHENTICATED         ≠  AUTHORIZED
AUTHORIZED            ≠  EXECUTED
DELIVERED             ≠  TASK_SUCCESS
ACKNOWLEDGED          ≠  TASK_SUCCESS
DEVICE TRUST          ≠  BRAIN AUTHORITY
REMOTE SESSION        ≠  BRAIN SESSION
NETWORK CONNECTION    ≠  DEVICE TRUST
DEVICE TRUST          ≠  EXECUTION AUTHORITY
```

---

## 21. CONNECTION RUNTIME RELATIONSHIP / QUAN HỆ VỚI CONNECTION RUNTIME

### English
The strict operational hierarchy is preserved:
`PAIRING / TRUST` -> `CONNECTION` -> `AUTHENTICATION` -> `AUTHORIZATION` -> `EXECUTION`.
PairingRuntime establishes device trust; ConnectionRuntime manages bidirectional communication; ToolRegistry executes actions only when authorized by PDP.

### Tiếng Việt
Hệ thống duy trì tôn ti trật tự vận hành nghiêm ngặt:
`PAIRING / TRUST` -> `CONNECTION` -> `AUTHENTICATION` -> `AUTHORIZATION` -> `EXECUTION`.
PairingRuntime thiết lập độ tin cậy; ConnectionRuntime quản lý truyền thông hai chiều; ToolRegistry chỉ thực thi khi có sự cho phép từ PDP.

---

## 22. BRAIN AUTHORITY / THẨM QUYỀN DUY NHẤT CỦA BỘ NÃO

### English
There is exactly **ONE AUTHORITATIVE BOWCON BRAIN**. Neither pairing, nor connections, nor mobile surfaces can usurp the Brain's cognitive, planning, memory, or governance authority.

### Tiếng Việt
Chỉ có duy nhất **MỘT BỘ NÃO BOWCON CÓ THẨM QUYỀN**. Cả việc ghép đôi, kết nối mạng hay bề mặt di động đều không thể tiếm quyền nhận thức, lập kế hoạch, bộ nhớ hay quản trị của Brain.

---

## 23. WHAT IS REAL IN MS-1.3.23 / NHỮNG GÌ LÀ THẬT TRONG MS-1.3.23

- **20 Real Core Modules**:
  - `pairingTypes.ts`, `pairingStates.ts`, `pairingTransitions.ts`, `pairingFingerprint.ts`, `pairingIdentity.ts`
  - `pairingScope.ts`, `pairingCapabilities.ts`, `pairingRecord.ts`, `pairingRequest.ts`, `pairingResponse.ts`
  - `pairingConfirmation.ts`, `pairingReplay.ts`, `pairingRevocation.ts`, `pairingRecognition.ts`, `pairingRegistry.ts`
  - `pairingTrustRegistry.ts`, `pairingAudit.ts`, `pairingError.ts`, `pairingRuntime.ts`, `index.ts`
- **Integrations**: `AgentLoop` (non-cognitive pairingContext), `src/index.ts` export.
- **Dedicated Test Suite**: 210 passing assertions across 41 categories (A–AO).
- **Full Regression**: 25 test suites, 1,760 passing assertions, 0 failures.

---

## 24. WHAT REMAINS FUTURE WORK / NHỮNG GÌ THUỘC VỀ TƯƠNG LAI

The following are deliberately NOT implemented in this foundation milestone and remain future surface/adapter work:
- Mobile UI (React Native / Flutter / Swift iOS / Kotlin Android)
- QR code scanning camera UI
- Bluetooth Low Energy (BLE) peripheral/central drivers
- Near Field Communication (NFC) hardware drivers
- Cloud relay servers / external identity providers (OAuth, IdP)
- Asymmetric public key exchange / hardware secure enclave integration
- Robot physical motor control
- Desktop screen capture / OS automation daemons
