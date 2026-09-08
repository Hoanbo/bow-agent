# BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME ARCHITECTURAL MODEL (EN / VI)
# MÔ HÌNH KIẾN TRÚC KẾT NỐI NÃO BỘ LUÔN HOẠT ĐỘNG KHÔNG TIN CẬY & RUNTIME TIẾP NHẬN INTERNET AN TOÀN BOWCON V4.0 (MS-1.3.26)

---

## CRITICAL SECURITY PRINCIPLE / NGUYÊN TẮC AN NINH CỐT LÕI

> **"Knowing where the Brain is does not mean having the right to enter it."**  
> *"Biết Não bộ ở đâu không đồng nghĩa với việc có quyền bước vào."*

Equivalent architectural laws:
- `BRAIN_ENDPOINT_KNOWLEDGE != BRAIN_ACCESS`
- `NETWORK_ACCESS != DEVICE_TRUST`
- `DEVICE_TRUST != EXECUTION_AUTHORITY`
- `RECONNECT != RE-EXECUTE`

---

## 1. PURPOSE / MỤC ĐÍCH

**EN:**  
Milestone MS-1.3.26 builds the architectural foundation allowing trusted BOWCON surfaces (Desktop, Mobile, Robot, Web, Voice) to connect to the single authoritative Brain regardless of physical or network location. It establishes a fail-closed Zero-Trust Secure Admission Runtime where network location is treated purely as observational transport metadata, never as trust identity, user identity, or execution authority.

**VI:**  
Cột mốc MS-1.3.26 xây dựng nền tảng kiến trúc cho phép các bề mặt tương tác BOWCON đáng tin cậy (Desktop, Mobile, Robot, Web, Voice) kết nối tới duy nhất một Não bộ (Brain) có thẩm quyền tối cao bất kể vị trí vật lý hay mạng lưới. Cột mốc thiết lập Runtime Tiếp nhận An toàn Zero-Trust (Fail-Closed), nơi vị trí mạng chỉ thuần túy là dữ liệu truyền tải quan sát được (transport metadata), tuyệt đối không bao giờ được dùng làm danh tính tin cậy, danh tính người dùng hoặc thẩm quyền thực thi.

---

## 2. THREAT MODEL / MÔ HÌNH ĐE DỌA

**EN:**  
The threat model assumes every network is fundamentally hostile:
- Compromised home LANs, rogue Wi-Fi access points, public hotspots with packet inspection.
- Cellular carrier middleboxes, transparent proxies, malicious relays, and hostile internet gateways.
- Attackers possessing full knowledge of Brain domain, Brain IP, public port, gateway route, transport protocol, and even valid target `deviceId`.
- Adversaries attempting identity forging, device cloning, proof replay, signature mutation, parameter tampering, and privilege escalation.

**VI:**  
Mô hình đe dọa giả định mọi mạng lưới về bản chất đều có tính thù địch:
- Mạng LAN gia đình bị xâm nhập, điểm phát Wi-Fi giả mạo, trạm phát công cộng có khả năng nghe lén gói tin.
- Hệ thống trung gian của nhà mạng di động, proxy trong suốt, relay độc hại và gateway Internet thù địch.
- Kẻ tấn công nắm rõ toàn bộ domain của Brain, IP của Brain, cổng dịch vụ, đường dẫn gateway, giao thức và thậm chí biết cả `deviceId` mục tiêu.
- Kẻ tấn công cố gắng giả mạo danh tính, nhân bản thiết bị, phát lại bằng chứng (replay), biến đổi chữ ký (mutation), thao túng tham số và leo thang đặc quyền.

---

## 3. ZERO-TRUST MODEL / MÔ HÌNH KHÔNG TIN CẬY (ZERO-TRUST)

**EN:**  
The Zero-Trust model strictly implements the formal separation:
```
DISCOVERABLE != CONNECTABLE
CONNECTABLE != AUTHENTICATED
AUTHENTICATED != TRUSTED
TRUSTED != AUTHORIZED
AUTHORIZED != EXECUTED
```
No connection is admitted based on physical network presence. Every incoming request must pass explicit cryptographic challenge-response verification, persistent trust evaluation, replay protection, authoritative revocation verification, and capability filtering.

**VI:**  
Mô hình Zero-Trust thực thi nghiêm ngặt sự phân tách chuẩn mực:
```
TÌM THẤY != KẾT NỐI ĐƯỢC
KẾT NỐI ĐƯỢC != XÁC THỰC
XÁC THỰC != TIN CẬY
TIN CẬY != CẤP QUYỀN
CẤP QUYỀN != THỰC THI
```
Không một kết nối nào được tiếp nhận chỉ vì nó hiện diện trên cùng mạng vật lý. Mọi yêu cầu gửi đến đều bắt buộc phải vượt qua quy trình kiểm tra thử thách - phản hồi bằng mật mã, đánh giá hồ sơ tin cậy bền vững, phòng chống phát lại, kiểm tra thu hồi quyền và lọc năng lực an toàn.

---

## 4. NETWORK INDEPENDENCE / TÍNH ĐỘC LẬP MẠNG LƯỚI

**EN:**  
BOWCON does not depend on home IP, fixed LAN/WAN addresses, single routers, or specific ISPs. Whether connecting via Ethernet, 4G, 5G, Wi-Fi 6, or satellite link, the admission runtime evaluates the request identically. `isNetworkLocationTrusted` unconditionally returns `false` across all topologies.

**VI:**  
BOWCON không phụ thuộc vào IP nhà, địa chỉ LAN/WAN cố định, router đơn lẻ hay nhà cung cấp Internet cụ thể. Dù kết nối qua Ethernet, 4G, 5G, Wi-Fi 6 hay liên kết vệ tinh, runtime tiếp nhận đều đánh giá yêu cầu như nhau. Hàm `isNetworkLocationTrusted` luôn luôn trả về `false` đối với mọi cấu trúc mạng.

---

## 5. DEVICE IDENTITY INDEPENDENCE / TÍNH ĐỘC LẬP DANH TÍNH THIẾT BỊ

**EN:**  
Persistent device identity originates strictly from MS-1.3.24 / MS-1.3.25 authoritative device records. Identity resolution explicitly rejects deriving or synthesizing `deviceId` from IP address, MAC address, Wi-Fi SSID, hostname, timestamp, or random UUID.

**VI:**  
Danh tính thiết bị bền vững bắt nguồn nghiêm ngặt từ hồ sơ thiết bị có thẩm quyền của MS-1.3.24 / MS-1.3.25. Quá trình phân giải danh tính từ chối triệt để việc suy diễn hoặc tổng hợp `deviceId` từ địa chỉ IP, MAC, SSID Wi-Fi, hostname, dấu thời gian hoặc UUID ngẫu nhiên.

---

## 6. IP INDEPENDENCE / TÍNH ĐỘC LẬP ĐỊA CHỈ IP

**EN:**  
`IP_ADDRESS != DEVICE_IDENTITY`.  
- Same trusted device + different IP addresses = same persistent device identity.
- Different devices + same IP address (e.g. NAT gateway or shared café network) != same device identity.
IP addresses are treated strictly as ephemeral L3 routing markers.

**VI:**  
`ĐỊA CHỈ IP != DANH TÍNH THIẾT BỊ`.  
- Cùng một thiết bị tin cậy + các địa chỉ IP khác nhau = cùng danh tính thiết bị bền vững.
- Các thiết bị khác nhau + chung địa chỉ IP (ví dụ qua cổng NAT hoặc Wi-Fi quán café) != cùng danh tính thiết bị.
Địa chỉ IP được coi thuần túy là dữ liệu định tuyến L3 tạm thời.

---

## 7. WI-FI INDEPENDENCE / TÍNH ĐỘC LẬP MẠNG WI-FI

**EN:**  
`WI_FI_NETWORK != DEVICE_TRUST`.  
Connecting to the "Home Wi-Fi" SSID provides zero trust elevation. An unknown device present on Home Wi-Fi is immediately rejected. A trusted roaming Mobile surface on a public Wi-Fi remains recognized and admitted upon presenting valid cryptographic proof.

**VI:**  
`MẠNG WI-FI != ĐỘ TIN CẬY THIẾT BỊ`.  
Việc kết nối vào SSID "Wi-Fi Gia đình" không mang lại bất kỳ sự gia tăng tin cậy nào. Một thiết bị lạ trên Wi-Fi gia đình sẽ bị từ chối ngay lập tức. Một thiết bị Di động tin cậy đang chuyển vùng trên Wi-Fi công cộng vẫn được công nhận và tiếp nhận khi xuất trình bằng chứng mật mã hợp lệ.

---

## 8. PROTOCOL INDEPENDENCE / TÍNH ĐỘC LẬP GIAO THỨC TRUYỀN TẢI

**EN:**  
`PROTOCOL != DEVICE_TRUST`.  
Transport protocols (TLS over TCP, secure WebSockets, QUIC, encrypted loopback) are pluggable adapters under MS-1.3.19 / MS-1.3.21 abstractions. The transport layer carries admission envelopes; it never dictates trust.

**VI:**  
`GIAO THỨC != ĐỘ TIN CẬY THIẾT BỊ`.  
Các giao thức truyền tải (TLS qua TCP, Secure WebSockets, QUIC, loopback mã hóa) là các adapter có thể cắm ghép (pluggable) theo các trừu tượng của MS-1.3.19 / MS-1.3.21. Tầng truyền tải chỉ vận chuyển các phong bì tiếp nhận; nó không bao giờ quyết định độ tin cậy.

---

## 9. SECURE ADMISSION / QUY TRÌNH TIẾP NHẬN AN TOÀN

**EN:**  
The admission lifecycle executes 16 discrete states:
```
ADMISSION_RECEIVED → TRANSPORT_VALIDATING → PROTOCOL_VALIDATING → 
SCOPE_VALIDATING → IDENTITY_RESOLVING → TRUST_RESOLVING → 
CHALLENGE_REQUIRED → PROOF_REQUIRED → PROOF_VALIDATING → 
REPLAY_VALIDATING → REVOCATION_VALIDATING → SESSION_VALIDATING → 
CAPABILITY_FILTERING → ADMITTED (or REJECTED / TERMINATED)
```
Failure at any gate results in immediate fail-closed termination.

**VI:**  
Vòng đời tiếp nhận thực thi qua 16 trạng thái rời rạc:
```
TIẾP NHẬN YÊU CẦU → KIỂM TRA TRUYỀN TẢI → KIỂM TRA GIAO THỨC → 
KIỂM TRA PHẠM VI → PHÂN GIẢI DANH TÍNH → ĐÁNH GIÁ ĐỘ TIN CẬY → 
YÊU CẦU THỬ THÁCH → YÊU CẦU BẰNG CHỨNG → XÁC MINH BẰNG CHỨNG → 
CHỐNG PHÁT LẠI → KIỂM TRA THU HỒI → KIỂM TRA PHIÊN → 
LỌC NĂNG LỰC → TIẾP NHẬN THÀNH CÔNG (hoặc TỪ CHỐI / CHẤM DỨT)
```
Bất kỳ bước nào không đạt đều dẫn đến việc từ chối ngay lập tức theo nguyên tắc fail-closed.

---

## 10. ENDPOINT ABSTRACTION / TRỪU TƯỢNG HÓA ENDPOINT

**EN:**  
Endpoints are encapsulated as `EndpointMetadata` (host, port, protocol, tlsEnabled, path). Hardcoding Brain IP, gateway address, or single port is strictly forbidden. The system validates endpoint metadata while enforcing that knowing the endpoint grants zero admission rights.

**VI:**  
Các điểm cuối (endpoint) được đóng gói dưới dạng `EndpointMetadata` (host, port, protocol, tlsEnabled, path). Nghiêm cấm hardcode IP của Brain, địa chỉ gateway hay cổng đơn lẻ. Hệ thống xác thực metadata điểm cuối đồng thời thực thi nguyên tắc: việc biết endpoint không mang lại bất kỳ quyền truy cập nào.

---

## 11. CHALLENGE & PROOF / THỬ THÁCH & BẰNG CHỨNG MẬT MÃ

**EN:**  
Upon initial contact without proof, `AdmissionChallengeTracker` issues an ephemeral, single-use `DeviceChallenge` with a 60-second TTL and unique nonce. The client must sign the challenge using its private key (MS-1.3.24) and return a `DeviceProof`. On verification, the challenge is consumed immediately.

**VI:**  
Khi nhận yêu cầu ban đầu chưa có bằng chứng, `AdmissionChallengeTracker` phát hành một `DeviceChallenge` tạm thời, dùng một lần với TTL 60 giây và nonce độc nhất. Phía client phải ký thử thách này bằng khóa riêng tư (MS-1.3.24) và gửi lại `DeviceProof`. Sau khi xác minh thành công, thử thách sẽ bị hủy ngay lập tức.

---

## 12. TRUST VALIDATION / XÁC THỰC ĐỘ TIN CẬY BỀN VỮNG

**EN:**  
`AdmissionTrust` evaluates the device's persistent record against expiration (`expiresAt`), active key version, and trust level (`TRUSTED` / `PAIRED`). Expired or unlisted devices fail closed with `TRUST_EXPIRED` or `DEVICE_NOT_TRUSTED`.

**VI:**  
`AdmissionTrust` đánh giá hồ sơ bền vững của thiết bị dựa trên thời hạn hết hạn (`expiresAt`), phiên bản khóa hoạt động và cấp độ tin cậy (`TRUSTED` / `PAIRED`). Thiết bị hết hạn hoặc không có trong danh sách sẽ bị từ chối với mã `TRUST_EXPIRED` hoặc `DEVICE_NOT_TRUSTED`.

---

## 13. REPLAY DEFENSE / PHÒNG CHỐNG TẤN CÔNG PHÁT LẠI

**EN:**  
`AdmissionReplayTracker` records consumed nonces and cryptographic proof signature digests in an in-memory sliding window. Re-submitting identical nonces or replaying/mutating previous proof signatures triggers immediate `REPLAY_DETECTED` rejection.

**VI:**  
`AdmissionReplayTracker` lưu lại các nonce đã tiêu thụ và digest chữ ký của bằng chứng mật mã trong cửa sổ trượt bộ nhớ. Việc gửi lại nonce trùng lặp hoặc phát lại/biến đổi chữ ký bằng chứng trước đó sẽ kích hoạt từ chối ngay lập tức với mã `REPLAY_DETECTED`.

---

## 14. REVOCATION FAIL-CLOSED / THU HỒI QUYỀN FAIL-CLOSED

**EN:**  
`AdmissionRevocationRegistry` maintains authoritative records of permanently revoked devices and keys. A revoked device is halted at Step 5 of admission, preventing challenge issuance or session renewal regardless of valid credentials.

**VI:**  
`AdmissionRevocationRegistry` duy trì danh sách có thẩm quyền về các thiết bị và khóa bị thu hồi vĩnh viễn. Thiết bị bị thu hồi sẽ bị chặn ngay tại Bước 5 của quy trình tiếp nhận, ngăn chặn việc cấp thử thách hay làm mới phiên dù có thông tin xác thực hợp lệ.

---

## 15. SESSION VALIDATION & SEPARATION / PHÂN TÁCH DANH TÍNH & PHIÊN

**EN:**  
`DEVICE_ID != SESSION_ID`.  
Persistent device identity survives reboots and long durations. Sessions are ephemeral transport bindings managed by `AdmissionSessionCoordinator`. A single device may hold distinct successive sessions across connections without altering its device identity.

**VI:**  
`MÃ THIẾT BỊ != MÃ PHIÊN`.  
Danh tính thiết bị bền vững tồn tại qua các lần khởi động lại và thời gian dài. Phiên (session) chỉ là liên kết truyền tải tạm thời do `AdmissionSessionCoordinator` quản lý. Một thiết bị có thể nắm giữ các phiên kế tiếp nhau qua các kết nối mà không làm thay đổi danh tính thiết bị của nó.

---

## 16. ROAMING MODEL / MÔ HÌNH CHUYỂN VÙNG MẠNG (ROAMING)

**EN:**  
Surfaces seamlessly transition across network topologies:
`Home Wi-Fi → 4G → 5G → Public Wi-Fi → Mobile Hotspot → Home Wi-Fi`.  
The admission runtime detects roaming via `isNetworkRoaming`, verifies persistent device trust, validates session continuity, and admits the connection under the same persistent identity.

**VI:**  
Các bề mặt tương tác chuyển vùng liền mạch qua nhiều hình thái mạng:
`Wi-Fi Gia đình → 4G → 5G → Wi-Fi Công cộng → Điểm phát Hotspot → Wi-Fi Gia đình`.  
Runtime tiếp nhận phát hiện chuyển vùng qua `isNetworkRoaming`, xác thực độ tin cậy thiết bị bền vững, kiểm tra tính liên tục của phiên và tiếp nhận kết nối dưới cùng một danh tính bền vững.

---

## 17. MOBILE ROAMING / CHUYỂN VÙNG DI ĐỘNG (MOBILE)

**EN:**  
A smartphone running as a personal surface leaves home, switches from Wi-Fi to cellular data, and later connects to a remote office network. The Mobile surface's persistent key and trust profile remain unchanged; each connection re-authenticates cryptographically without user password prompts.

**VI:**  
Điện thoại thông minh hoạt động như bề mặt cá nhân khi rời khỏi nhà, chuyển từ Wi-Fi sang mạng di động và sau đó kết nối Wi-Fi văn phòng. Khóa bền vững và hồ sơ tin cậy của Mobile không thay đổi; mỗi kết nối đều tái xác thực bằng mật mã tự động mà không đòi hỏi mật khẩu người dùng.

---

## 18. ROBOT ROAMING / CHUYỂN VÙNG ROBOT VẬT LÝ (ROBOT)

**EN:**  
Embodied robot surfaces operating across facility boundaries may switch between local factory Wi-Fi, 5G cellular gateways, and remote fallback relays. Robot identity remains anchored to its cryptographic hardware key envelope, not its IP subnet.

**VI:**  
Các bề mặt robot vật lý vận hành qua các ranh giới nhà xưởng có thể chuyển đổi giữa Wi-Fi cục bộ, gateway di động 5G và relay dự phòng từ xa. Danh tính Robot gắn chặt vào phong bì khóa mật mã phần cứng, không phụ thuộc vào dải mạng IP (subnet).

---

## 19. DESKTOP ARCHITECTURE / KIẾN TRÚC MÁY TRẠM (DESKTOP)

**EN:**  
The desktop dual-chip workstation hosts the single authoritative Brain / Agent Server, while single-chip workstations operate as client surfaces. Client workstations connect to the Secure Admission Edge locally or remotely under the identical Zero-Trust admission discipline.

**VI:**  
Máy trạm Desktop dual-chip là nơi lưu trữ duy nhất một Não bộ (Brain) / Agent Server có thẩm quyền tối cao, trong khi các máy trạm single-chip hoạt động như bề mặt client. Máy trạm client kết nối tới Cổng tiếp nhận an toàn qua mạng cục bộ hoặc từ xa dưới cùng một kỷ luật Zero-Trust đồng nhất.

---

## 20. UNAUTHORIZED INTERNET ACTOR DEFENSE / PHÒNG THỦ KẺ TẤN CÔNG INTERNET

**EN:**  
If an attacker discovers Brain IP, open port, domain, and gateway URL, they encounter a silent, fail-closed barrier:
1. Probe without proof → `CHALLENGE_REQUIRED`.
2. Probe with fake `deviceId` → `DEVICE_NOT_TRUSTED`.
3. Probe with cloned `deviceId` + invalid signature → `INVALID_PROOF`.
4. Probe with replayed signature → `REPLAY_DETECTED`.
5. Probe with revoked device → `DEVICE_REVOKED`.

**VI:**  
Nếu kẻ tấn công phát hiện IP của Brain, cổng mở, domain và URL gateway, chúng sẽ đối mặt với bức tường chắn fail-closed kiên cố:
1. Thăm dò không có bằng chứng → `CHALLENGE_REQUIRED`.
2. Thăm dò với `deviceId` giả mạo → `DEVICE_NOT_TRUSTED`.
3. Thăm dò với `deviceId` nhân bản + chữ ký sai → `INVALID_PROOF`.
4. Thăm dò với chữ ký phát lại → `REPLAY_DETECTED`.
5. Thăm dò với thiết bị đã bị thu hồi → `DEVICE_REVOKED`.

---

## 21. CAPABILITY SECURITY / AN NINH PHÂN QUYỀN NĂNG LỰC

**EN:**  
Admitted data-plane connections are restricted to safe observational capabilities (`SURFACE_STATUS`, `RECEIVE_EVENTS`, `TELEMETRY_EMIT`). All 9 cognitive and bypass capabilities are strictly forbidden:
`EXECUTE_TOOL`, `MUTATE_BRAIN`, `BYPASS_PDP`, `BYPASS_APPROVAL`, `BYPASS_VERIFICATION`, `BYPASS_COMMIT`, `ALTER_BRAIN_MEMORY`, `DIRECT_ROBOT_ACTUATION`, `DIRECT_MOBILE_AUTOMATION`.

**VI:**  
Các kết nối tầng dữ liệu được tiếp nhận chỉ được giới hạn ở các năng lực quan sát an toàn (`SURFACE_STATUS`, `RECEIVE_EVENTS`, `TELEMETRY_EMIT`). Cả 9 năng lực nhận thức và vượt rào đều bị nghiêm cấm:
`EXECUTE_TOOL`, `MUTATE_BRAIN`, `BYPASS_PDP`, `BYPASS_APPROVAL`, `BYPASS_VERIFICATION`, `BYPASS_COMMIT`, `ALTER_BRAIN_MEMORY`, `DIRECT_ROBOT_ACTUATION`, `DIRECT_MOBILE_AUTOMATION`.

---

## 22. BRAIN AUTHORITY / THẨM QUYỀN TỐI CAO CỦA NÃO BỘ

**EN:**  
There is strictly ONE authoritative BOWCON Brain. The admission runtime, gateway, and surfaces are not cognitive authorities. Surfaces cannot reason, plan, or commit durable state; they are sensory-interaction surfaces only.

**VI:**  
Duy nhất chỉ có MỘT Não bộ BOWCON có thẩm quyền tối cao. Runtime tiếp nhận, gateway và các bề mặt không phải là cơ quan nhận thức. Các bề mặt không thể suy luận, lập kế hoạch hay commit trạng thái bền vững; chúng chỉ là các bề mặt cảm quan - tương tác.

---

## 23. EXECUTION BOUNDARY / RANH GIỚI THỰC THI

**EN:**  
`ADMITTED != AUTHORIZED != EXECUTED`.  
Admission grants permission to exchange messages across the transport boundary. Reaching the Brain does NOT permit executing tools or modifying state without Policy Decision Point (PDP) evaluation, human approval, and verification.

**VI:**  
`TIẾP NHẬN != CẤP QUYỀN != THỰC THI`.  
Việc tiếp nhận chỉ cho phép trao đổi thông điệp qua ranh giới truyền tải. Kết nối tới được Brain KHÔNG đồng nghĩa với việc được thực thi công cụ hoặc thay đổi trạng thái nếu chưa qua đánh giá PDP, phê duyệt của con người và xác minh kết quả.

---

## 24. RECOVERY BOUNDARY / RANH GIỚI PHỤC HỒI & TÍNH LIÊN TỤC

**EN:**  
`RECONNECT != RE-EXECUTE`.  
When a network connection is dropped and resumed across a roaming boundary, interrupted operations are NEVER automatically re-executed. Session sequence continuity is validated, but task re-execution requires explicit Brain orchestration.

**VI:**  
`TÁI KẾT NỐI != TÁI THỰC THI`.  
Khi kết nối mạng bị gián đoạn và phục hồi sau chuyển vùng, các tác vụ bị ngắt quãng TUYỆT ĐỐI KHÔNG được tự động tái thực thi. Tính liên tục của chuỗi sequence được kiểm tra, nhưng việc thực thi lại tác vụ bắt buộc phải do Brain điều phối rõ ràng.

---

## 25. AUDIT & SECRET SCRUBBING / KIỂM TOÁN & KHỬ DỮ LIỆU NHẠY CẢM

**EN:**  
`AdmissionAuditLedger` logs observational security events in an append-only ledger. All records pass through `scrubAdmissionSecrets`, ensuring private keys, tokens, passwords, and raw cryptographic signatures are redacted as `[REDACTED_SECRET]` before persistence or logging.

**VI:**  
`AdmissionAuditLedger` ghi nhật ký các sự kiện an ninh quan sát được vào sổ cái chỉ-thêm (append-only). Mọi bản ghi đều đi qua hàm `scrubAdmissionSecrets`, đảm bảo các khóa riêng tư, token, mật khẩu và chữ ký mật mã thô đều được che giấu thành `[REDACTED_SECRET]` trước khi lưu trữ hoặc ghi log.

---

## 26. SECURITY INVARIANTS / CÁC BẤT BIẾN AN NINH

1. `DISCOVERABLE != CONNECTABLE`
2. `CONNECTABLE != AUTHENTICATED`
3. `AUTHENTICATED != TRUSTED`
4. `TRUSTED != AUTHORIZED`
5. `AUTHORIZED != EXECUTED`
6. `NETWORK_LOCATION != DEVICE_IDENTITY`
7. `IP_ADDRESS != DEVICE_IDENTITY`
8. `WI_FI != DEVICE_TRUST`
9. `PROTOCOL != DEVICE_TRUST`
10. `DEVICE_ID != SESSION_ID`
11. `DEVICE_TRUST != BRAIN_AUTHORITY`
12. `DEVICE_TRUST != EXECUTION_AUTHORITY`
13. `KNOWING_ENDPOINT != ACCESS`
14. `KNOWING_DEVICE_ID != POSSESSING_DEVICE_KEY`
15. `POSSESSING_DEVICE_KEY != EXECUTION_AUTHORITY`
16. `RECONNECT != RE-EXECUTE`
17. `REVOCATION == FAIL_CLOSED`
18. `EXPIRED_TRUST == REJECT`
19. `INVALID_PROOF == REJECT`
20. `REPLAY == REJECT`
21. `MUTATED_REPLAY == REJECT`
22. `CROSS_SCOPE == REJECT`
23. `FORBIDDEN_CAPABILITY == REJECT`
24. `ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN`

---

## 27. FUTURE PRODUCTION PROMOTION / ĐỊNH HƯỚNG TRIỂN KHAI TƯƠNG LAI

**EN:**  
This milestone establishes the architectural core for secure internet admission. Future milestones will promote this foundation to operational deployment:
- Always-On Brain Server daemon & OS service supervision.
- Production relay & secure rendezvous signaling.
- Mobile native application runtime & background keep-alive.
- Robot embedded firmware edge runtime.

**VI:**  
Cột mốc này thiết lập lõi kiến trúc cho việc tiếp nhận Internet an toàn. Các cột mốc tương lai sẽ nâng cấp nền tảng này vào triển khai vận hành:
- Daemon Brain Server luôn chạy và giám sát tiến trình hệ điều hành.
- Relay môi trường sản xuất và tín hiệu rendezvous an toàn.
- Ứng dụng Di động native và duy trì kết nối nền.
- Firmware nhúng cho Robot tại biên.

---

## 28. NON-GOALS / MỤC TIÊU NGOẠI TRỪ (NON-GOALS)

**EN:**  
MS-1.3.26 explicitly does NOT implement:
- Public DNS provisioning, domain purchasing, or TLS certbot automation.
- TURN/STUN servers or NAT traversal hole punching.
- OS daemon installation or systemd/Windows service registration.
- Mobile client UI, Robot ROS2 drivers, or speech recognition engines.
- Real socket listeners (`net.Server`, `http.createServer`, `WebSocketServer`).

**VI:**  
MS-1.3.26 dứt khoát KHÔNG thực hiện:
- Cấu hình DNS công cộng, mua domain hoặc tự động hóa chứng chỉ TLS certbot.
- Máy chủ TURN/STUN hoặc đục lỗ NAT traversal.
- Cài đặt daemon hệ điều hành hoặc đăng ký dịch vụ systemd/Windows Service.
- Giao diện ứng dụng di động, driver ROS2 cho Robot hoặc engine nhận dạng giọng nói.
- Bộ lắng nghe socket thực tế (`net.Server`, `http.createServer`, `WebSocketServer`).

---

## 29. TESTING & VERIFICATION / KIỂM THỬ & XÁC MINH

**EN:**  
- Dedicated test suite: `tests/test_v4_agent_zero_trust_admission.ts`.
- 222 meaningful assertions covering Categories A through AP.
- 100% pass rate across 28 test suites in full regression (~2,410+ assertions).
- Zero compiler errors under strict TypeScript typecheck.
- Zero whitespace errors under `git diff --check`.

**VI:**  
- Bộ kiểm thử chuyên biệt: `tests/test_v4_agent_zero_trust_admission.ts`.
- 222 kiểm tra (assertions) có ý nghĩa bao phủ các Danh mục từ A đến AP.
- Tỷ lệ đạt 100% trên toàn bộ 28 bộ kiểm thử hồi quy (~2.410+ assertions).
- 0 lỗi biên dịch theo kiểm tra kiểu dữ liệu nghiêm ngặt của TypeScript.
- 0 lỗi khoảng trắng theo `git diff --check`.

---

## 30. OPERATIONAL LIMITATIONS / GIỚI HẠN VẬN HÀNH

**EN:**  
The runtime functions deterministically within the Node.js / TypeScript in-memory and file-backed harness. Network sockets and connections are simulated through high-fidelity network adapters without raw TCP/UDP listener overhead. Real public IP routing will be layered atop this architecture in upcoming connectivity milestones.

**VI:**  
Runtime vận hành có tính xác định bên trong môi trường Node.js / TypeScript (bộ nhớ và tệp tin). Socket mạng và kết nối được mô phỏng qua các network adapter chuẩn xác cao mà không tạo gánh nặng listener TCP/UDP thô. Định tuyến IP công cộng thực tế sẽ được tích hợp lớp trên của kiến trúc này trong các cột mốc kết nối tiếp theo.
