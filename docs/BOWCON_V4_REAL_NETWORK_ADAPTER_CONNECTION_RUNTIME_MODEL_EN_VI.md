# BOWCON V4.0 — MS-1.3.21 REAL NETWORK ADAPTER & CONNECTION RUNTIME MODEL (EN & VI)
**Package:** `@bow/agent` | **Version:** `4.0.0` | **Level:** L4 Autonomous Universal Brain Architecture

---

## 1. Executive Summary / Tóm tắt Điều hành

### EN:
Milestone MS-1.3.21 establishes the authoritative **Real Network Adapter & Connection Runtime Foundation** for BOWCON V4.0. It builds the operational adapter and connection runtime layer positioned between `SecureRemoteGateway` (MS-1.3.20) / `TransportService` (MS-1.3.19) and physical remote embodiment surfaces (BOW-Mobile, BOW-Robot, BOW-Desktop, BOW-Web, BOW-Voice).

**REALITY NOTICE / TÌNH TRẠNG THỰC TẾ:**
- **IMPLEMENTED NOW (Đã triển khai hiện tại):** Full network adapter abstraction contract (`NetworkAdapter`), multi-tenant connection lifecycle engine (`NetworkConnection`), canonical immutable framing (`NetworkFrame`), deterministic fail-closed framing codec (`NetworkCodec`), in-memory testable adapter (`NetworkInMemoryAdapter`), runtime coordinator (`NetworkRuntime`), scope-isolated registry (`NetworkRegistry`), heartbeat liveness evaluator, reconnect validator, timeout classifier, and data-only backpressure propagation.
- **READY FOR FUTURE (Sẵn sàng cho tương lai):** Physical socket/TCP, WebSocket, HTTPS, QUIC, LAN, and Internet adapters; native iOS/Android mobile runtimes; physical robot motor/sensor runtimes. MS-1.3.21 **DOES NOT** open real external OS ports or run background network daemons.

### VI:
Cột mốc MS-1.3.21 thiết lập nền tảng **Bộ điều hợp Mạng Thực tế & Runtime Kết nối (Real Network Adapter & Connection Runtime Foundation)** có thẩm quyền cho BOWCON V4.0. Nó xây dựng tầng adapter hoạt động và runtime kết nối nằm giữa `SecureRemoteGateway` (MS-1.3.20) / `TransportService` (MS-1.3.19) và các bề mặt hiện thân vật lý từ xa (BOW-Mobile, BOW-Robot, BOW-Desktop, BOW-Web, BOW-Voice).

---

## 2. Architecture / Kiến trúc

```
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
                      NETWORK ADAPTER (MS-1.3.21)
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
      Local/LAN Adapter (Future)              Internet Adapter (Future)
      In-Memory Adapter (Current)
              │                                         │
              └────────────────────┬────────────────────┘
                                   ▼
                            Remote Surfaces
              ┌──────────────┬─────┴───────┬──────────────┐
              ▼              ▼             ▼              ▼
          BOW-Mobile    BOW-Desktop    BOW-Robot      Web/Voice
```

---

## 3. Network Adapter Model / Mô hình Bộ điều hợp Mạng

### EN:
The `NetworkAdapter` interface (`src/core/network/networkAdapter.ts`) is the authoritative contract connecting external communication channels to the Brain. Adapters are purely transmission conduits; they hold zero cognitive authority, cannot plan tasks, cannot invoke tools, and cannot evaluate policies.

### VI:
Giao diện `NetworkAdapter` (`src/core/network/networkAdapter.ts`) là hợp đồng có thẩm quyền kết nối các kênh truyền thông bên ngoài vào Não bộ. Adapter hoàn toàn là các kênh truyền tải; chúng không nắm giữ thẩm quyền nhận thức, không lập kế hoạch, không gọi công cụ và không đánh giá chính sách.

---

## 4. Connection Model / Mô hình Kết nối

### EN:
A `NetworkConnectionSnapshot` represents an immutable state record of a communication channel bound to the 7-tuple: `(userId, sessionId, brainId, surfaceId, transportId, gatewayId, networkAdapterId)`. Connection identifiers follow the deterministic pattern `net_<fnv1a>`.

### VI:
`NetworkConnectionSnapshot` đại diện cho bản ghi trạng thái bất biến của một kênh truyền thông được ràng buộc vào bộ 7: `(userId, sessionId, brainId, surfaceId, transportId, gatewayId, networkAdapterId)`. Định danh kết nối tuân theo mẫu tất định `net_<fnv1a>`.

---

## 5. Network Frame / Khung Mạng (Network Frame)

### EN:
`NetworkFrame` (`src/core/network/networkFrame.ts`) is the canonical immutable envelope. It encapsulates `frameId`, `protocolVersion`, `networkConnectionId`, `sequence`, `direction` (`INBOUND` | `OUTBOUND` | `BIDIRECTIONAL`), `messageType`, `payload`, `payloadLength`, and `checksum`. Frames are deeply frozen and deterministic.

### VI:
`NetworkFrame` (`src/core/network/networkFrame.ts`) là phong bì chuẩn mực bất biến. Nó đóng gói `frameId`, `protocolVersion`, `networkConnectionId`, `sequence`, `direction` (`INBOUND` | `OUTBOUND` | `BIDIRECTIONAL`), `messageType`, `payload`, `payloadLength`, và `checksum`. Các khung được đóng băng sâu và tất định.

---

## 6. Codec / Trình Mã hóa & Giải mã (NetworkCodec)

### EN:
`NetworkCodec` (`src/core/network/networkCodec.ts`) provides deterministic serialization and deserialization. It validates frame structure, enforces payload limits (64 KB) and depth limits (8 levels), verifies checksums and fingerprints, and defends against prototype pollution, null bytes, path traversal, and Windows reserved device names. Secrets are automatically scrubbed on error.

### VI:
`NetworkCodec` (`src/core/network/networkCodec.ts`) cung cấp khả năng tuần tự hóa và giải mã tất định. Nó xác thực cấu trúc khung, thực thi giới hạn payload (64 KB) và độ sâu (8 cấp), kiểm tra checksum và fingerprint, đồng thời phòng thủ chống prototype pollution, ký tự null, duyệt đường dẫn và tên thiết bị Windows. Bí mật được tự động thanh lọc khi phát sinh lỗi.

---

## 7. Runtime / Động cơ Runtime Mạng (NetworkRuntime)

### EN:
`NetworkRuntime` (`src/core/network/networkRuntime.ts`) coordinates adapters, connections, frame routing, heartbeat liveness, reconnection, timeouts, and backpressure. It is integrated into `AgentLoop` via dependency injection (`getNetworkRuntime()`).

### VI:
`NetworkRuntime` (`src/core/network/networkRuntime.ts`) điều phối các adapter, kết nối, định tuyến khung, nhịp tim sống còn, kết nối lại, timeout và áp lực ngược. Nó được tích hợp vào `AgentLoop` thông qua tiêm phụ thuộc (`getNetworkRuntime()`).

---

## 8. Listener / Trình Lắng nghe Sự kiện & Khung Mạng

### EN:
`NetworkListenerRegistry` (`src/core/network/networkListener.ts`) provides pure in-memory pub-sub mechanics for frame arrivals and network lifecycle events (`CONNECTION_OPENED`, `CONNECTION_CLOSED`, `FRAME_SENT`, etc.) without operating real OS sockets.

### VI:
`NetworkListenerRegistry` (`src/core/network/networkListener.ts`) cung cấp cơ chế pub-sub thuần bộ nhớ cho các khung mạng đến và các sự kiện vòng đời mạng (`CONNECTION_OPENED`, `CONNECTION_CLOSED`, `FRAME_SENT`, v.v.) mà không cần chạy socket hệ điều hành thực.

---

## 9. Heartbeat / Nhịp tim Sống còn

### EN:
**CRITICAL INVARIANT: `HEARTBEAT_ALIVE ≠ TASK_SUCCESS`**.
`createNetworkHeartbeatSignal`, `createNetworkHeartbeatAck`, and `evaluateNetworkHeartbeat` verify channel liveness only. A live heartbeat signal never implies that a tool succeeded, that a plan finished, or that a state commit completed.

### VI:
**BẢO ĐẢM CỐT TỬ: `NHỊP TIM CÒN SỐNG ≠ TÁC VỤ THÀNH CÔNG`**.
Các hàm nhịp tim chỉ xác minh tính sống còn của kênh truyền thông. Một tín hiệu nhịp tim không bao giờ biểu thị rằng công cụ đã thành công, kế hoạch đã hoàn tất hay cam kết trạng thái đã xong.

---

## 10. Timeout / Xử lý Quá hạn Thời gian

### EN:
`evaluateNetworkTimeout` classifies timeouts into `CONNECT_TIMEOUT`, `FRAME_TIMEOUT`, `HEARTBEAT_TIMEOUT`, `RESPONSE_TIMEOUT`, and `RECONNECT_TIMEOUT`. Timeouts produce strongly typed failure descriptors and never trigger silent retries of dangerous operations.

### VI:
`evaluateNetworkTimeout` phân loại timeout thành `CONNECT_TIMEOUT`, `FRAME_TIMEOUT`, `HEARTBEAT_TIMEOUT`, `RESPONSE_TIMEOUT` và `RECONNECT_TIMEOUT`. Timeout tạo ra bộ mô tả lỗi định kiểu mạnh và không bao giờ âm thầm thử lại các thao tác nguy hiểm.

---

## 11. Reconnect / Kết nối Lại

### EN:
**CRITICAL INVARIANT: `RECONNECT ≠ NEW_BRAIN`**.
`evaluateNetworkReconnect` verifies that the 7-tuple scope matches, that the previous connection exists, and that the sequence has not rolled back. Reconnection resumes the existing session and never creates a secondary Brain.

### VI:
**BẢO ĐẢM CỐT TỬ: `RECONNECT ≠ NEW_BRAIN`**.
`evaluateNetworkReconnect` xác thực rằng phạm vi bộ 7 khớp chính xác, kết nối trước đó tồn tại và chuỗi không bị tua lùi. Kết nối lại tiếp tục phiên hiện có và không bao giờ tạo ra Não bộ thứ hai.

---

## 12. Sequence / Quản lý Chuỗi Số

### EN:
Monotonic sequencing guarantees strictly ordered message processing. Rollbacks and negative sequences are rejected fail-closed.

### VI:
Chuỗi số đơn điệu đảm bảo xử lý thông điệp theo đúng thứ tự nghiêm ngặt. Việc tua lùi và số chuỗi âm đều bị từ chối đóng an toàn.

---

## 13. Replay Defense / Chống Phát lại Khung

### EN:
Payload checksum verification ensures that mutated payloads sharing an existing sequence number are detected and rejected as tampering attempts.

### VI:
Xác thực checksum payload đảm bảo rằng các payload bị biến đổi nhưng dùng lại số chuỗi cũ sẽ bị phát hiện và từ chối như một nỗ lực giả mạo.

---

## 14. Backpressure / Áp lực Ngược & Kiểm soát Luồng

### EN:
`computeNetworkBackpressure` evaluates queue utilization against capacity (`NORMAL`, `ELEVATED`, `HIGH`, `SATURATED`, `BLOCKED`). Saturated queues reject frames with `NETWORK_BACKPRESSURE_BLOCKED`. Zero silent drops.

### VI:
`computeNetworkBackpressure` đánh giá mức độ sử dụng hàng đợi so với dung lượng (`NORMAL`, `ELEVATED`, `HIGH`, `SATURATED`, `BLOCKED`). Khi bão hòa, khung bị từ chối với lỗi `NETWORK_BACKPRESSURE_BLOCKED`. Không bao giờ hủy bỏ âm thầm.

---

## 15. Registry / Sổ Đăng ký Mạng

### EN:
`NetworkRegistry` manages active adapters, connections, and surface bindings under strict 7-tuple multi-tenant isolation. Cross-tenant access is rejected fail-closed.

### VI:
`NetworkRegistry` quản lý adapter, kết nối và liên kết bề mặt đang hoạt động dưới sự cô lập đa người thuê bộ 7 nghiêm ngặt. Truy cập xuyên người thuê bị từ chối đóng an toàn.

---

## 16. Security / Mô hình Bảo mật

### EN:
The network layer validates all inputs against prototype pollution, null bytes, path traversal, and Windows device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`).

### VI:
Tầng mạng xác thực toàn bộ đầu vào chống lại prototype pollution, ký tự null, duyệt đường dẫn và tên thiết bị Windows đặc biệt (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`).

---

## 17. Multi-Tenant Isolation / Cô lập Đa Người thuê

### EN:
Enforced via the 7-tuple: `(userId, sessionId, brainId, surfaceId, transportId, gatewayId, networkAdapterId)`. User A cannot send or receive frames on User B's connection.

### VI:
Được thực thi qua bộ 7: `(userId, sessionId, brainId, surfaceId, transportId, gatewayId, networkAdapterId)`. Người dùng A không thể gửi hoặc nhận khung trên kết nối của Người dùng B.

---

## 18. Surface Binding / Ràng buộc Bề mặt

### EN:
Surfaces register connection bindings via the registry. Lookups by surface verify `userId` and `brainId` ownership.

### VI:
Các bề mặt đăng ký ràng buộc kết nối qua registry. Việc tra cứu theo bề mặt phải xác minh quyền sở hữu `userId` và `brainId`.

---

## 19. Mobile Readiness / Khả năng Sẵn sàng cho Mobile

### EN:
Ready for future mobile network adapters (e.g. WebSocket/TLS, Push Notification channels). The adapter will only deliver frames; mobile devices remain presentation surfaces with 0% cognitive authority.

### VI:
Sẵn sàng cho adapter mạng di động tương lai (như WebSocket/TLS, kênh Push Notification). Adapter sẽ chỉ chuyển phát khung; thiết bị di động vẫn là bề mặt hiển thị với 0% thẩm quyền nhận thức.

---

## 20. Robot Readiness / Khả năng Sẵn sàng cho Robot

### EN:
Ready for future robot LAN/WiFi network adapters (e.g. gRPC or real-time UDP streams). The adapter will only transmit observation frames and command envelopes; physical motor control belongs to the future robot runtime.

### VI:
Sẵn sàng cho adapter mạng LAN/WiFi của robot trong tương lai (như gRPC hoặc luồng UDP thời gian thực). Adapter sẽ chỉ truyền các khung quan sát và phong bì lệnh; việc điều khiển động cơ vật lý thuộc về runtime robot tương lai.

---

## 21. Desktop Readiness / Khả năng Sẵn sàng cho Desktop

### EN:
Ready for local IPC or loopback adapters connecting the Desktop UI to the Brain without cognitive state replication.

### VI:
Sẵn sàng cho adapter IPC nội bộ hoặc loopback kết nối UI Desktop tới Não bộ mà không nhân bản trạng thái nhận thức.

---

## 22. Web Readiness / Khả năng Sẵn sàng cho Web

### EN:
Ready for HTTPS/WSS adapters connecting browser surfaces to the remote gateway.

### VI:
Sẵn sàng cho adapter HTTPS/WSS kết nối bề mặt trình duyệt tới cổng từ xa.

---

## 23. Voice Readiness / Khả năng Sẵn sàng cho Voice

### EN:
Ready for binary/streaming frame extensions to support voice audio packets across remote connections.

### VI:
Sẵn sàng cho các mở rộng khung nhị phân/streaming để hỗ trợ các gói tin âm thanh giọng nói qua kết nối từ xa.

---

## 24. Brain Authority / Thẩm quyền Duy nhất của Não bộ

### EN:
BOWCON has exactly ONE authoritative Brain. Network adapters only transport packets; they possess zero planning, reasoning, memory, or execution authority.

### VI:
BOWCON có chính xác MỘT Não bộ có thẩm quyền duy nhất. Bộ điều hợp mạng chỉ vận chuyển các gói tin; chúng sở hữu 0% thẩm quyền lập kế hoạch, suy luận, bộ nhớ hay thực thi.

---

## 25. Governance Boundary (PDP) / Ranh giới Quản trị

### EN:
Policy Decision Point (PDP) remains authoritative within the Brain. Network adapters cannot evaluate, bypass, or forge policy decisions.

### VI:
Điểm Ra Quyết định Chính sách (PDP) giữ thẩm quyền bên trong Não bộ. Bộ điều hợp mạng không thể đánh giá, bỏ qua hay giả mạo các quyết định chính sách.

---

## 26. Execution Boundary / Ranh giới Thực thi

### EN:
Network adapters cannot execute tools, access `ToolRegistry`, or invoke `ToolExecutor`.

### VI:
Bộ điều hợp mạng không thể thực thi công cụ, không thể truy cập `ToolRegistry` hay gọi `ToolExecutor`.

---

## 27. Verification Boundary / Ranh giới Xác minh

### EN:
`DELIVERED ≠ TASK_SUCCESS` and `ACKNOWLEDGED ≠ TASK_SUCCESS`. Only `VerificationService` evaluates task success.

### VI:
`ĐÃ CHUYỂN PHÁT ≠ TÁC VỤ THÀNH CÔNG` và `ĐÃ ACK ≠ TÁC VỤ THÀNH CÔNG`. Chỉ `VerificationService` mới có quyền đánh giá thành công của tác vụ.

---

## 28. Commit Boundary / Ranh giới Cam kết Bền vững

### EN:
`CommitService` is the sole durable persistence authority. Network frames cannot mutate durable storage.

### VI:
`CommitService` là thẩm quyền duy nhất về lưu trữ bền vững. Khung mạng không thể biến đổi lưu trữ bền vững.

---

## 29. Recovery Boundary / Ranh giới Phục hồi Sự cố

### EN:
`RecoveryService` manages crash recovery. Network reconnection never auto-executes interrupted actions.

### VI:
`RecoveryService` quản lý phục hồi sau sự cố. Kết nối lại mạng không bao giờ tự động chạy lại các thao tác bị gián đoạn.

---

## 30. Synchronization Boundary / Ranh giới Đồng bộ hóa

### EN:
`SynchronizationService` maintains the canonical event timeline. Network adapters merely transport frames.

### VI:
`SynchronizationService` duy trì dòng sự kiện chuẩn. Bộ điều hợp mạng chỉ đơn thuần vận chuyển khung.

---

## 31. Failure Model / Mô hình Thất bại Định kiểu

### EN:
Failures produce immutable `NetworkFailureDescriptor` records with automatic secret scrubbing across 20+ standard failure codes.

### VI:
Thất bại tạo ra các bản ghi `NetworkFailureDescriptor` bất biến với tính năng tự động thanh lọc bí mật trên 20+ mã lỗi tiêu chuẩn.

---

## 32. Audit Model / Mô hình Kiểm toán

### EN:
Audit records (`NetworkAuditRecord`) capture network events with deterministic fingerprints and zero secret leaks.

### VI:
Bản ghi kiểm toán (`NetworkAuditRecord`) ghi lại các sự kiện mạng với chữ ký băm tất định và không bao giờ rò rỉ bí mật.

---

## 33. Testing / Kiểm thử

### EN:
- Dedicated test suite: `tests/test_v4_agent_real_network_adapter.ts` (151 assertions covering 36 categories A through AJ).
- Full regression: 23 test suites, 1,379 assertions PASS, 0 failures.

### VI:
- Bộ kiểm thử chuyên biệt: `tests/test_v4_agent_real_network_adapter.ts` (151 khẳng định bao phủ 36 danh mục từ A đến AJ).
- Hồi quy toàn diện: 23 bộ kiểm thử, 1.379 khẳng định vượt qua, 0 lỗi.

---

## 34. Regression / Kết quả Hồi quy

### EN:
All 23 suites across milestones MS-1.1 through MS-1.3.21 executed cleanly with 100% pass rate. Zero regressions.

### VI:
Toàn bộ 23 bộ kiểm thử từ cột mốc MS-1.1 đến MS-1.3.21 đã chạy thành công với tỷ lệ vượt qua 100%. Không có hồi quy.

---

## 35. Future Network Adapters / Các Bộ điều hợp Mạng Tương lai

### EN:
Future milestones will implement physical network adapters (TCP sockets, WebSocket clients/servers, WebRTC channels, MQTT publishers, gRPC streams) using the contracts and runtime foundation established in MS-1.3.21.

### VI:
Các cột mốc trong tương lai sẽ triển khai các bộ điều hợp mạng vật lý (socket TCP, WebSocket client/server, kênh WebRTC, MQTT publisher, luồng gRPC) dựa trên các hợp đồng và nền tảng runtime đã được xác lập trong MS-1.3.21.

---

## 36. MS-1.3.21 Gate / Cổng Đánh giá MS-1.3.21

### EN:
Milestone MS-1.3.21 satisfies all security, architectural, and operational requirements.
**STATUS: PASS & LOCKED.**

### VI:
Cột mốc MS-1.3.21 thỏa mãn toàn bộ các yêu cầu bảo mật, kiến trúc và vận hành.
**TRẠNG THÁI: PASS & LOCKED.**
