# BOWCON V4.0 — MS-1.3.20 SECURE REMOTE GATEWAY & PROTOCOL FOUNDATION MODEL (EN & VI)
**Package:** `@bow/agent` | **Version:** `4.0.0` | **Level:** L4 Autonomous Universal Brain Architecture

---

## 1. Executive Summary / Tóm tắt Điều hành

### EN:
Milestone MS-1.3.20 establishes the authoritative **Secure Remote Gateway & Protocol Foundation** for BOWCON V4.0. It bridges the authoritative Brain transport subsystem (`TransportService`, MS-1.3.19) and future network adapters for remote embodiment surfaces (such as BOW-Mobile, BOW-Robot, Desktop, Web, and Voice). 

**CRITICAL NOTICE:** MS-1.3.20 **DOES NOT** implement real network I/O. There are zero sockets, zero HTTP servers, zero WebSocket servers, zero WebRTC endpoints, zero MQTT brokers, zero gRPC channels, and zero background listeners. It is a strictly deterministic, pure-data and protocol foundation.

### VI:
Cột mốc MS-1.3.20 thiết lập nền tảng **Cổng Từ xa An toàn & Giao thức (Secure Remote Gateway & Protocol Foundation)** có thẩm quyền cho BOWCON V4.0. Nó đóng vai trò cầu nối giữa phân hệ truyền tải Não bộ (`TransportService`, MS-1.3.19) và các bộ điều hợp mạng (network adapters) tương lai dành cho các bề mặt hiện thân từ xa (như BOW-Mobile, BOW-Robot, Desktop, Web, Voice).

**LƯU Ý CỐT TỬ:** MS-1.3.20 **KHÔNG** triển khai bất kỳ I/O mạng thực tế nào. Không có socket, không có máy chủ HTTP, không có WebSocket server, không có WebRTC, không có MQTT, không có gRPC và không có listener chạy ngầm. Đây là một nền tảng giao thức và kiểm soát thuần dữ liệu, tất định 100%.

---

## 2. Purpose / Mục đích

### EN:
The objective of MS-1.3.20 is to construct a fail-closed, multi-tenant isolated protocol and session gateway that enforces strict boundaries between remote surfaces and the authoritative Brain. It provides deterministic gateway identities, peer identities, pure-data handshake negotiations, capability filtering, monotonic sequence tracking, replay prevention, data-only rate limiting, and immutable audit logging.

### VI:
Mục tiêu của MS-1.3.20 là xây dựng một cổng phiên và giao thức cô lập đa người thuê (multi-tenant) với cơ chế thất bại đóng (fail-closed), thực thi các ranh giới nghiêm ngặt giữa các bề mặt từ xa và Não bộ có thẩm quyền. Hệ thống cung cấp định danh cổng tất định, định danh máy khách, bắt tay đàm phán thuần dữ liệu, lọc quyền năng, theo dõi chuỗi đơn điệu, chống phát lại, giới hạn tốc độ thuần dữ liệu và nhật ký kiểm toán bất biến.

---

## 3. Scope / Phạm vi

### EN:
- Pure TypeScript contracts and implementations located exclusively in `src/core/remote/`.
- 6-tuple multi-tenant scope isolation: `(userId, sessionId, brainId, surfaceId, transportId, gatewayId)`.
- Deterministic FNV-1a 32-bit fingerprinting for identities, handshakes, sessions, and protocol requests.
- Fail-closed lifecycle state machines and transition matrices.
- Token-based authentication boundary contract (pure validation, no external IdP).
- Authorization checks enforcing that `AUTHENTICATED ≠ AUTHORIZED`.
- Capability negotiation strictly prohibiting cognitive and execution capabilities.
- Monotonic sequence progression, gap detection, and stale sequence rejection.
- Replay defense distinguishing idempotent duplicates, mutated conflicts, and cross-scope injections.
- Data-only rate/quota classification (`NORMAL`, `ELEVATED`, `HIGH`, `SATURATED`, `BLOCKED`).
- Automatic secret scrubbing across errors, audit records, and protocol metadata.
- Dependency injection into `AgentLoop` via `getRemoteGateway()`.

### VI:
- Các hợp đồng và mã nguồn TypeScript thuần túy nằm độc quyền tại `src/core/remote/`.
- Cô lập phạm vi 6 thành phần đa người thuê: `(userId, sessionId, brainId, surfaceId, transportId, gatewayId)`.
- Băm FNV-1a 32-bit tất định cho định danh, bắt tay, phiên và yêu cầu giao thức.
- Máy trạng thái vòng đời và ma trận chuyển đổi thất bại đóng (fail-closed).
- Ranh giới hợp đồng xác thực dựa trên token (xác thực thuần túy, không dùng IdP bên ngoài).
- Kiểm tra phân quyền thực thi nguyên tắc `ĐÃ XÁC THỰC ≠ ĐƯỢC ỦY QUYỀN`.
- Đàm phán quyền năng nghiêm cấm tuyệt đối các quyền năng nhận thức và thực thi.
- Tiến trình chuỗi đơn điệu, phát hiện khoảng cách và từ chối chuỗi cũ.
- Phòng thủ chống phát lại phân biệt bản sao bình ổn, xung đột biến đổi và tấn công xuyên phạm vi.
- Phân loại hạn mức/tốc độ thuần dữ liệu (`NORMAL`, `ELEVATED`, `HIGH`, `SATURATED`, `BLOCKED`).
- Tự động thanh lọc bí mật (secret scrubbing) khỏi lỗi, bản ghi kiểm toán và siêu dữ liệu giao thức.
- Tiêm phụ thuộc vào `AgentLoop` thông qua phương thức `getRemoteGateway()`.

---

## 4. Non-Scope / Ngoài phạm vi

### EN:
- **NO Real Network I/O:** No `fetch`, `axios`, `http`, `https`, `WebSocket`, `socket.io`, `WebRTC`, `MQTT`, `TCP`, `UDP`, or `gRPC`.
- **NO Network Daemons or Listeners:** Zero background ports opened.
- **NO External Identity Providers:** No OAuth2, OIDC, JWT issuer verification network calls, or LDAP.
- **NO Direct Execution Authority:** Remote peers cannot execute tools, bypass PDP, or force commit.
- **NO Hardware Control:** No robot motors, sensors, or mobile device native bridges.

### VI:
- **KHÔNG I/O mạng thực tế:** Không dùng `fetch`, `axios`, `http`, `https`, `WebSocket`, `socket.io`, `WebRTC`, `MQTT`, `TCP`, `UDP`, hay `gRPC`.
- **KHÔNG dịch vụ mạng hay cổng lắng nghe:** Không mở bất kỳ cổng mạng ngầm nào.
- **KHÔNG nhà cung cấp định danh bên ngoài:** Không gọi mạng OAuth2, OIDC, xác thực JWT issuer qua mạng, hay LDAP.
- **KHÔNG thẩm quyền thực thi trực tiếp:** Máy khách từ xa không thể thực thi công cụ, không vượt qua PDP, không ép commit.
- **KHÔNG điều khiển phần cứng:** Không điều khiển động cơ robot, cảm biến hay cầu nối native di động.

---

## 5. Architecture / Kiến trúc

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
                        SECURE REMOTE GATEWAY (MS-1.3.20)
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
           Remote Protocol                    Remote Session
                  │                                 │
                  └────────────────┬────────────────┘
                                   ▼
                        Future Network Adapter
                                   │
                        ┌──────────┴──────────┐
                        ▼                     ▼
                   BOW-Mobile             BOW-Robot
```

---

## 6. ONE BOWCON BRAIN / Một Não bộ BOWCON Duy nhất

### EN:
The BOWCON architecture dictates exactly **ONE authoritative Brain**. Remote clients, presentation surfaces (Mobile, Web, Desktop, Voice), and physical embodiments (Robot) are strictly peripheral endpoints. They MUST NEVER become secondary brains, duplicate cognitive planning, store independent authoritative memory, or hold execution authority.

### VI:
Kiến trúc BOWCON quy định chính xác **MỘT Não bộ có thẩm quyền duy nhất**. Các máy khách từ xa, các bề mặt hiển thị (Mobile, Web, Desktop, Voice), và hiện thân vật lý (Robot) tuyệt đối chỉ là các điểm cuối ngoại vi. Chúng KHÔNG BAO GIỜ được trở thành não bộ thứ cấp, không nhân bản lập kế hoạch nhận thức, không lưu trữ bộ nhớ có thẩm quyền độc lập, và không nắm giữ quyền thực thi.

---

## 7. Remote Gateway / Cổng Từ xa

### EN:
`RemoteGateway` (`src/core/remote/remoteGateway.ts`) manages peer identity registrations, pure-data handshake negotiations, remote session lifecycle states, capability gating, monotonic sequence ordering, and replay prevention. It operates as an intermediary between `TransportService` and future physical network adapters.

### VI:
`RemoteGateway` (`src/core/remote/remoteGateway.ts`) quản lý việc đăng ký định danh máy khách, đàm phán bắt tay thuần dữ liệu, vòng đời phiên từ xa, kiểm soát quyền năng, thứ tự chuỗi đơn điệu và phòng chống phát lại. Nó đóng vai trò trung gian giữa `TransportService` và các adapter mạng vật lý trong tương lai.

---

## 8. Remote Peer / Máy khách Từ xa

### EN:
A `RemotePeerIdentity` (`peer_<fingerprint>`) represents a remote presentation surface or client (e.g. mobile app, robot interface). It is deterministically generated from `(surfaceId, surfaceType, clientVersion)` and possesses zero cognitive authority.

### VI:
`RemotePeerIdentity` (`peer_<fingerprint>`) đại diện cho một bề mặt hiển thị hoặc máy khách từ xa (vd: ứng dụng di động, giao diện robot). Nó được sinh tất định từ `(surfaceId, surfaceType, clientVersion)` và sở hữu 0% thẩm quyền nhận thức.

---

## 9. Protocol / Giao thức

### EN:
The logical protocol (`BOWCON_REMOTE_PROTOCOL`, version `1.0.0`) governs structured request-response communication between peers and the gateway. It enforces strict payload size limits (64 KB) and depth nesting limits (8 levels).

### VI:
Giao thức logic (`BOWCON_REMOTE_PROTOCOL`, phiên bản `1.0.0`) điều chỉnh các giao tiếp yêu cầu-phản hồi có cấu trúc giữa máy khách và cổng. Nó thực thi giới hạn kích thước tải dữ liệu nghiêm ngặt (64 KB) và giới hạn độ sâu lồng nhau (8 cấp).

---

## 10. Protocol Versioning / Quản lý Phiên bản Giao thức

### EN:
Version negotiation is strictly fail-closed. If a peer requests an unsupported protocol version, the gateway rejects the handshake with `PROTOCOL_MISMATCH`. No silent downgrades or implicit compatibility are permitted.

### VI:
Đàm phán phiên bản tuyệt đối thất bại đóng (fail-closed). Nếu máy khách yêu cầu phiên bản giao thức không được hỗ trợ, cổng sẽ từ chối bắt tay với mã `PROTOCOL_MISMATCH`. Không cho phép hạ cấp ngầm hay tương thích mặc định.

---

## 11. Handshake / Bắt tay Đàm phán

### EN:
Handshake negotiation (`evaluateRemoteHandshake`) validates the 6-tuple scope, checks protocol compatibility, filters requested capabilities, and verifies authorization tokens. It NEVER executes tools, calls PDP, or mutates durable memory.

### VI:
Đàm phán bắt tay (`evaluateRemoteHandshake`) xác thực phạm vi 6 thành phần, kiểm tra tương thích giao thức, lọc các quyền năng yêu cầu và kiểm tra token xác thực. Quá trình này KHÔNG BAO GIỜ thực thi công cụ, gọi PDP, hay biến đổi bộ nhớ bền vững.

---

## 12. Authentication Boundary / Ranh giới Xác thực

### EN:
The authentication boundary contract validates credential tokens in pure memory. It distinguishes `AUTHENTICATION_REQUIRED`, `AUTHENTICATED`, `AUTHENTICATION_INVALID`, `AUTHENTICATION_EXPIRED`, and `AUTHENTICATION_REJECTED`. It does not contact external identity providers.

### VI:
Hợp đồng ranh giới xác thực kiểm tra các token định danh thuần túy trong bộ nhớ. Nó phân biệt rõ ràng các trạng thái `AUTHENTICATION_REQUIRED`, `AUTHENTICATED`, `AUTHENTICATION_INVALID`, `AUTHENTICATION_EXPIRED`, và `AUTHENTICATION_REJECTED`. Nó không gọi đến các dịch vụ IdP bên ngoài.

---

## 13. Authorization Boundary / Ranh giới Phân quyền

### EN:
The architecture strictly enforces:
- **`AUTHENTICATED ≠ AUTHORIZED`**: Having a valid identity does not grant permission to perform operations.
- **`AUTHORIZED ≠ EXECUTED`**: Being authorized to request an observation does not mean a tool was executed.
- **`DELIVERED ≠ SUCCEEDED`**: Delivering a message to a surface does not signify task completion.

### VI:
Kiến trúc thực thi nghiêm ngặt:
- **`ĐÃ XÁC THỰC ≠ ĐƯỢC ỦY QUYỀN`**: Có danh tính hợp lệ không đồng nghĩa với việc được phép thực hiện thao tác.
- **`ĐƯỢC ỦY QUYỀN ≠ ĐÃ THỰC THI`**: Được ủy quyền yêu cầu quan sát không có nghĩa là công cụ đã chạy.
- **`ĐÃ CHUYỂN PHÁT ≠ THÀNH CÔNG`**: Chuyển phát thông điệp tới bề mặt không đại diện cho tác vụ hoàn thành.

---

## 14. Capability Negotiation / Đàm phán Quyền năng

### EN:
Allowed capabilities: `RECEIVE_EVENTS`, `SEND_ACK`, `SEND_NACK`, `REQUEST_CONTINUITY`, `REQUEST_RECONNECT`, `OBSERVE_STATUS`, `REQUEST_PROTOCOL_INFO`.
Forbidden capabilities: `EXECUTE_TOOL`, `MUTATE_BRAIN`, `BYPASS_PDP`, `BYPASS_APPROVAL`, `MUTATE_COMMIT`, `FORCE_RECOVERY`, `CHANGE_GOVERNANCE`.
Any request for forbidden capabilities fails closed with `CAPABILITY_ESCALATION`.

### VI:
Quyền năng cho phép: `RECEIVE_EVENTS`, `SEND_ACK`, `SEND_NACK`, `REQUEST_CONTINUITY`, `REQUEST_RECONNECT`, `OBSERVE_STATUS`, `REQUEST_PROTOCOL_INFO`.
Quyền năng bị cấm: `EXECUTE_TOOL`, `MUTATE_BRAIN`, `BYPASS_PDP`, `BYPASS_APPROVAL`, `MUTATE_COMMIT`, `FORCE_RECOVERY`, `CHANGE_GOVERNANCE`.
Mọi yêu cầu quyền năng bị cấm đều bị từ chối đóng an toàn với mã `CAPABILITY_ESCALATION`.

---

## 15. Remote Session / Phiên Từ xa

### EN:
A `RemoteSessionSnapshot` represents a communication session between a peer and the gateway. It tracks sequence numbers, health, and granted capabilities. It MUST NEVER be confused with or replace the authoritative Brain session.

### VI:
`RemoteSessionSnapshot` đại diện cho một phiên giao tiếp giữa máy khách và cổng. Nó theo dõi số thứ tự chuỗi, trạng thái sức khỏe và các quyền năng được cấp. Nó KHÔNG ĐƯỢC nhầm lẫn hoặc thay thế phiên làm việc của Não bộ.

---

## 16. Sequence Model / Mô hình Chuỗi

### EN:
Monotonic sequencing guarantees strictly ordered message processing. Stale sequences (`incoming <= lastSequence`) and sequence gaps (`incoming > expectedSequence`) are rejected with explicit typed responses. Sequence rollback is strictly forbidden.

### VI:
Mô hình chuỗi đơn điệu đảm bảo thông điệp được xử lý theo thứ tự nghiêm ngặt. Các chuỗi cũ (`incoming <= lastSequence`) và khoảng trống chuỗi (`incoming > expectedSequence`) đều bị từ chối với phản hồi định kiểu rõ ràng. Tuyệt đối không cho phép tua lùi số chuỗi.

---

## 17. Replay Defense / Phòng thủ Chống phát lại

### EN:
`analyzeRemoteReplay` classifies messages into:
1. `ACCEPTED_NEW`: Unique, in-order request.
2. `IDEMPOTENT_DUPLICATE`: Same ID and fingerprint, safely returning prior response without re-execution.
3. `REPLAY_CONFLICT`: Same ID or sequence with altered payload (rejected).
4. `CROSS_SCOPE_REJECTED`: Request forged across session or tenant boundaries (rejected).

### VI:
`analyzeRemoteReplay` phân loại thông điệp thành:
1. `ACCEPTED_NEW`: Yêu cầu mới, đúng thứ tự.
2. `IDEMPOTENT_DUPLICATE`: Trùng lặp bình ổn có cùng ID và chữ ký băm, trả về phản hồi an toàn mà không chạy lại.
3. `REPLAY_CONFLICT`: Xung đột phát lại do trùng ID hoặc chuỗi nhưng bị sửa đổi nội dung (bị từ chối).
4. `CROSS_SCOPE_REJECTED`: Yêu cầu giả mạo vượt qua biên giới phiên hoặc người thuê (bị từ chối).

---

## 18. Reconnect / Kết nối Lại

### EN:
Upon reconnection, peer identity, 6-tuple scope, Brain binding, granted capabilities, and last sequence numbers are rigorously preserved. Reconnection CANNOT reset sequence numbers to zero or create a second Brain instance.

### VI:
Khi kết nối lại, định danh máy khách, phạm vi 6 thành phần, liên kết Não bộ, quyền năng được cấp và số chuỗi cuối cùng đều được bảo toàn nghiêm ngặt. Kết nối lại KHÔNG THỂ đặt lại số chuỗi về 0 hoặc tạo ra một thực thể Não bộ thứ hai.

---

## 19. Rate / Quota / Hạn ngạch & Giới hạn Tốc độ

### EN:
Purely data-driven capacity evaluation classifies pressure into `NORMAL`, `ELEVATED`, `HIGH`, `SATURATED`, and `BLOCKED`. Saturated gateways reject requests with `status: 'RATE_LIMITED'`. Zero silent drops are permitted.

### VI:
Đánh giá dung lượng thuần dữ liệu phân loại áp lực thành `NORMAL`, `ELEVATED`, `HIGH`, `SATURATED`, và `BLOCKED`. Khi cổng bão hòa, yêu cầu sẽ bị từ chối với `status: 'RATE_LIMITED'`. Không bao giờ âm thầm hủy thông điệp.

---

## 20. Security Model / Mô hình Bảo mật

### EN:
Defense-in-depth security validates identifiers against prototype pollution (`__proto__`, `constructor`), null bytes (`\0`), path traversal (`../`, `..\`), Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`), and oversized payloads.

### VI:
Mô hình bảo mật đa tầng xác thực các định danh chống lại tấn công prototype pollution (`__proto__`, `constructor`), ký tự null (`\0`), duyệt đường dẫn (`../`, `..\`), tên thiết bị đặc biệt của Windows (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) và kích thước payload quá khổ.

---

## 21. Scope Isolation / Cô lập Phạm vi

### EN:
All remote operations are strictly bound to the 6-tuple:
`(userId, sessionId, brainId, surfaceId, transportId, gatewayId)`.
Any cross-tenant or cross-session interaction fails closed immediately.

### VI:
Mọi hoạt động từ xa đều bị ràng buộc nghiêm ngặt trong bộ 6 giá trị:
`(userId, sessionId, brainId, surfaceId, transportId, gatewayId)`.
Bất kỳ tương tác xuyên người thuê hoặc xuyên phiên làm việc nào đều thất bại đóng ngay lập tức.

---

## 22. Secret Scrubbing / Thanh lọc Bí mật

### EN:
Automated redaction filters detect and sanitize sensitive tokens, passwords, private keys, authorization credentials, and secrets matching standard patterns (e.g. `bearer\s+[a-z0-9_.-]+`). Scrubbing applies to all errors, fingerprints, audit logs, and response messages.

### VI:
Bộ lọc khử nhạy cảm tự động phát hiện và thanh lọc các token, mật khẩu, khóa riêng tư, thông tin xác thực ủy quyền và các bí mật khớp với mẫu chuẩn (vd: `bearer\s+[a-z0-9_.-]+`). Việc thanh lọc được áp dụng cho toàn bộ lỗi, chữ ký băm, nhật ký kiểm toán và thông điệp phản hồi.

---

## 23. Governance Boundary / Ranh giới Quản trị (PDP)

### EN:
The Policy Decision Point (PDP) remains exclusively authoritative within the Brain. The Remote Gateway CANNOT evaluate, alter, or bypass PDP policies.

### VI:
Điểm Ra Quyết định Chính sách (PDP) giữ độc quyền thẩm quyền bên trong Não bộ. Cổng Từ xa KHÔNG THỂ đánh giá, thay đổi hay vượt qua các chính sách PDP.

---

## 24. Approval Boundary / Ranh giới Phê duyệt

### EN:
The `ApprovalService` is the sole authority for human-in-the-loop and automated approvals. The gateway only preserves approval metadata and cannot forge, consume, or bypass approvals.

### VI:
`ApprovalService` là cơ quan thẩm quyền duy nhất cho các phê duyệt tự động và con người. Cổng chỉ bảo toàn siêu dữ liệu phê duyệt và không thể giả mạo, tiêu thụ hay bỏ qua phê duyệt.

---

## 25. Idempotency Boundary / Ranh giới Bình ổn

### EN:
`IdempotencyStore` within the Brain is the single authority for execution idempotency. Gateway replay detection operates purely at the protocol transport level and never mutates execution idempotency records.

### VI:
`IdempotencyStore` trong Não bộ là thẩm quyền duy nhất cho tính bình ổn thực thi. Cơ chế chống phát lại của cổng hoạt động thuần túy ở tầng giao thức truyền tải và không bao giờ biến đổi bản ghi bình ổn thực thi.

---

## 26. Verification Boundary / Ranh giới Xác minh

### EN:
Only `VerificationService` evaluates whether a task succeeded. Protocol ACK or delivery confirmation from a remote surface NEVER indicates task success.

### VI:
Chỉ `VerificationService` mới có quyền đánh giá một tác vụ đã thành công hay chưa. Phản hồi ACK giao thức hoặc xác nhận chuyển phát từ bề mặt từ xa KHÔNG BAO GIỜ đồng nghĩa với tác vụ thành công.

---

## 27. Commit Boundary / Ranh giới Cam kết Bền vững

### EN:
`CommitService` is the only durable commit authority for Brain state. The Remote Gateway does not persist cognitive state and creates zero competing storage layers.

### VI:
`CommitService` là cơ quan duy nhất có thẩm quyền cam kết bền vững cho trạng thái Não bộ. Cổng Từ xa không lưu trữ trạng thái nhận thức và không tạo ra bất kỳ tầng lưu trữ cạnh tranh nào.

---

## 28. Recovery Boundary / Ranh giới Phục hồi Sự cố

### EN:
`RecoveryService` manages crash consistency. Reconnection to the gateway does not re-execute interrupted operations or circumvent crash recovery workflows.

### VI:
`RecoveryService` quản lý tính nhất quán sau sự cố. Việc kết nối lại vào cổng không tự động chạy lại các thao tác bị gián đoạn hoặc lách qua quy trình phục hồi sự cố.

---

## 29. Coordination Boundary / Ranh giới Điều phối

### EN:
`CoordinationService` (MS-1.3.17) retains authority over surface attachment, handoff, and continuity. The Remote Gateway references coordination metadata but does not usurp coordination roles.

### VI:
`CoordinationService` (MS-1.3.17) nắm giữ thẩm quyền gắn kết bề mặt, chuyển giao (handoff) và tính liên tục. Cổng Từ xa tham chiếu siêu dữ liệu điều phối nhưng không tiếm quyền điều phối.

---

## 30. Synchronization Boundary / Ranh giới Đồng bộ hóa

### EN:
`SynchronizationService` (MS-1.3.18) is the sole authority for the canonical Brain event timeline. The Remote Gateway does not maintain a competing timeline.

### VI:
`SynchronizationService` (MS-1.3.18) là thẩm quyền duy nhất đối với dòng sự kiện chuẩn (timeline) của Não bộ. Cổng Từ xa không duy trì dòng sự kiện cạnh tranh.

---

## 31. Transport Boundary / Ranh giới Truyền tải

### EN:
`TransportService` (MS-1.3.19) manages transport sessions, message envelopes, and delivery states. The Remote Gateway sits above transport and coordinates remote protocols.

### VI:
`TransportService` (MS-1.3.19) quản lý phiên truyền tải, phong bì thông điệp và trạng thái chuyển phát. Cổng Từ xa nằm phía trên tầng truyền tải và điều phối các giao thức từ xa.

---

## 32. Surface Boundary / Ranh giới Bề mặt

### EN:
Surfaces (Mobile, Robot, Desktop, Web, Voice) are presentation and embodiment endpoints with 0% memory authority, 0% planning authority, and 0% execution authority.

### VI:
Các bề mặt (Mobile, Robot, Desktop, Web, Voice) là các điểm cuối hiển thị và hiện thân với 0% thẩm quyền bộ nhớ, 0% thẩm quyền lập kế hoạch và 0% thẩm quyền thực thi.

---

## 33. Network Boundary / Ranh giới Mạng

### EN:
MS-1.3.20 establishes the protocol logic. Network I/O is strictly isolated to future network adapters. Zero sockets, HTTP listeners, or network daemons exist in MS-1.3.20.

### VI:
MS-1.3.20 thiết lập logic giao thức. I/O mạng được cách ly nghiêm ngặt cho các adapter mạng trong tương lai. Hoàn toàn không có socket, HTTP listener hay daemon mạng nào trong MS-1.3.20.

---

## 34. Failure Model / Mô hình Xử lý Thất bại

### EN:
All failures are classified into strongly typed descriptors (`RemoteFailureDescriptor`) with automatic secret scrubbing and fail-closed outcomes across 24 standard error categories.

### VI:
Mọi thất bại đều được phân loại thành các bộ mô tả định kiểu mạnh (`RemoteFailureDescriptor`) với tính năng tự động làm sạch bí mật và cơ chế thất bại đóng trên 24 danh mục lỗi tiêu chuẩn.

---

## 35. Testing / Kiểm thử

### EN:
- Dedicated test suite: `tests/test_v4_agent_secure_remote_gateway.ts` (126 deterministic assertions covering 18 categories A through R).
- Full regression: 22 test suites, 1,228 passing assertions, 0 failures.
- Zero flaky tests, zero timing dependencies, zero random generators.

### VI:
- Bộ kiểm thử chuyên biệt: `tests/test_v4_agent_secure_remote_gateway.ts` (126 khẳng định tất định bao phủ 18 danh mục từ A đến R).
- Hồi quy toàn diện: 22 bộ kiểm thử, 1.228 khẳng định vượt qua, 0 lỗi.
- Không có kiểm thử chập chờn, không phụ thuộc bộ định thời, không dùng sinh ngẫu nhiên.

---

## 36. Future Real Network Adapter Boundary / Ranh giới Bộ Điều hợp Mạng Thực tế Tương lai

### EN:
Future milestones (e.g. MS-1.3.21+) will bind this pure protocol foundation to physical network transports (such as TLS-secured WebSockets or gRPC streams). The protocol and security contracts defined in MS-1.3.20 will govern all future network interactions without modifying the authoritative Brain core.

### VI:
Các cột mốc tương lai (như MS-1.3.21+) sẽ liên kết nền tảng giao thức thuần túy này với các phương tiện truyền tải mạng vật lý (chẳng hạn WebSocket bảo mật TLS hoặc luồng gRPC). Các hợp đồng giao thức và bảo mật được xác lập trong MS-1.3.20 sẽ chi phối toàn bộ tương tác mạng tương lai mà không làm thay đổi lõi Não bộ có thẩm quyền.
