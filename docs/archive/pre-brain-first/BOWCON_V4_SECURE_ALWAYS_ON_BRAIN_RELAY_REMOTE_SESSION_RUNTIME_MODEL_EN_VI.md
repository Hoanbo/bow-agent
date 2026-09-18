# BOWCON V4.0 — MS-1.3.27
# SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME ARCHITECTURE MODEL
# MÔ HÌNH KIẾN TRÚC RUNTIME CHUYỂN TIẾP NÃO BỘ VÀ PHIÊN TỪ XA LUÔN BẬT BẢO MẬT

**Document Version:** 4.0.0  
**Milestone:** MS-1.3.27  
**Package:** `@bow/agent` (Version 4.0.0 STRICTLY LOCKED)  
**Security Standard:** Zero-Trust Remote Session Transport & Level 4 Autonomous Governance  
**Languages:** English & Tiếng Việt (Bilingual Dual Documentation)  

---

## 1. Architecture / Kiến Trúc Tổng Thể

### English
The **Secure Always-On Brain Relay & Remote Session Runtime** bridges MS-1.3.22 (Bidirectional Connection), MS-1.3.23 (Pairing & Trust Foundation), MS-1.3.24 (Persistent Device Identity), MS-1.3.25 (Secure Device Vault), and MS-1.3.26 (Zero-Trust Admission) into an authoritative remote session transport and relay architecture.

```text
                     INTERNET / REMOTE WAN
                               │
                ┌──────────────┴──────────────┐
                │                             │
            HOME WI-FI                     4G / 5G
                │                             │
                └──────────────┬──────────────┘
                               ▼
                      SECURE BOWCON RELAY
                               │
                   ZERO-TRUST ADMISSION RUNTIME
                               │
                      REMOTE SESSION RUNTIME
                               │
                               ▼
                     ┌──────────────────┐
                     │   BOWCON BRAIN   │
                     │ Desktop DualChip │
                     └────────┬─────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     Desktop Surface    Mobile Surface     Robot Surface
      (Human 1-Chip)     (Remote Client)    (Sensor Boundary)
```

### Tiếng Việt
**Secure Always-On Brain Relay & Remote Session Runtime** kết nối các mốc MS-1.3.22 (Kết nối hai chiều), MS-1.3.23 (Nền tảng Ghép nối & Tin cậy), MS-1.3.24 (Định danh thiết bị bền vững), MS-1.3.25 (Kho lưu trữ chứng thư bảo mật), và MS-1.3.26 (Thu nạp Zero-Trust) thành một kiến trúc chuyển tiếp phiên từ xa có thẩm quyền. Não bộ (Desktop Dual-Chip) vẫn là trung tâm nhận thức duy nhất.

---

## 2. Brain Authority / Thẩm Quyền Tối Cao Của Não Bộ

### English
The Authoritative Brain remains the **SOLE** cognitive authority in BOWCON V4.0.
- Relay **DOES NOT** reason.
- Relay **DOES NOT** invoke Large Language Models (LLMs).
- Relay **DOES NOT** execute tools or inspect private tool parameters.
- Relay **DOES NOT** mutate Brain working or long-term memory.
- Relay **DOES NOT** bypass Policy Decision Point (PDP), ApprovalService, VerificationService, or CommitService.

### Tiếng Việt
Não bộ là thẩm quyền nhận thức **DUY NHẤT**. Relay không bao giờ suy luận, không gọi LLM, không thực thi công cụ, không thay đổi bộ nhớ của Não bộ, và không bao giờ vượt qua PDP hay ApprovalService.

---

## 3. Relay Role / Vai Trò Của Relay

### English
The Relay is strictly a secure communication multiplexer and transport router.
- Accepts inbound TLS/WSS connections from heterogeneous surfaces.
- Enforces Zero-Trust Admission before allowing remote session initialization.
- Multiplexes streams across Desktop, Mobile, Robot, Voice, and Web clients without cross-surface packet leakage.
- Buffers and sheds non-critical traffic under backpressure while guaranteeing critical control/security signal delivery.

### Tiếng Việt
Relay là tầng giao vận và chuyển tiếp luồng dữ liệu an toàn. Relay chỉ chuyển tiếp thông điệp đã xác thực qua Zero-Trust, bảo toàn mức độ rủi ro, và điều tiết áp lực hàng đợi mà không can thiệp vào ngữ nghĩa nhận thức.

---

## 4. Endpoint Abstraction / Trừu Tượng Hóa Điểm Cuối (Endpoint)

### English
The runtime abstracts network routing into `RelayEndpointMetadata`.
- Invariant: `ENDPOINT_KNOWLEDGE != ACCESS_TO_BRAIN`.
- The Brain server never hardcodes router IPs, home Wi-Fi SSIDs, or specific ISP interfaces.
- Knowing the Relay host or port grants zero cognitive or execution authority.

### Tiếng Việt
Địa chỉ điểm cuối chỉ là thông tin định tuyến giao vận. Việc biết địa chỉ IP hoặc cổng của Relay **KHÔNG** đồng nghĩa với quyền truy cập vào Não bộ. Không bao giờ hardcode IP gia đình hay tên Wi-Fi vào logic hệ thống.

---

## 5. Relay Registration / Đăng Ký Relay

### English
Every Relay instance must explicitly register with the Brain infrastructure through `RelayRegistrationManager`.
- Validates version compatibility (`RELAY_PROTOCOL_VERSION === '4.0.0'`).
- Validates supported protocols, endpoint metadata, and minimal capability requirements (`ROUTING`).
- Revoked relays are rejected immediately fail-closed.

### Tiếng Việt
Mọi Relay phải đăng ký tường minh với Não bộ. Đăng ký xác thực phiên bản giao thức (`4.0.0`), giao thức hỗ trợ, tính toàn vẹn của điểm cuối, và năng lực định tuyến tối thiểu. Relay bị thu hồi sẽ bị từ chối ngay lập tức.

---

## 6. Zero-Trust Admission Integration / Tích Hợp Thu Nạp Zero-Trust

### English
Relay connectivity does not imply device admission:
```text
RELAY_CONNECTED != DEVICE_ADMITTED
RELAY_CONNECTED != AUTHENTICATED
RELAY_CONNECTED != TRUSTED
```
Incoming connection handshakes must pass through `ZeroTrustAdmissionRuntime` (MS-1.3.26), which evaluates device trust records, cryptographic proofs of possession, and anti-replay nonces.

### Tiếng Việt
Kết nối vào Relay không đồng nghĩa với việc thiết bị được thu nạp. Mọi thiết bị phải trải qua quy trình đánh giá nghiêm ngặt của `ZeroTrustAdmissionRuntime`, xác minh bản ghi tin cậy và chữ ký chứng minh sở hữu khóa.

---

## 7. Session Lifecycle / Vòng Đời Phiên Từ Xa

### English
15 strictly typed states governed by a fail-closed transition matrix:
`DISCONNECTED` $\rightarrow$ `DISCOVERING` $\rightarrow$ `CONNECTING` $\rightarrow$ `CONNECTED` $\rightarrow$ `ADMISSION_PENDING` $\rightarrow$ `ADMITTED` $\rightarrow$ `SESSION_ESTABLISHING` $\rightarrow$ `SESSION_ACTIVE` $\leftrightarrow$ `DEGRADED` $\leftrightarrow$ `RECONNECTING` $\leftrightarrow$ `RESUMING` $\rightarrow$ `TERMINATING` $\rightarrow$ `TERMINATED` / `REJECTED`.

### Tiếng Việt
15 trạng thái vòng đời phiên được quản lý bởi ma trận chuyển đổi đóng khi lỗi (`fail-closed`). Mọi bước nhảy trạng thái trái phép đều bị ném lỗi `RelayTransitionError`.

---

## 8. Heartbeat Coordination / Điều Phối Nhịp Tim (Heartbeat)

### English
Monitors link health across three distinct states:
- `HEALTHY`: Normal round-trip time (RTT), zero or minimal misses.
- `DEGRADED`: Miss threshold reached (default 2 misses); session marked degraded.
- `UNHEALTHY`: Critical miss threshold reached (default 4 misses); link marked down.
Invariant: `HEARTBEAT_FAILURE != TASK_EXECUTION` and `HEARTBEAT_SUCCESS != TASK_SUCCESS`.

### Tiếng Việt
Theo dõi nhịp tim phân định 3 mức: `HEALTHY`, `DEGRADED`, và `UNHEALTHY`. Thất bại nhịp tim không bao giờ tự ý kích hoạt tác vụ hay làm thay đổi bộ nhớ nhận thức.

---

## 9. Reconnect Semantics / Ngữ Nghĩa Kết Nối Lại

### English
Cardinal Invariant:
$$\text{RECONNECT} \ne \text{RE-EXECUTE}$$
When connectivity drops and reconnects:
1. Re-establish transport communication.
2. Verify session continuity and sequence numbers.
3. Authoritative task state must be queried through VerificationService / CommitService.
4. Interrupted tasks are **NEVER** blindly re-run.

### Tiếng Việt
Bất biến cốt lõi: Kết nối lại giao vận **KHÔNG BAO GIỜ** tự động thực thi lại tác vụ. Trạng thái tác vụ phải được truy vấn qua tầng kiểm chứng có thẩm quyền.

---

## 10. Session Resume / Phục Hồi Phiên

### English
Sessions resume using cryptographic, time-bounded resume tokens.
- Sequence rewind detection: Reject if $seq_{next} \le seq_{ack}$ (prevents packet replay).
- Sequence gap detection: Reject if $seq_{next} > seq_{expected} + 1$ (prevents unacknowledged message drop).
- Invariant: `SESSION_RESUME != TASK_RESUME`.

### Tiếng Việt
Phục hồi phiên sử dụng token băm SHA-256 có thời hạn. Chống tua lại chuỗi (rewind) và chống nhảy cóc chuỗi (gap). Phục hồi phiên chỉ khôi phục kênh giao tiếp, không tái chạy tác vụ.

---

## 11. Network Roaming / Chuyển Vùng Mạng (Roaming)

### English
Devices freely transition across diverse physical network fabrics:
$$\text{Home Wi-Fi} \longrightarrow \text{Cellular 4G} \longrightarrow \text{Cellular 5G} \longrightarrow \text{Public Wi-Fi} \longrightarrow \text{Home Wi-Fi}$$
Persistent device identity and trust records remain unchanged throughout roaming transitions.

### Tiếng Việt
Thiết bị di chuyển tự do qua các môi trường mạng: Wi-Fi gia đình $\rightarrow$ 4G $\rightarrow$ 5G $\rightarrow$ Wi-Fi công cộng $\rightarrow$ Wi-Fi gia đình. Định danh thiết bị bền vững và bản ghi tin cậy giữ nguyên vẹn.

---

## 12. Network Independence / Tính Độc Lập Mạng

### English
Network topology must **NEVER** determine trust:
```text
IP_ADDRESS       != DEVICE_IDENTITY
WI_FI_SSID       != DEVICE_TRUST
NETWORK_LOCATION != AUTHORIZATION
```

### Tiếng Việt
Cấu trúc mạng không bao giờ quyết định định danh hay sự tin cậy. Địa chỉ IP và tên Wi-Fi chỉ là thông tin định tuyến, không bao giờ là danh tính bảo mật.

---

## 13. Mobile Topology / Cấu Trúc Thiết Bị Di Động

### English
Mobile devices operate strictly as surfaces/clients.
- Enrolls hardware-bound cryptographic keys in Secure Device Vault.
- Connects through Secure Relay using cellular or Wi-Fi data.
- Sends voice/text intent requests; receives verified responses.
- The Mobile device **DOES NOT** host the authoritative Brain.

### Tiếng Việt
Thiết bị di động hoạt động như bề mặt tương tác (client surface). Mobile kết nối qua Relay bằng 4G/5G/Wi-Fi, gửi yêu cầu tới Não bộ và nhận kết quả an toàn. Mobile không chứa Não bộ.

---

## 14. Robot Topology / Cấu Trúc Robot Thực Thể

### English
Robots operate via governed sensory and actuator boundaries:
$$\text{Sensors} \longrightarrow \text{Robot Surface} \longrightarrow \text{Relay} \longrightarrow \text{Admission} \longrightarrow \text{Session} \longrightarrow \text{Brain}$$
The Relay routes sensor telemetry and approved actuator commands. Relay **NEVER** directly controls physical motors or bypasses safety controllers.

### Tiếng Việt
Robot gửi dữ liệu cảm biến qua Relay tới Não bộ để lập kế hoạch và phê duyệt. Relay **KHÔNG** bao giờ điều khiển trực tiếp động cơ hay bỏ qua bộ điều khiển an toàn phần cứng.

---

## 15. Desktop Separation / Phân Tách Máy Tính Để Bàn

### English
Authoritative architecture separates:
- **Brain Server**: Dual-chip desktop workstation hosting cognitive reasoning, storage, and governance.
- **Human Work Surface**: Standard 1-chip desktop client where the human works.

### Tiếng Việt
Phân tách rõ ràng giữa Máy chủ Não bộ (Desktop Dual-Chip) chứa toàn bộ nhận thức và quản trị với Bề mặt làm việc người dùng (Desktop 1-chip).

---

## 16. Multi-Surface Model / Mô Hình Đa Bề Mặt

### English
Desktop, Mobile, Robot, Voice, and Web surfaces all connect to **ONE AUTHORITATIVE BRAIN**. No surface-specific Brains are created.

### Tiếng Việt
Tất cả các bề mặt Desktop, Mobile, Robot, Voice, và Web đều hội tụ về **MỘT NÃO BỘ DUY NHẤT**.

---

## 17. Backpressure Management / Quản Lý Áp Lực Hàng Đợi (Backpressure)

### English
Explicit states: `NORMAL` $\rightarrow$ `ELEVATED` $\rightarrow$ `HIGH` $\rightarrow$ `OVERFLOW`.
Under `OVERFLOW`:
- Normal/Low priority messages are rejected with typed `RelayBackpressureError` (no silent drop).
- Critical security and control messages are **ALWAYS** accepted and prioritized.

### Tiếng Việt
Quản lý hàng đợi qua 4 mức: `NORMAL`, `ELEVATED`, `HIGH`, `OVERFLOW`. Khi tràn hàng đợi, thông điệp không quan trọng bị từ chối có thông báo; thông điệp kiểm soát/bảo mật khẩn cấp không bao giờ bị mất.

---

## 18. Timeout Taxonomy / Phân Loại Thời Gian Chờ (Timeouts)

### English
Typed timeout taxonomy eliminating silent hangs:
`CONNECTION` (10s), `REGISTRATION` (5s), `ADMISSION` (8s), `SESSION_ESTABLISHMENT` (5s), `HEARTBEAT` (3s), `RECONNECT` (15s), `RESUME` (5s), `ROUTING` (3s), `SHUTDOWN` (5s).

### Tiếng Việt
Hệ thống timeout có kiểu rõ ràng loại bỏ hoàn toàn việc treo tiến trình âm thầm.

---

## 19. Replay Defense / Chống Tấn Công Phát Lại (Replay)

### English
Combines single-use challenge nonces from MS-1.3.26 with monotonic session sequence numbers and time-bounded resume tokens. Detects and blocks sequence rewinds and mutated tokens.

### Tiếng Việt
Ngăn chặn toàn diện tấn công phát lại bằng nonce dùng một lần, số thứ tự chuỗi tăng đơn điệu, và token phục hồi phiên có băm mật mã.

---

## 20. Scope Isolation / Cách Ly Phạm Vi 9 Chiều

### English
Enforces 9-tuple scoped isolation:
$$\langle \text{tenantId}, \text{userId}, \text{deviceId}, \text{relayId}, \text{brainId}, \text{surfaceId}, \text{sessionId}, \text{connectionId}, \text{gatewayId} \rangle$$
Prevents cross-user, cross-device, cross-surface, and cross-Brain message leakage.

### Tiếng Việt
Cách ly tuyệt đối theo bộ 9 tham số, đảm bảo không rò rỉ dữ liệu giữa người dùng, thiết bị, bề mặt hay các phiên khác nhau.

---

## 21. Audit Ledger / Sổ Nhật Ký Kiểm Toán Bất Biến

### English
Append-only, in-memory frozen audit log recording 25+ security event types (`RELAY_REGISTERED`, `ADMISSION_ACCEPTED`, `ROAMING_DETECTED`, etc.).

### Tiếng Việt
Sổ nhật ký kiểm toán chỉ cho phép ghi nối tiếp, đóng băng bất biến ghi nhận hơn 25 loại sự kiện an ninh.

---

## 22. Secret Scrubbing / Làm Sạch Bí Mật Tự Động

### English
Automatically and recursively redacts private keys, tokens, passwords, signatures, and proof material in audit details to `[REDACTED_SECRET]`.

### Tiếng Việt
Tự động quét và thay thế các khóa bí mật, token, mật khẩu, và chữ ký thành `[REDACTED_SECRET]` trước khi lưu nhật ký.

---

## 23. Security Invariants / Các Bất Biến An Ninh Bắt Buộc

```text
ONE_BRAIN                    == ONE_AUTHORITATIVE_BRAIN
RELAY                        != BRAIN
RELAY                        != DEVICE
RELAY                        != SESSION
IP_ADDRESS                   != DEVICE_IDENTITY
SSID                         != DEVICE_IDENTITY
NETWORK_LOCATION             != DEVICE_TRUST
ENDPOINT_KNOWLEDGE           != ACCESS_TO_BRAIN
RELAY_CONNECTED              != DEVICE_ADMITTED
RECONNECT                    != RE-EXECUTE
SESSION_RESUME               != TASK_RESUME
HEARTBEAT_SUCCESS            != TASK_SUCCESS
```

---

## 24. Architectural Non-Interference / Không Can Thiệp Nhận Thức

### English
Verified by `SecureBrainRelayRuntime.verifyArchitecturalNonInterference()`:
- `callsLLM: false`
- `executesTools: false`
- `mutatesBrainMemory: false`
- `controlsActuators: false`
- `bypassesPDP: false`
- `isCognitiveAuthority: false`

### Tiếng Việt
Xác thực tĩnh đảm bảo Relay hoàn toàn trung lập về mặt nhận thức: không gọi LLM, không chạy công cụ, không sửa bộ nhớ, và không vượt quyền PDP.

---

## 25. Production Infrastructure Boundary / Ranh Giới Hạ Tầng Thực Tế

### English
- **Architectural Runtime**: **REAL** (Full state machine, multiplexer, backpressure, heartbeat, roaming, and zero-trust admission integration).
- **Physical Internet Infrastructure**: **PARTIAL** (In-memory adapter is explicitly for tests; production reverse proxies, cloud tunnels, and public DNS records are deferred to future deployment milestones).

### Tiếng Việt
Phân định trung thực giữa kiến trúc runtime (REAL) và hạ tầng mạng vật lý (PARTIAL). Không giả vờ rằng đã triển khai cụm relay đám mây toàn cầu khi chưa triển khai.

---

## 26. Current Limitations / Các Giới Hạn Hiện Tại

1. Real physical OS TCP sockets and TLS reverse proxy are not wired to cloud servers.
2. In-memory transport adapter is used for deterministic local verification.
3. NAT traversal (STUN/TURN/ICE) is deferred to future networking milestones.

---

## 27. Future Deployment Path / Lộ Trình Triển Khai Tiếp Theo

1. Wire WebSocket/QUIC transport adapter to production reverse proxy (e.g. Envoy / Cloudflare Tunnel).
2. Deploy multi-region Secure Relay nodes with health-based DNS routing.
3. Integrate physical mobile app (iOS/Android) key store with Secure Device Vault.
