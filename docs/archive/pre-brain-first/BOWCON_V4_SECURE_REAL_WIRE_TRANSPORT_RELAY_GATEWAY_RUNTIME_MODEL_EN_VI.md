# BOWCON V4.0 — MS-1.3.28 ARCHITECTURAL SPECIFICATION
# SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME MODEL (EN / VI)

**Document Version:** 4.0.0  
**Milestone:** MS-1.3.28  
**Package:** `@bow/agent@4.0.0` (STRICTLY LOCKED)  
**Classification:** Authoritative Technical Specification  

---

## 1. EXECUTIVE SUMMARY / TỔNG QUAN ĐIỀU HÀNH

### English
Milestone MS-1.3.28 establishes the authoritative, production-oriented **Real Network Wire Transport and Relay Gateway Runtime** for the BOWCON V4.0 cognitive architecture. Building directly upon MS-1.3.26 (Zero-Trust Admission) and MS-1.3.27 (Always-On Relay & Remote Session), this milestone bridges the architectural abstraction to physical network sockets. It implements real, bi-directional socket I/O over dynamic ports via `WebSocketWireServerAdapter` and `WebSocketWireClientAdapter`, while encapsulating transport mechanics behind a protocol-neutral abstraction (`WireTransport`, `WireConnection`, `WireFrame`, `WireEnvelope`). Crucially, the wire layer and relay gateway are strictly non-cognitive: they possess zero decision-making, LLM reasoning, memory mutation, or execution authority. All 42 architectural invariants—such as `WIRE_TRANSPORT != DEVICE_IDENTITY`, `RECONNECT != RE-EXECUTE`, `ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN`, and `TRANSPORT_CONNECTION != TRUST`—are rigorously enforced.

### Tiếng Việt
Cột mốc MS-1.3.28 thiết lập nền tảng **Hạ tầng Truyền tải Wire Mạng Thực tế & Cổng Relay (Real Wire Transport & Relay Gateway Runtime)** có định hướng sản xuất cho kiến trúc nhận thức BOWCON V4.0. Xây dựng trực tiếp trên MS-1.3.26 (Kết nạp Zero-Trust) và MS-1.3.27 (Relay Luôn Bật & Phiên Từ xa), cột mốc này chuyển hóa các trừu tượng kiến trúc thành các socket mạng vật lý thực thụ. Hệ thống triển khai giao tiếp socket I/O hai chiều qua cổng động sử dụng `WebSocketWireServerAdapter` và `WebSocketWireClientAdapter`, đồng thời bao bọc toàn bộ cơ chế truyền tải đằng sau giao diện trung lập với giao thức (`WireTransport`, `WireConnection`, `WireFrame`, `WireEnvelope`). Điểm mấu chốt: tầng dây dẫn và cổng relay hoàn toàn phi nhận thức—không có quyền ra quyết định, không gọi LLM, không biến đổi bộ nhớ, và không có quyền thực thi công cụ. Tất cả 42 bất biến kiến trúc (như `WIRE_TRANSPORT != DEVICE_IDENTITY`, `RECONNECT != RE-EXECUTE`, `ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN`, và `TRANSPORT_CONNECTION != TRUST`) được bảo đảm tuyệt đối.

---

## 2. PROBLEM BEING SOLVED / VẤN ĐỀ ĐƯỢC GIẢI QUYẾT

### English
Prior to MS-1.3.28, the BOWCON relay architecture operated predominantly on in-memory abstractions (`InMemoryRelayAdapter`), leaving a gap between architectural session management and physical wire communication over genuine IP networks. In real-world internet deployments, mobile devices roam dynamically across Wi-Fi, 4G, 5G, and public hotspots. IP addresses fluctuate constantly, NAT devices alter port mappings, and connections drop unpredictably. Without a hardened, transport-neutral wire layer, systems fall into dangerous antipatterns: equating IP addresses with device identity, allowing reconnects to trigger duplicate command execution, or permitting transport gateways to tamper with application payload semantics.

### Tiếng Việt
Trước MS-1.3.28, kiến trúc relay của BOWCON chủ yếu vận hành trên các trừu tượng bộ nhớ trong (`InMemoryRelayAdapter`), để lại khoảng trống giữa quản lý phiên kiến trúc và truyền tải mạng thực tế trên mạng IP. Trong môi trường internet thực tế, thiết bị di động chuyển vùng (roam) liên tục giữa Wi-Fi, 4G, 5G và điểm truy cập công cộng. Địa chỉ IP thay đổi liên tục, thiết bị NAT thay đổi ánh xạ cổng, và kết nối bị ngắt quãng không thể dự đoán trước. Nếu không có tầng truyền tải dây dẫn trung lập và kiên cố, hệ thống dễ rơi vào các phản mẫu nguy hiểm: coi địa chỉ IP là danh tính thiết bị, để kết nối lại tự động kích hoạt thực thi lại lệnh, hoặc cho phép gateway can thiệp vào ngữ nghĩa payload nhận thức.

---

## 3. MS-1.3.27 BASELINE / NỀN TẢNG CỦA MS-1.3.27

### English
MS-1.3.27 introduced the architectural model for the Secure Always-On Brain Relay and Remote Session Runtime:
- Defined the 9-tuple scope isolation: `(tenantId, userId, deviceId, relayId, brainId, surfaceId, sessionId, connectionId, gatewayId)`.
- Defined priority backpressure states: `NORMAL`, `ELEVATED`, `HIGH`, `OVERFLOW`.
- Defined sequence continuity and controlled resume mechanisms.
- Established that the Relay is an architectural intermediary and not the Brain.
However, MS-1.3.27 explicitly marked the underlying wire connection adapter as `PARTIAL` because physical network socket I/O was deferred to MS-1.3.28.

### Tiếng Việt
MS-1.3.27 đã giới thiệu mô hình kiến trúc cho Relay Não bộ Luôn Bật & Phiên Từ xa:
- Xác định cách ly phạm vi bộ 9 thành phần (9-tuple scope isolation).
- Xác định 4 mức áp lực ngược có ưu tiên: `NORMAL`, `ELEVATED`, `HIGH`, `OVERFLOW`.
- Xác định tính liên tục của sequence và cơ chế khôi phục phiên có kiểm soát.
- Khẳng định Relay là trung gian kiến trúc chứ không phải Não bộ.
Tuy nhiên, MS-1.3.27 đánh dấu adapter kết nối là `PARTIAL` vì việc truyền thông qua socket mạng thực tế được dành cho MS-1.3.28.

---

## 4. MS-1.3.28 OBJECTIVE / MỤC TIÊU CỦA MS-1.3.28

### English
MS-1.3.28 upgrades the transport layer to a **REAL** network foundation:
1. Provide protocol-neutral transport abstractions (`WireTransport`, `WireConnection`, `WireFrame`, `WireEnvelope`).
2. Implement a production-oriented `WebSocketWireAdapter` (`WebSocketWireServerAdapter` and `WebSocketWireClientAdapter`) performing actual TCP/WebSocket socket I/O.
3. Retain `InMemoryWireAdapter` as strictly marked `TEST/IN-MEMORY/PARTIAL` for deterministic unit testing.
4. Implement `RelayGatewayRuntime` executing complete connection lifecycle, multi-step handshake, zero-trust admission bridging, session binding, and anti-replay sequence routing.
5. Guarantee complete separation of concerns: Network $\to$ Wire $\to$ Relay $\to$ Admission $\to$ Session $\to$ Brain $\to$ Execution.

### Tiếng Việt
MS-1.3.28 nâng cấp tầng truyền tải lên nền tảng mạng **THỰC TẾ (REAL)**:
1. Cung cấp các trừu tượng truyền tải trung lập với giao thức.
2. Triển khai `WebSocketWireAdapter` hướng sản xuất thực hiện I/O socket TCP/WebSocket thực tế.
3. Giữ lại `InMemoryWireAdapter` với nhãn rõ ràng là `TEST/IN-MEMORY/PARTIAL` phục vụ kiểm thử đơn vị.
4. Triển khai `RelayGatewayRuntime` thực hiện toàn bộ vòng đời kết nối, bắt tay đa bước, cầu nối kết nạp zero-trust, liên kết phiên và định tuyến chống phát lại.
5. Đảm bảo phân tách trách nhiệm hoàn toàn: Network $\to$ Wire $\to$ Relay $\to$ Admission $\to$ Session $\to$ Brain $\to$ Execution.

---

## 5. WIRE ARCHITECTURE / KIẾN TRÚC WIRE TRANSPORT

### English
The wire architecture enforces a strict layered pipeline:
```
SURFACE (Desktop / Mobile / Robot / Voice / Web)
    ↓
REAL WIRE CLIENT (RealWireClient)
    ↓
PHYSICAL NETWORK (Wi-Fi / 4G / 5G / Hotspot)
    ↓
REAL WIRE TRANSPORT (WebSocketWireAdapter)
    ↓
SECURE RELAY GATEWAY (RelayGatewayRuntime)
    ↓
ZERO-TRUST ADMISSION (ZeroTrustAdmissionRuntime - MS-1.3.26)
    ↓
REMOTE SESSION BINDING (WireSessionBinder & RemoteSessionRecord)
    ↓
AUTHORITATIVE BRAIN (AgentLoop Dual-Chip Engine)
```
Each layer operates exclusively on its dedicated domain:
- **Wire Layer:** Frames, serialization, checksums, ping/pong heartbeats, priority backpressure.
- **Relay Layer:** Connection tracking, scope binding, sequence advancement, anti-replay.
- **Admission Layer:** Cryptographic proof verification, device trust status, revocation enforcement.
- **Brain Layer:** Intent resolution, memory retrieval, bounded planning.
- **Execution Layer:** PDP policy governance, ToolRegistry execution, post-execution verification.

### Tiếng Việt
Kiến trúc wire thực thi đường ống phân tầng nghiêm ngặt:
Tất cả các tầng hoạt động độc lập trên miền trách nhiệm của mình:
- **Tầng Wire:** Khung truyền, tuần tự hóa, mã kiểm tra checksum, ping/pong heartbeat, áp lực ngược theo ưu tiên.
- **Tầng Relay:** Theo dõi kết nối, liên kết phạm vi, tăng tiến sequence, chống phát lại replay.
- **Tầng Kết nạp:** Xác minh bằng chứng mật mã, trạng thái tin cậy thiết bị, cưỡng chế thu hồi quyền.
- **Tầng Não bộ:** Hiểu ý định, đọc bộ nhớ, lập kế hoạch có giới hạn.
- **Tầng Thực thi:** Kiểm soát chính sách PDP, thực thi ToolRegistry, xác minh kết quả sau thực thi.

---

## 6. TRANSPORT ABSTRACTION / TRỪU TƯỢNG TRUYỀN TẢI

### English
The transport contracts defined in `src/core/wire/wireTransport.ts` decouple BOWCON from any concrete network protocol (e.g., WebSocket, TCP, QUIC, gRPC):
- `WireConnection`: Represents an active bidirectional physical wire link.
- `WireClientTransportAdapter`: Factory contract for outbound client connections.
- `WireServerTransportAdapter`: Factory contract for inbound server listeners.
- `WireFrame`: Transport frame unit containing frame type, sequence, payload, and SHA-256 checksum.
- `WireEnvelope`: Canonical application envelope containing scope, priorities, risk level, and opaque payload.

### Tiếng Việt
Các hợp đồng truyền tải trong `src/core/wire/wireTransport.ts` tách biệt BOWCON khỏi bất kỳ giao thức mạng cụ thể nào (như WebSocket, TCP, QUIC, gRPC):
- `WireConnection`: Đại diện cho liên kết dây dẫn hai chiều đang hoạt động.
- `WireClientTransportAdapter`: Hợp đồng factory cho kết nối client gửi đi.
- `WireServerTransportAdapter`: Hợp đồng factory cho bộ lắng nghe server đón nhận kết nối.
- `WireFrame`: Đơn vị khung truyền tải mang loại khung, sequence, payload và checksum SHA-256.
- `WireEnvelope`: Phong bì ứng dụng chuẩn mang phạm vi scope, độ ưu tiên, mức rủi ro và payload mờ (opaque).

---

## 7. REAL NETWORK ADAPTER / ADAPTER MẠNG THỰC TẾ

### English
`src/core/wire/adapters/webSocketWireAdapter.ts` implements physical socket communication:
- Binds server listeners to real TCP ports (e.g., port 0 for OS-assigned dynamic ports in tests, or configured production ports).
- Manages real connection lifecycles via the Node.js `ws` library.
- Performs framing with a strict 1MB payload ceiling (`MAX_WIRE_FRAME_SIZE = 1048576`).
- Validates SHA-256 checksums on all received frames; malformed or corrupted frames are immediately rejected fail-closed.
- Collects real metrics: bytes sent/received, frames sent/received, dropped frames, and connection durations.

### Tiếng Việt
`src/core/wire/adapters/webSocketWireAdapter.ts` triển khai giao tiếp socket vật lý:
- Gắn server listener vào cổng TCP thực tế (như cổng 0 do hệ điều hành cấp phát ngẫu nhiên khi kiểm thử, hoặc cổng sản xuất).
- Quản lý vòng đời kết nối qua thư viện `ws` của Node.js.
- Phân khung với giới hạn kích thước nghiêm ngặt 1MB (`MAX_WIRE_FRAME_SIZE = 1048576`).
- Xác minh checksum SHA-256 trên mọi khung nhận được; khung bị lỗi hoặc hỏng bị từ chối ngay lập tức theo nguyên tắc fail-closed.
- Thu thập số liệu thực tế: byte gửi/nhận, khung gửi/nhận, khung bị rớt, và thời gian kết nối.

---

## 8. RELAY GATEWAY / CỔNG RELAY GATEWAY

### English
`src/core/wire/relayGatewayRuntime.ts` orchestrates the gateway boundary:
1. **Accepts Wire Connections:** Tracks connection IDs deterministically.
2. **Executes Handshake:** Issues ephemeral cryptographically secure nonces and coordinates protocol version negotiation (`4.0.0`).
3. **Bridges Admission:** Relies on `WireAdmissionBridge` to query `ZeroTrustAdmissionRuntime` without holding private keys.
4. **Binds Sessions:** Maps connection IDs to admitted `RemoteSessionRecord`s within an immutable 9-tuple scope.
5. **Routes Envelopes:** Enforces monotonic sequence ordering, anti-replay caching, and backpressure queuing.
6. **Zero Authority:** The gateway does not parse natural language, execute tools, invoke LLMs, or mutate Brain state.

### Tiếng Việt
`src/core/wire/relayGatewayRuntime.ts` điều phối ranh giới cổng:
1. **Tiếp nhận kết nối wire:** Theo dõi ID kết nối một cách xác định.
2. **Thực thi bắt tay:** Phát hành nonce mật mã an toàn và đàm phán phiên bản giao thức (`4.0.0`).
3. **Cầu nối kết nạp:** Dựa vào `WireAdmissionBridge` để xác thực qua `ZeroTrustAdmissionRuntime` mà không giữ khóa riêng tư.
4. **Liên kết phiên:** Ánh xạ ID kết nối vào `RemoteSessionRecord` đã kết nạp trong phạm vi 9-tuple bất biến.
5. **Định tuyến phong bì:** Bắt buộc sequence tăng đơn điệu, bộ nhớ đệm chống phát lại, và hàng đợi áp lực ngược.
6. **Không quyền lực nhận thức:** Cổng không phân tích ngôn ngữ tự nhiên, không chạy công cụ, không gọi LLM, không sửa đổi bộ nhớ Não bộ.

---

## 9. ZERO-TRUST ADMISSION INTEGRATION / TÍCH HỢP KẾT NẠP ZERO-TRUST

### English
Admission integration strictly reuses MS-1.3.26 without duplicating cryptographic verification:
```
WIRE CONNECTION ESTABLISHED
        ↓
WIRE HANDSHAKE COMPLETED (Nonce Negotiated)
        ↓
GATEWAY ISSUES EPHEMERAL CHALLENGE
        ↓
CLIENT PRODUCES PROOF (MS-1.3.24 Key Signature via Vault MS-1.3.25)
        ↓
ZERO-TRUST ADMISSION EVALUATION (MS-1.3.26)
        ↓
TRUST VALIDATED & REVOCATION CHECKED
        ↓
ADMISSION DECISION: ADMIT / DENY
```
If admission fails, the gateway logs an audit record, rejects the connection fail-closed, and severs the wire link.

### Tiếng Việt
Tích hợp kết nạp tái sử dụng triệt để MS-1.3.26 mà không sao chép logic xác minh mật mã:
Nếu kết nạp thất bại, gateway ghi lại nhật ký kiểm toán, từ chối kết nối theo chuẩn fail-closed và ngắt liên kết wire.

---

## 10. DEVICE IDENTITY SEPARATION / TÁCH BIỆT DANH TÍNH THIẾT BỊ

### English
A primary architectural guarantee of MS-1.3.28 is the complete decoupling of device identity from network coordinates:
- `NETWORK_ADDRESS != DEVICE_IDENTITY`
- `IP_ADDRESS != DEVICE_IDENTITY`
- `PORT != DEVICE_IDENTITY`
- `DNS != DEVICE_IDENTITY`
- `WIFI_SSID != DEVICE_IDENTITY`
- `MAC_ADDRESS != DEVICE_IDENTITY`

A mobile phone moving from Home Wi-Fi $\to$ 4G $\to$ 5G $\to$ Coffee Shop Wi-Fi retains the exact same `deviceId` and cryptographic key identity, even though IP, port, subnet, and SSID change completely.

### Tiếng Việt
Cam kết kiến trúc cốt lõi của MS-1.3.28 là tách rời hoàn toàn danh tính thiết bị khỏi tọa độ mạng:
Một chiếc điện thoại di động di chuyển từ Wi-Fi nhà $\to$ 4G $\to$ 5G $\to$ Wi-Fi quán cà phê vẫn giữ nguyên chính xác `deviceId` và danh tính khóa mật mã, dù IP, cổng, mạng con và SSID thay đổi 100%.

---

## 11. CREDENTIAL BOUNDARY / RANH GIỚI BẢO MẬT THÔNG SỐ XÁC THỰC

### English
Private cryptographic keys NEVER cross the wire:
- Keys reside exclusively in `DeviceKeyStore` inside `DeviceVaultRuntime` (MS-1.3.25).
- Clients sign ephemeral challenges locally and send only `DeviceProof` signatures.
- Wire frames, envelopes, error messages, and audit ledgers automatically scrub all sensitive fields (`key`, `private_key`, `secret`, `password`, `token`, `bearer`, `auth`, `proof`).
- Transmission of raw private keys or credentials over the wire causes immediate envelope rejection fail-closed.

### Tiếng Việt
Khóa mật mã riêng tư TUYỆT ĐỐI KHÔNG BAO GIỜ truyền qua dây mạng:
- Khóa chỉ lưu trữ an toàn trong `DeviceKeyStore` thuộc `DeviceVaultRuntime` (MS-1.3.25).
- Client ký challenge tạm thời tại chỗ và chỉ gửi chữ ký `DeviceProof`.
- Khung wire, phong bì, thông điệp lỗi và sổ cái kiểm toán tự động làm sạch mọi trường nhạy cảm (`key`, `private_key`, `secret`, `password`, `token`, `bearer`, `auth`, `proof`).
- Việc truyền khóa riêng tư thô hoặc chứng chỉ qua wire sẽ lập tức kích hoạt cơ chế từ chối phong bì fail-closed.

---

## 12. SESSION BINDING / LIÊN KẾT PHIÊN

### English
When admission succeeds, `WireSessionBinder` associates the wire connection with a `RemoteSessionRecord`. The binding is locked to a 9-tuple scope:
```
(tenantId, userId, deviceId, relayId, brainId, surfaceId, sessionId, connectionId, gatewayId)
```
Any subsequent envelope arriving on that wire connection whose scope parameters mismatch the bound session is immediately rejected with `WIRE_SCOPE_VIOLATION`. Cross-tenant, cross-user, cross-device, and cross-brain spoofing is impossible.

### Tiếng Việt
Khi kết nạp thành công, `WireSessionBinder` liên kết kết nối wire với một `RemoteSessionRecord`. Liên kết này được khóa chặt vào phạm vi bộ 9:
Mọi phong bì tiếp theo đến trên kết nối đó mà có tham số phạm vi không khớp với phiên đã liên kết sẽ lập tức bị từ chối với lỗi `WIRE_SCOPE_VIOLATION`. Việc giả mạo chéo tenant, chéo người dùng, chéo thiết bị hay chéo não bộ là bất khả thi.

---

## 13. SESSION RESUME / KHÔI PHỤC PHIÊN

### English
When a device disconnects temporarily and reconnects, it invokes session resume:
- Validates session identity, device identity, and sequence continuity.
- Strictly rejects sequence rewinds (`WIRE_SEQUENCE_REWIND`) or gaps.
- Rejects expired trust records or revoked devices fail-closed.
- **Critical Invariant:** `SESSION_RESUME != TASK_REEXECUTION`. Resuming a session reconnects the communication stream but does NOT re-execute tasks.

### Tiếng Việt
Khi thiết bị tạm thời mất kết nối và kết nối lại, cơ chế khôi phục phiên được kích hoạt:
- Xác minh danh tính phiên, danh tính thiết bị và tính liên tục của chuỗi sequence.
- Nghiêm cấm việc tua lại chuỗi sequence (`WIRE_SEQUENCE_REWIND`) hoặc tạo lỗ hổng sequence.
- Từ chối hồ sơ tin cậy đã hết hạn hoặc thiết bị đã bị thu hồi fail-closed.
- **Bất biến cốt lõi:** `SESSION_RESUME != TASK_REEXECUTION`. Khôi phục phiên chỉ phục hồi dòng truyền thông, TUYỆT ĐỐI KHÔNG thực thi lại tác vụ.

---

## 14. RECONNECT MODEL / MÔ HÌNH KẾT NỐI LẠI

### English
Reconnection is governed by `WireReconnectScheduler`:
- Exponential backoff with bounded limits (`minDelayMs = 500`, `maxDelayMs = 30000`, `maxAttempts = 10`).
- Random jitter prevents thundering herd problem during relay gateway restarts.
- **Axiom:** `RECONNECT != RE-EXECUTE`. Reconnection re-establishes physical socket connectivity and session binding. Commands previously acknowledged or processed are NEVER re-executed merely because the socket reconnected.

### Tiếng Việt
Kết nối lại được điều phối bởi `WireReconnectScheduler`:
- Bounded exponential backoff với giới hạn (`minDelayMs = 500`, `maxDelayMs = 30000`, `maxAttempts = 10`).
- Jitter ngẫu nhiên ngăn ngừa hiện tượng thundering herd khi gateway khởi động lại.
- **Tiên đề:** `RECONNECT != RE-EXECUTE`. Kết nối lại chỉ tái lập socket vật lý và liên kết phiên. Các lệnh đã được ghi nhận hoặc xử lý trước đó KHÔNG BAO GIỜ bị thực thi lại chỉ vì socket vừa kết nối lại.

---

## 15. NETWORK ROAMING / CHUYỂN VÙNG MẠNG

### English
Real-world devices roam seamlessly:
`Home Wi-Fi → Cellular 4G → Cellular 5G → Public Wi-Fi → Hotspot → Home Wi-Fi`
- `RealWireClient.roamNetwork()` records roaming events via `WireReconnectScheduler`.
- Closes the existing socket cleanly and opens a new connection to the gateway on the new interface.
- Performs handshake and zero-trust challenge verification on the new socket.
- Binds to the existing session without losing continuity.
- Device identity remains invariant throughout the transition.

### Tiếng Việt
Thiết bị thực tế chuyển vùng liền mạch:
- `RealWireClient.roamNetwork()` ghi nhận sự kiện chuyển vùng qua `WireReconnectScheduler`.
- Đóng socket hiện tại một cách sạch sẽ và mở kết nối mới tới gateway trên interface mạng mới.
- Bắt tay và xác minh challenge zero-trust trên socket mới.
- Liên kết lại vào phiên hiện hữu mà không làm mất tính liên tục.
- Danh tính thiết bị giữ nguyên vẹn trong suốt quá trình chuyển giao.

---

## 16. NAT & INTERNET INDEPENDENCE / ĐỘC LẬP VỚI NAT VÀ INTERNET

### English
BOWCON does not require:
- Static public IPs or static home IPs.
- Router port forwarding or DMZ configuration.
- Dynamic DNS (DDNS).
- Fixed subnets, gateways, or Wi-Fi SSIDs.

Devices initiate outbound secure connections (`wss://` / TCP) to the Relay Gateway. The gateway maintains stateful bidirectional channels traversing symmetric NATs and CGNATs effortlessly.

### Tiếng Việt
BOWCON không yêu cầu:
- IP tĩnh công cộng hay IP tĩnh gia đình.
- Mở cổng router (port forwarding) hay cấu hình DMZ.
- Dynamic DNS (DDNS).
- Subnet cố định, gateway hay Wi-Fi SSID cố định.

Thiết bị chủ động mở kết nối an toàn chiều ra (`wss://` / TCP) tới Relay Gateway. Gateway duy trì kênh hai chiều có trạng thái, xuyên qua các lớp NAT đối xứng và CGNAT dễ dàng.

---

## 17. MULTI-SURFACE TOPOLOGY / CẤU TRÚC ĐA BỀ MẶT (MULTI-SURFACE)

### English
The system supports multiple distinct surfaces concurrently connecting to the same authoritative Brain:
- **Desktop Surface:** Local dual-chip workstation interface.
- **Mobile Surface:** Remote handheld assistant roaming on 4G/5G.
- **Robot Surface:** Embodied robotic agent sending camera/sensor telemetry and receiving actuation envelopes.
- **Voice Surface:** Real-time audio input/output stream.
- **Web Surface:** Browser-based management console.

All surfaces multiplex over real wire connections into the Relay Gateway. Each surface is strictly isolated by its `surfaceId` and `surfaceType` in the 9-tuple scope.

### Tiếng Việt
Hệ thống hỗ trợ nhiều bề mặt khác nhau đồng thời kết nối vào cùng một Não bộ có thẩm quyền:
- **Desktop Surface:** Giao diện máy trạm dual-chip cục bộ.
- **Mobile Surface:** Trợ lý di động cầm tay chuyển vùng trên 4G/5G.
- **Robot Surface:** Tác nhân robot gửi dữ liệu cảm biến/camera và nhận lệnh chuyển động.
- **Voice Surface:** Luồng âm thanh vào/ra thời gian thực.
- **Web Surface:** Bảng điều khiển quản trị trên trình duyệt web.

Mọi bề mặt ghép kênh qua kết nối wire thực tế vào Relay Gateway. Mỗi bề mặt được cách ly nghiêm ngặt bởi `surfaceId` và `surfaceType` trong phạm vi 9-tuple.

---

## 18. ONE AUTHORITATIVE BRAIN MODEL / MÔ HÌNH MỘT NÃO BỘ DUY NHẤT

### English
- `ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN`.
- `MULTIPLE_SURFACES != MULTIPLE_BRAINS`.
- `RELAY_GATEWAY != BRAIN`.
There is exactly one authoritative cognitive brain instance. Multiple surfaces are merely observation and actuation windows into that single brain. The Relay Gateway acts strictly as a traffic boundary, never creating brain instances per session or per device.

### Tiếng Việt
- `ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN`.
- `MULTIPLE_SURFACES != MULTIPLE_BRAINS`.
- `RELAY_GATEWAY != BRAIN`.
Chỉ có duy nhất một thực thể não bộ nhận thức có thẩm quyền. Nhiều bề mặt chỉ là các cửa sổ quan sát và thao tác vào một não bộ duy nhất đó. Relay Gateway hoạt động thuần túy như ranh giới giao thông, tuyệt đối không tạo não bộ riêng cho từng phiên hay từng thiết bị.

---

## 19. BACKPRESSURE & BOUNDED BUFFERING / ÁP LỰC NGƯỢC VÀ ĐỆM CÓ GIỚI HẠN

### English
`WireBackpressureController` manages physical queue thresholds:
- **NORMAL:** Queue within safe limits; all traffic accepted.
- **ELEVATED:** Approaching warning watermark; telemetry buffered.
- **HIGH:** Imminent overflow; rate-limiting applied.
- **OVERFLOW:** Non-critical observation traffic (telemetry, progress events) dropped first.
- **Critical Invariant:** Security events, admission signals, control messages, and session state are NEVER dropped. Memory allocation is strictly bounded to prevent heap exhaustion.

### Tiếng Việt
`WireBackpressureController` quản lý ngưỡng hàng đợi vật lý:
- **NORMAL:** Hàng đợi an toàn; chấp nhận toàn bộ lưu lượng.
- **ELEVATED:** Tiếp cận ngưỡng cảnh báo; đệm dữ liệu đo lường.
- **HIGH:** Nguy cơ tràn hàng đợi; áp dụng điều tiết lưu lượng.
- **OVERFLOW:** Lưu lượng quan sát không thiết yếu (telemetry, tiến độ) bị hủy trước.
- **Bất biến cốt lõi:** Sự kiện bảo mật, tín hiệu kết nạp, thông điệp kiểm soát và trạng thái phiên TUYỆT ĐỐI KHÔNG bị hủy. Bộ nhớ được giới hạn nghiêm ngặt để chống cạn kiệt RAM.

---

## 20. FAILURE HANDLING & TIMEOUT TAXONOMY / XỬ LÝ SỰ CỐ & PHÂN LOẠI TIMEOUT

### English
Fail-closed timeout taxonomy (`src/core/wire/wireTimeout.ts`):
- `CONNECT_TIMEOUT_MS = 5000`
- `HANDSHAKE_TIMEOUT_MS = 5000`
- `HEARTBEAT_INTERVAL_MS = 15000`
- `IDLE_TIMEOUT_MS = 30000`
- `DRAIN_TIMEOUT_MS = 10000`

Any operation failing to complete within its timeout budget triggers immediate fail-closed error propagation (`WireTransportError`) and clean connection teardown.

### Tiếng Việt
Phân loại timeout chuẩn fail-closed (`src/core/wire/wireTimeout.ts`):
Mọi hoạt động không hoàn thành trong hạn mức thời gian đều lập tức kích hoạt lan truyền lỗi fail-closed (`WireTransportError`) và đóng kết nối sạch sẽ.

---

## 21. SECURITY INVARIANTS / CÁC BẤT BIẾN BẢO MẬT

### English
MS-1.3.28 enforces all 42 milestone invariants programmatically:
1. `WIRE_TRANSPORT != DEVICE_IDENTITY`
2. `WIRE_TRANSPORT != DEVICE_TRUST`
3. `WIRE_TRANSPORT != AUTHORIZATION`
4. `WIRE_TRANSPORT != EXECUTION_AUTHORITY`
5. `RELAY_GATEWAY != BRAIN`
6. `RELAY_GATEWAY != LLM`
7. `RELAY_GATEWAY != MEMORY`
8. `RELAY_GATEWAY != TOOL_EXECUTOR`
9. `NETWORK_ADDRESS != DEVICE_IDENTITY`
10. `IP_ADDRESS != DEVICE_IDENTITY`
11. `PORT != DEVICE_IDENTITY`
12. `DNS != DEVICE_IDENTITY`
13. `DOMAIN != DEVICE_IDENTITY`
14. `WIFI_SSID != DEVICE_IDENTITY`
15. `MAC_ADDRESS != DEVICE_IDENTITY`
16. `TRANSPORT_CONNECTION != TRUST`
17. `SOCKET_CONNECTION != AUTHENTICATION`
18. `TLS_OR_SECURE_CHANNEL != DEVICE_AUTHORIZATION`
19. `CONNECTED != ADMITTED`
20. `ADMITTED != AUTHORIZED`
21. `AUTHORIZED != EXECUTED`
22. `RELAY_CONNECTED != BRAIN_SESSION`
23. `NETWORK_RECONNECT != TASK_REEXECUTION`
24. `SESSION_RESUME != TASK_REEXECUTION`
25. `TRANSPORT_RECONNECT != SESSION_RECREATION`
26. `SESSION_ID != DEVICE_ID`
27. `RELAY_ID != DEVICE_ID`
28. `RELAY_ID != SESSION_ID`
29. `BRAIN_ID != RELAY_ID`
30. `ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN`
31. `MULTIPLE_SURFACES != MULTIPLE_BRAINS`
32. `INTERNET_LOCATION != TRUST`
33. `PUBLIC_NETWORK != TRUST`
34. `HOME_NETWORK != TRUST`
35. `KNOWING_RELAY_ENDPOINT != ACCESS`
36. `KNOWING_BRAIN_ENDPOINT != ACCESS`
37. `POSSESSING_DEVICE_ID != POSSESSING_DEVICE_KEY`
38. `POSSESSING_DEVICE_KEY != EXECUTION_AUTHORITY`
39. `DELIVERED != TASK_SUCCESS`
40. `ACKNOWLEDGED != TASK_SUCCESS`
41. `CONNECTION_SUCCESS != TASK_SUCCESS`
42. `WIRE_SUCCESS != TASK_SUCCESS`

### Tiếng Việt
Toàn bộ 42 bất biến được kiểm tra tự động qua mã nguồn tại `wireIdentity.ts` và kiểm thử trong `tests/test_v4_agent_secure_real_wire_transport.ts` (Danh mục V).

---

## 22. THREAT MODEL / MÔ HÌNH ĐE DỌA

| Mối Đe Dọa (Threat) | Vector Tấn Công | Cơ Chế Phòng Thủ (Defense) |
| :--- | :--- | :--- |
| **IP Spoofing** | Kẻ tấn công giả mạo IP nguồn của thiết bị gia đình | IP không phải là danh tính (`IP != IDENTITY`). Buộc phải có chữ ký mật mã zero-trust từ khóa trong vault. |
| **Replay Attack** | Bắt gói tin wire hợp lệ và gửi lại | Chống phát lại 3 lớp: nonce bắt tay, bộ đệm chữ ký/digest, và sequence tăng đơn điệu nghiêm ngặt. |
| **Tampering** | Sửa đổi payload khung wire khi đang truyền | Checksum SHA-256 trên từng frame; chữ ký mật mã ED25519 trên bằng chứng kết nạp. |
| **Eavesdropping** | Nghe trộm trên đường truyền mạng công cộng | Kênh truyền WSS / TLS mã hóa; payload không bao giờ chứa khóa riêng tư. |
| **Session Hijacking** | Gửi phong bì với sessionId của nạn nhân từ socket khác | Scope binding bộ 9 gắn chặt sessionId với connectionId vật lý đã được kết nạp. |
| **Sequence Rewind** | Gửi lại sequence cũ để ép não bộ chạy lại lệnh | `WireMessageRouter` từ chối ngay lập tức mọi frame có sequence $\le$ sequence cao nhất đã xử lý. |
| **DoS via Framing** | Gửi frame khổng lồ để làm tràn RAM | Giới hạn cứng 1MB (`MAX_WIRE_FRAME_SIZE`). Khung quá cỡ bị ngắt kết nối ngay. |

---

## 23. AUDIT MODEL / MÔ HÌNH KIỂM TOÁN

### English
`WireAuditLedger` provides append-only, tamper-evident record keeping for all wire events. Every entry is hashed with SHA-256 and linked. All sensitive parameters are recursively scrubbed via `scrubSecrets()`, ensuring that no private keys, passwords, bearer tokens, or challenge secrets ever appear in audit logs.

### Tiếng Việt
`WireAuditLedger` cung cấp sổ cái chỉ ghi thêm (append-only), chống sửa đổi cho mọi sự kiện wire. Mỗi bản ghi được băm SHA-256. Mọi tham số nhạy cảm được làm sạch đệ quy qua `scrubSecrets()`, đảm bảo tuyệt đối không có khóa riêng tư, mật khẩu, token hay challenge nào lọt vào log kiểm toán.

---

## 24. NON-INTERFERENCE AUDIT / KIỂM TOÁN KHÔNG CAN THIỆP

### English
MS-1.3.28 integrates into `AgentLoop` strictly as an observational infrastructure provider. The wire layer:
- NEVER bypasses `PolicyDecisionPoint` (PDP).
- NEVER bypasses `ApprovalService`.
- NEVER bypasses `VerificationService`.
- NEVER executes tools directly.
- NEVER mutates Brain memory directly.
All existing 29 test suites continue to pass with zero regressions.

### Tiếng Việt
MS-1.3.28 tích hợp vào `AgentLoop` thuần túy như nhà cung cấp hạ tầng quan sát. Tầng wire:
- KHÔNG BAO GIỜ vượt qua `PolicyDecisionPoint` (PDP).
- KHÔNG BAO GIỜ bỏ qua `ApprovalService`.
- KHÔNG BAO GIỜ bỏ qua `VerificationService`.
- KHÔNG BAO GIỜ tự ý gọi tool.
- KHÔNG BAO GIỜ tự ý sửa đổi bộ nhớ Não bộ.
Toàn bộ 29 bộ kiểm thử hiện hữu tiếp tục vượt qua 100% không có hồi quy.

---

## 25. REALITY MATRIX SUMMARY / BẢNG MA TRẬN TÍNH THỰC TẾ

| Nhóm Thành Phần | Số Lượng | REAL | PARTIAL | MOCK | Tỷ Lệ REAL |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Milestones 1.1 — 1.3.27** | 345 | 322 | 16 | 7 | 93.33% |
| **MS-1.3.28 (Tầng Wire & Gateway)** | 24 | 23 | 1 | 0 | 95.83% |
| **TOÀN BỘ HỆ THỐNG BOWCON V4.0** | **369** | **345** | **17** | **7** | **93.50%** |

*Ghi chú:* Thành phần `InMemoryWireAdapter` được phân loại trung thực là `TEST/IN-MEMORY/PARTIAL`, trong khi `WebSocketWireAdapter` là `REAL`.

---

## 26. TESTING MODEL / MÔ HÌNH KIỂM THỬ

### English
- **Dedicated Test Suite:** `tests/test_v4_agent_secure_real_wire_transport.ts`
- **Total Categories:** 33 categories (A through AG).
- **Assertions:** 459 assertions passed (exceeding $\ge 300$ requirement).
- **Live Physical Socket Testing:** Verifies actual WebSocket frame transmission over dynamic OS ports.
- **Full Regression:** 30 of 30 suites executed cleanly via `scratch/run_full_regression.mjs`.

### Tiếng Việt
- **Bộ test chuyên dụng:** `tests/test_v4_agent_secure_real_wire_transport.ts`
- **Tổng danh mục kiểm thử:** 33 danh mục (từ A đến AG).
- **Số lượng assertion:** 459 assertions passed (vượt yêu cầu $\ge 300$).
- **Kiểm thử socket vật lý thực tế:** Xác nhận truyền tải khung WebSocket thực thụ trên cổng hệ điều hành.
- **Hồi quy toàn diện:** 30/30 bộ kiểm thử chạy thành công 100% qua `scratch/run_full_regression.mjs`.

---

## 27. OPERATIONAL LIMITATIONS / GIỚI HẠN VẬN HÀNH

1. **Physical TLS Certificate Infrastructure:** In local development and unit tests, plain WebSockets (`ws://`) over loopback are used; production deployments must terminate TLS (`wss://`) via reverse proxy (e.g., Caddy, Nginx) or Node TLS context.
2. **Bandwidth Throttling:** Packet rate limiting relies on queue backpressure; kernel-level traffic shaping (tc/eBPF) is not implemented within this userspace node runtime.
3. **Hardware Roaming Notification:** Roaming events currently rely on surface clients explicitly notifying the wire client runtime via OS network state events.

---

## 28. FUTURE PROTOCOL ADAPTERS / CÁC ADAPTER GIAO THỨC TƯƠNG LAI

Because MS-1.3.28 designed `WireTransport` to be strictly protocol-neutral, future milestones can plug in additional adapters without altering Brain or Relay logic:
- **QUIC / HTTP/3 Adapter:** For ultra-low-latency UDP multi-streaming with 0-RTT connection resumption.
- **WebRTC DataChannel Adapter:** For direct peer-to-peer surface-to-relay connectivity behind restrictive firewalls.
- **Bluetooth Low Energy (BLE) Adapter:** For localized offline Robot and Wearable surface connectivity.

---

## 29. DESKTOP DEPLOYMENT MODEL / MÔ HÌNH TRIỂN KHAI TRÊN DESKTOP

- The Dual-Chip Desktop workstation runs the **Authoritative BOWCON Brain Server**.
- Runs `RelayGatewayRuntime` bound to an internal or external network port.
- Local Desktop Surface connects either via direct IPC, in-memory adapter, or loopback WebSocket.

---

## 30. MOBILE DEPLOYMENT MODEL / MÔ HÌNH TRIỂN KHAI TRÊN MOBILE

- Runs `RealWireClient` on Android / iOS (via React Native, Flutter, or native Swift/Kotlin).
- Manages secure background connection to the central Relay Gateway.
- Uses OS network change receivers to trigger `wireClient.roamNetwork()` without user intervention.
- Holds private device keys in iOS Keychain or Android Keystore.

---

## 31. ROBOT DEPLOYMENT MODEL / MÔ HÌNH TRIỂN KHAI TRÊN ROBOT

- Runs `RealWireClient` on robot SBC (Jetson Orin, Raspberry Pi).
- Transmits continuous sensor and camera telemetry frames over prioritized wire queues.
- During Wi-Fi degradation, drops video frames while preserving critical emergency stop (E-STOP) and heartbeat frames.
- Receives motion commands from the authoritative Brain only after verified PDP authorization.

---

## 32. PRODUCTION PROMOTION CRITERIA / TIÊU CHÍ PHÊ CHUẨN LÊN MÔI TRƯỜNG PRODUCTION

MS-1.3.28 meets all authoritative gate criteria:
- [x] Protocol-neutral wire transport abstraction implemented.
- [x] Production-ready real network socket I/O adapter implemented and validated.
- [x] In-memory adapters honestly segregated and marked `TEST/IN-MEMORY/PARTIAL`.
- [x] Zero-Trust Admission (MS-1.3.26) integrated without duplicate crypto logic.
- [x] Device identity strictly decoupled from network coordinates.
- [x] All 42 architectural invariants programmatically enforced and tested.
- [x] Append-only secret-scrubbing audit ledger active.
- [x] 459 dedicated assertions passed ($\ge 300$ required).
- [x] Full regression passed (30/30 suites, 0 failures).
- [x] Zero references or touch to protected workspace `C:\BOW\shopofbow`.
- [x] Version strictly locked at `4.0.0`.

**Status: PASS & LOCKED.**
