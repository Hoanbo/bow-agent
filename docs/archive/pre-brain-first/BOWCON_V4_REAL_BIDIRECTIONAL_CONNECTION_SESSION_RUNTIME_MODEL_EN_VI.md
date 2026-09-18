# BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME MODEL (EN / VI)
# MÔ HÌNH THỜI GIAN CHẠY KẾT NỐI VÀ PHIÊN BẢO MẬT HAI CHIỀU THỰC TẾ BOWCON V4.0 (ANH / VIỆT)

**Document ID**: `BOWCON-V4-DOC-MS-1.3.22`  
**Milestone**: `MS-1.3.22`  
**Package**: `@bow/agent` (`4.0.0` STRICTLY LOCKED)  
**Security Boundary**: `C:\BOW\shopofbow` FROZEN (0 reads, 0 writes, 0 imports, 0 touches)  
**Authors**: Antigravity AI & BOW Architecture Team  

---

## 1. PURPOSE / MỤC ĐÍCH
- **EN**: Defines the authoritative bidirectional connection and session runtime model for BOWCON V4.0. Upgrades the MS-1.3.21 Network Adapter Foundation into an operational, adapter-agnostic bidirectional session runtime capable of securely connecting external surfaces (`BOW-Mobile`, `BOW-Robot`, `Desktop`, `Web`, `Voice`) while preserving the Brain as the sole cognitive and execution authority.
- **VI**: Định nghĩa mô hình thời gian chạy kết nối và phiên hai chiều có thẩm quyền cho BOWCON V4.0. Nâng cấp Nền tảng Adapter Mạng MS-1.3.21 thành runtime phiên hai chiều độc lập với adapter, kết nối an toàn các bề mặt bên ngoài (`BOW-Mobile`, `BOW-Robot`, `Desktop`, `Web`, `Voice`) trong khi bảo toàn Brain là thẩm quyền nhận thức và thực thi duy nhất.

---

## 2. SCOPE / PHẠM VI
- **EN**: Applies to all inbound and outbound bidirectional communication channels between external client surfaces and the BOWCON Brain. Enforces strict separation between communication boundaries and cognitive boundaries.
- **VI**: Áp dụng cho tất cả các kênh giao tiếp hai chiều vào/ra giữa các bề mặt khách bên ngoài và BOWCON Brain. Thực thi phân tách nghiêm ngặt giữa ranh giới giao tiếp và ranh giới nhận thức.

---

## 3. ARCHITECTURE / KIẾN TRÚC TỔNG THỂ
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
                  REAL BIDIRECTIONAL CONNECTION RUNTIME (MS-1.3.22)
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
     BOW-Mobile                  BOW-Robot                   Desktop
      Surface                     Surface                    Surface
```

---

## 4. BRAIN AUTHORITY / THẨM QUYỀN CỦA BRAIN
- **EN**: The Brain remains the sole authority for identity, memory, intent, planning, reasoning, policy evaluation (PDP), approvals, tool execution, verification, lifecycle, commit, recovery, coordination, and synchronization. No remote surface or connection runtime is a secondary brain.
- **VI**: Brain vẫn là cơ quan thẩm quyền duy nhất đối với danh tính, bộ nhớ, ý định, lập kế hoạch, suy luận, đánh giá chính sách (PDP), phê duyệt, thực thi công cụ, xác minh, vòng đời, commit, phục hồi, điều phối và đồng bộ hóa. Không có bề mặt từ xa hoặc runtime kết nối nào là bộ não thứ hai.

---

## 5. CONNECTION AUTHORITY / THẨM QUYỀN KẾT NỐI
- **EN**: ConnectionRuntime has authority over connection lifecycle, handshake progression, peer authentication, capability negotiation, message routing, sequence tracking, replay detection, heartbeat health, and backpressure. It has ZERO execution or cognitive authority.
- **VI**: ConnectionRuntime có thẩm quyền quản lý vòng đời kết nối, tiến trình bắt tay, xác thực đồng đẳng, đàm phán năng lực, điều hướng thông điệp, theo dõi chuỗi, phát hiện phát lại, nhịp tim và áp lực ngược. Nó hoàn toàn KHÔNG có thẩm quyền thực thi hoặc nhận thức.

---

## 6. NETWORK ADAPTER / ADAPTER MẠNG
- **EN**: Clean `NetworkConnectionAdapter` abstraction isolating transport details (in-memory, WebSocket, HTTP streaming, QUIC, LAN). Zero OS network sockets or background daemons are spawned in core logic.
- **VI**: Bản trừu tượng `NetworkConnectionAdapter` sạch sẽ cô lập chi tiết tầng truyền dẫn (bộ nhớ trong, WebSocket, HTTP streaming, QUIC, LAN). Không khởi tạo socket OS hay tiến trình nền nào trong mã nguồn lõi.

---

## 7. GATEWAY BOUNDARY / RANH GIỚI GATEWAY
- **EN**: `RemoteGateway` operates upstream of `ConnectionRuntime`, verifying protocol envelopes and security parameters before delegating to connection channels.
- **VI**: `RemoteGateway` hoạt động phía trước `ConnectionRuntime`, xác minh các bao bì giao thức và tham số an ninh trước khi chuyển tiếp cho các kênh kết nối.

---

## 8. TRANSPORT SERVICE / DỊCH VỤ TRANSPORT
- **EN**: `TransportService` provides multi-surface message serialization and frame multiplexing. ConnectionRuntime sits below Transport to manage stateful peer sessions.
- **VI**: `TransportService` cung cấp tuần tự hóa thông điệp và ghép kênh khung đa bề mặt. ConnectionRuntime nằm dưới Transport để quản lý các phiên đồng đẳng có trạng thái.

---

## 9. CONNECTION IDENTITY / DANH TÍNH KẾT NỐI
- **EN**: Deterministic `conn_<fingerprint>` format derived via 32-bit FNV-1a hash over peer, surface, transport, adapter, and gateway IDs. Absolutely zero `Math.random()`, UUIDs, or timestamps in identity.
- **VI**: Định dạng `conn_<fingerprint>` xác định sinh bởi băm FNV-1a 32-bit trên ID đồng đẳng, bề mặt, transport, adapter và gateway. Tuyệt đối không dùng `Math.random()`, UUID hay dấu thời gian trong định danh.

---

## 10. PEER IDENTITY / DANH TÍNH ĐỒNG ĐẲNG
- **EN**: Deterministic `peer_<fingerprint>` format derived from userId, surfaceId, deviceId, and role.
- **VI**: Định dạng `peer_<fingerprint>` xác định sinh từ userId, surfaceId, deviceId và role.

---

## 11. SESSION IDENTITY / DANH TÍNH PHIÊN
- **EN**: Deterministic `csess_<fingerprint>` format binding connection, peer, brain, and session contexts into an immutable token.
- **VI**: Định dạng `csess_<fingerprint>` xác định ràng buộc ngữ cảnh kết nối, đồng đẳng, brain và session thành một mã định danh bất biến.

---

## 12. SCOPE ISOLATION / CÔ LẬP PHẠM VI (8-TUPLE)
- **EN**: Mandatory 8-tuple string: `${userId}::${sessionId}::${brainId}::${surfaceId}::${transportId}::${gatewayId}::${adapterId}::${connectionId}`. Any scope mismatch fails closed with `CONNECTION_SCOPE_MISMATCH`.
- **VI**: Chuỗi 8 thành phần bắt buộc: `${userId}::${sessionId}::${brainId}::${surfaceId}::${transportId}::${gatewayId}::${adapterId}::${connectionId}`. Bất kỳ sai lệch phạm vi nào đều thất bại đóng với `CONNECTION_SCOPE_MISMATCH`.

---

## 13. HANDSHAKE LIFECYCLE / VÒNG ĐỜI BẮT TAY
- **EN**: Linear 7-stage negotiation: `HELLO` → `CAPABILITY_OFFER` → `CAPABILITY_ACCEPT` → `AUTH_REQUEST` → `AUTH_RESULT` → `SESSION_ESTABLISHED` → `READY`. Skipping stages is prohibited. Handshake does not imply authorization or execution.
- **VI**: Đàm phán 7 giai đoạn tuần tự: `HELLO` → `CAPABILITY_OFFER` → `CAPABILITY_ACCEPT` → `AUTH_REQUEST` → `AUTH_RESULT` → `SESSION_ESTABLISHED` → `READY`. Nghiêm cấm nhảy cóc giai đoạn. Bắt tay không đồng nghĩa với ủy quyền hay thực thi.

---

## 14. AUTHENTICATION / XÁC THỰC
- **EN**: Validates peer principal against expected user identity. Enforces `AUTHENTICATED ≠ AUTHORIZED`. Authentication establishes identity only.
- **VI**: Xác thực định danh người dùng đối chiếu với danh tính mong đợi. Thực thi `AUTHENTICATED ≠ AUTHORIZED`. Xác thực chỉ thiết lập danh tính.

---

## 15. AUTHORIZATION / ỦY QUYỀN
- **EN**: Evaluates requested capabilities against safe policy lists. Enforces `AUTHORIZED ≠ EXECUTED`.
- **VI**: Đánh giá các năng lực được yêu cầu so với danh sách chính sách an toàn. Thực thi `AUTHORIZED ≠ EXECUTED`.

---

## 16. CAPABILITIES / NĂNG LỰC KẾT NỐI
- **EN**: Allowed data capabilities: `OBSERVE_EVENTS`, `RECEIVE_STATUS`, `SEND_STATUS`, `ACK_MESSAGES`, `REQUEST_SCREEN_CAPTURE`, `RECEIVE_SCREEN_CAPTURE`, `REQUEST_SCREEN_DESCRIPTION`, `RECEIVE_DESCRIPTION`, `REQUEST_ROBOT_STATUS`, `RECEIVE_ROBOT_STATUS`, `REQUEST_DEVICE_STATUS`, `RECEIVE_DEVICE_STATUS`. Forbidden: `EXECUTE_TOOL`, `DIRECT_TOOL_EXECUTION`, `MUTATE_BRAIN`, `BYPASS_PDP`, `BYPASS_APPROVAL`, `BYPASS_VERIFICATION`, `BYPASS_COMMIT`, `FORCE_RECOVERY`, `CHANGE_GOVERNANCE`.
- **VI**: Năng lực dữ liệu cho phép: xem danh sách tiếng Anh. Nghiêm cấm các năng lực nhận thức/thực thi: thực thi công cụ trực tiếp, sửa đổi bộ nhớ brain, bỏ qua PDP, bỏ qua duyệt, bỏ qua xác minh, bỏ qua commit, cưỡng ép phục hồi, thay đổi quản trị.

---

## 17. MESSAGE LIFECYCLE / VÒNG ĐỜI THÔNG ĐIỆP
- **EN**: All messages are deep frozen, deterministically fingerprinted (`cmsg_<fp>`), sequenced with monotonic integers (>=1), and routed across dedicated channels.
- **VI**: Mọi thông điệp đều được đóng băng sâu (deepFreeze), băm xác định (`cmsg_<fp>`), đánh số thứ tự đơn điệu (>=1), và điều hướng qua các kênh chuyên biệt.

---

## 18. ORDERING & SEQUENCE / THỨ TỰ VÀ CHUỖI
- **EN**: Monotonic ordering enforced per connection. Detects gaps (`CONNECTION_SEQUENCE_GAP`), stale messages, and forbids sequence rewind (`CONNECTION_SEQUENCE_REWIND`).
- **VI**: Thực thi thứ tự đơn điệu trên mỗi kết nối. Phát hiện đứt đoạn chuỗi, thông điệp cũ, và cấm đảo ngược số thứ tự.

---

## 19. REPLAY PROTECTION / BẢO VỆ CHỐNG PHÁT LẠI
- **EN**: `ConnectionReplayDetector` categorizes inbound traffic into `VALID_NEW_MESSAGE`, `IDEMPOTENT_DUPLICATE`, `STALE_MESSAGE`, `MUTATED_REPLAY`, and `CROSS_SCOPE_REPLAY`. Mutated replays fail closed immediately.
- **VI**: `ConnectionReplayDetector` phân loại lưu lượng đến thành thông điệp mới, trùng lặp bất biến, thông điệp cũ, phát lại bị sửa đổi, và phát lại xuyên phạm vi. Phát lại bị sửa đổi bị từ chối đóng ngay lập tức.

---

## 20. HEARTBEAT / NHỊP TIM
- **EN**: Periodic `ConnectionHeartbeatSignal` and `ConnectionHeartbeatAck` verify physical liveness. Health states: `HEALTHY`, `DEGRADED`, `UNHEALTHY`. Heartbeat NEVER implies task success or tool execution.
- **VI**: `ConnectionHeartbeatSignal` và `ConnectionHeartbeatAck` định kỳ kiểm tra sự sống vật lý. Trạng thái: `HEALTHY`, `DEGRADED`, `UNHEALTHY`. Nhịp tim TUYỆT ĐỐI KHÔNG biểu thị thành công nhiệm vụ hay thực thi công cụ.

---

## 21. RECONNECT / KẾT NỐI LẠI
- **EN**: `ConnectionReconnectRequest` re-establishes a broken transport. Validates 8-tuple scope, session ID, peer ID, and sequence continuity. Reconnect NEVER duplicates state or auto-executes interrupted tasks.
- **VI**: `ConnectionReconnectRequest` tái thiết lập kênh truyền bị gián đoạn. Kiểm tra phạm vi 8 thành phần, session ID, peer ID và tính liên tục của chuỗi. Kết nối lại KHÔNG BAO GIỜ nhân bản trạng thái hoặc tự động chạy lại các tác vụ bị ngắt.

---

## 22. RESUME / KHÔI PHỤC PHIÊN
- **EN**: Resumes session progression from the last verified server-acknowledged sequence without loss or reset.
- **VI**: Khôi phục tiến trình phiên từ số thứ tự cuối cùng được máy chủ xác nhận mà không mất mát hoặc bị reset chuỗi.

---

## 23. BACKPRESSURE / ÁP LỰC NGƯỢC
- **EN**: 5 levels: `NORMAL` (0-30%), `MODERATE` (30-60%), `HIGH` (60-80%), `CRITICAL` (80-100%), `OVERFLOW` (>=100%). Zero silent drops. At OVERFLOW, non-critical messages are rejected with explicit typed error.
- **VI**: 5 mức áp lực: `NORMAL`, `MODERATE`, `HIGH`, `CRITICAL`, `OVERFLOW`. Tuyệt đối không xóa bỏ ngầm thông điệp. Tại mức OVERFLOW, các thông điệp không khẩn cấp bị từ chối với lỗi rõ ràng.

---

## 24. TIMEOUT HANDLING / XỬ LÝ TIMEOUT
- **EN**: 8 typed categories (`CONNECT_TIMEOUT`, `HANDSHAKE_TIMEOUT`, `AUTH_TIMEOUT`, `AUTHORIZATION_TIMEOUT`, `IDLE_TIMEOUT`, `HEARTBEAT_TIMEOUT`, `MESSAGE_TIMEOUT`, `RECONNECT_TIMEOUT`).
- **VI**: 8 danh mục timeout có kiểu rõ ràng, ghi nhận chính xác thời gian trôi qua và ngưỡng kiểm tra.

---

## 25. FAILURE MODEL / MÔ HÌNH THẤT BẠI
- **EN**: Immutable `ConnectionFailureDescriptor` with automatic secret redaction (`password`, `token`, `secret`, `apiKey`, `cookie`, `credential`).
- **VI**: `ConnectionFailureDescriptor` bất biến với khả năng tự động khử thông tin nhạy cảm.

---

## 26. AUDIT LEDGER / SỔ CÁI KIỂM TOÁN
- **EN**: Immutable `ConnectionAuditRecord` stored in memory ledger for full operational forensics across all connection events.
- **VI**: `ConnectionAuditRecord` bất biến lưu trong sổ cái bộ nhớ để phục vụ điều tra hoạt động toàn diện qua tất cả sự kiện kết nối.

---

## 27. SECURITY HARDENING / GIA CỐ BẢO MẬT
- **EN**: Built-in defenses against prototype pollution (`__proto__`, `constructor`), null-byte injection (`\0`), path traversal (`../`), Windows reserved names (`CON`, `PRN`, `NUL`, `COM1-9`, `LPT1-9`), and payload bloat (>2MB).
- **VI**: Phòng thủ tích hợp chống ô nhiễm prototype, chèn null-byte, duyệt đường dẫn, tên thiết bị Windows dành riêng và tràn tải thông điệp.

---

## 28. RISK PRESERVATION / BẢO TOÀN MỨC ĐỘ RỦI RO
- **EN**: Risk levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) may stay equal or escalate; risk downgrade is strictly rejected (`CONNECTION_RISK_DOWNGRADE_DENIED`).
- **VI**: Mức độ rủi ro có thể giữ nguyên hoặc tăng lên; việc hạ thấp mức rủi ro bị từ chối nghiêm ngặt.

---

## 29. MOBILE ARCHITECTURE / KIẾN TRÚC BOW-MOBILE
- **EN**: BOW-Mobile acts as an observational and interaction surface. Sends requests (`REQUEST_SCREEN_CAPTURE`, `REQUEST_ROBOT_STATUS`), receives events, but does NOT run local LLM, PDP, or authoritative memory.
- **VI**: BOW-Mobile đóng vai trò là bề mặt quan sát và tương tác. Gửi yêu cầu, nhận sự kiện, nhưng KHÔNG chạy LLM, PDP hay bộ nhớ có thẩm quyền cục bộ.

---

## 30. ROBOT ARCHITECTURE / KIẾN TRÚC BOW-ROBOT
- **EN**: BOW-Robot acts as an embodied sensor and actuation surface. Telemetry streams in as data; actions require explicit Brain planning and PDP approval.
- **VI**: BOW-Robot đóng vai trò là bề mặt cảm biến và thực thi cơ học. Dữ liệu đo đạc truyền vào dưới dạng data; hành động yêu cầu Brain lập kế hoạch và PDP phê duyệt.

---

## 31. SCREEN CAPTURE REQUEST FLOW / LUỒNG YÊU CẦU CHỤP MÀN HÌNH
- **EN**: Flow: `Mobile Surface` → `REQUEST_SCREEN_CAPTURE` → `ConnectionRuntime` → `RemoteGateway` → `Transport` → `Brain` → (Governed Tool Execution on Desktop Surface) → `SCREEN_CAPTURE_READY` → `Brain` → `Mobile Surface`.
- **VI**: Luồng: `Mobile` gửi yêu cầu chụp màn hình → đi qua kết nối an toàn → Brain thẩm định và điều phối thực thi trên bề mặt Desktop → kết quả trả về cho Mobile. Ranh giới kết nối chỉ vận chuyển yêu cầu/kết quả, không tự chụp màn hình.

---

## 32. FUTURE DEVICE ADAPTERS / ADAPTER THIẾT BỊ TƯƠNG LAI
- **EN**: Future adapters (WebSocket, QUIC, Bluetooth LE, WebRTC DataChannels) implement `NetworkConnectionAdapter` without modifying Brain core or ConnectionRuntime rules.
- **VI**: Các adapter tương lai chỉ cần triển khai `NetworkConnectionAdapter` mà không thay đổi lõi Brain hay các quy tắc của ConnectionRuntime.

---

## 33. GOVERNANCE BOUNDARY / RANH GIỚI QUẢN TRỊ
- **EN**: PDP (`globalPDP`) and `ApprovalService` remain 100% authoritative and untouched by connection logic.
- **VI**: PDP và `ApprovalService` giữ nguyên thẩm quyền 100% và không bị can thiệp bởi tầng kết nối.

---

## 34. EXECUTION BOUNDARY / RANH GIỚI THỰC THI
- **EN**: `ToolRegistry` and `ExecutionService` execute actions. The connection runtime executes zero tools and zero shell commands.
- **VI**: `ToolRegistry` và `ExecutionService` thực thi công cụ. Tầng kết nối thực thi 0 công cụ và 0 lệnh shell.

---

## 35. VERIFICATION BOUNDARY / RANH GIỚI XÁC MINH
- **EN**: `DELIVERED ≠ TASK_SUCCESS` and `ACKNOWLEDGED ≠ TASK_SUCCESS`. VerificationService evaluates postconditions independently.
- **VI**: Chuyển giao thông điệp thành công không có nghĩa là nhiệm vụ thành công. VerificationService thẩm định điều kiện độc lập.

---

## 36. RECOVERY BOUNDARY / RANH GIỚI PHỤC HỒI
- **EN**: RecoveryService manages durable consistency. Connection reconnect restores transport communication without re-executing actions.
- **VI**: RecoveryService quản lý tính nhất quán bền vững. Kết nối lại chỉ khôi phục kênh truyền mà không tự tiện thực thi lại tác vụ.
