# BOWCON V4.0 — BRAIN MESSAGE TRANSPORT & REMOTE CONNECTIVITY MODEL (EN & VI)
# MÔ HÌNH TRUYỀN TẢI THÔNG ĐIỆP NÃO BỘ & KẾT NỐI TỪ XA — MILESTONE MS-1.3.19

---

## 1. PURPOSE / MỤC ĐÍCH

**EN:**
Milestone MS-1.3.19 establishes the foundational message transport and remote connectivity abstraction for the authoritative BOWCON Brain. It provides deterministic, typed, immutable message envelopes, scoped connection lifecycles, message delivery tracking, explicit ACK/NACK semantics, replay defense, heartbeat monitoring, and flow control (backpressure) between the Brain and remote presentation/embodiment surfaces (BOW-Mobile, BOW-Robot, Desktop, Web, Voice) without making the transport layer itself authoritative or creating secondary brains.

**VI:**
Cột mốc MS-1.3.19 thiết lập trừu tượng hóa tầng truyền tải thông điệp và kết nối từ xa nền tảng cho Não bộ có thẩm quyền BOWCON. Cột mốc này cung cấp các phong bì thông điệp bất biến, định kiểu và tất định, vòng đời kết nối có phạm vi, theo dõi phân phối thông điệp, ngữ nghĩa ACK/NACK tường minh, phòng thủ chống phát lại, giám sát nhịp tim (heartbeat), và kiểm soát lưu lượng (áp lực ngược - backpressure) giữa Não bộ và các bề mặt hiện diện/thể hiện từ xa (BOW-Mobile, BOW-Robot, Desktop, Web, Voice) mà không biến tầng truyền tải thành thực thể có thẩm quyền hay tạo ra các não bộ phụ.

---

## 2. BRAIN AUTHORITY / THẨM QUYỀN DUY NHẤT CỦA NÃO BỘ

**EN:**
BOWCON adheres to the fundamental absolute invariant: **ONE BOWCON BRAIN, ZERO SECONDARY BRAINS**.
The Brain is the sole authority for:
- Identity, memory, context, intent, planning, reasoning, governance, approval, tool execution, verification, durable commit, crash recovery, multi-surface coordination, and state synchronization.
All external connections and presentation/embodiment clients are SURFACES or TRANSPORT ENDPOINTS. They MUST NEVER become authoritative cognitive state owners.

**VI:**
BOWCON tuân thủ bất biến tuyệt đối cốt lõi: **MỘT NÃO BỘ BOWCON, KHÔNG CÓ NÃO BỘ PHỤ**.
Não bộ là cơ quan có thẩm quyền duy nhất đối với:
- Định danh, bộ nhớ, ngữ cảnh, ý định, lập kế hoạch, suy luận, quản trị, phê duyệt, thực thi công cụ, xác minh, commit bền vững, phục hồi sau sự cố, điều phối đa bề mặt, và đồng bộ hóa trạng thái.
Tất cả các kết nối bên ngoài và máy khách thể hiện/hiện diện đều là CÁC BỀ MẶT hoặc ĐIỂM CUỐI TRUYỀN TẢI. Chúng KHÔNG BAO GIỜ được trở thành chủ sở hữu trạng thái nhận thức có thẩm quyền.

---

## 3. TRANSPORT AUTHORITY BOUNDARY / RANH GIỚI THẨM QUYỀN TRUYỀN TẢI

**EN:**
Transport carries messages; it does NOT own or determine Brain cognition or task success:
- Transport failure != Brain failure.
- Surface disconnect != Brain shutdown.
- Surface reconnect != Brain restart.
- Message ACK != Task success.
- Delivery success != Execution success.
- Transport success != Synchronization success.

**VI:**
Tầng truyền tải mang thông điệp; nó KHÔNG sở hữu hay quyết định nhận thức của Não bộ hoặc sự thành công của tác vụ:
- Lỗi truyền tải != Lỗi Não bộ.
- Ngắt kết nối bề mặt != Tắt Não bộ.
- Kết nối lại bề mặt != Khởi động lại Não bộ.
- ACK thông điệp != Thành công tác vụ.
- Giao nhận thành công != Thực thi thành công.
- Truyền tải thành công != Đồng bộ hóa thành công.

---

## 4. MESSAGE ENVELOPE / PHONG BÌ THÔNG ĐIỆP CHUẨN MỰC

**EN:**
All communication between Brain and surfaces passes through the canonical, immutable `BrainTransportMessage` envelope:
- `messageId`: Deterministic `msg_<fnv1aHex>`.
- `brainId`, `userId`, `sessionId`, `surfaceId`, `transportId`, `connectionId`: Scoped identity fields.
- `correlationId`, `causationId`: End-to-end tracing identifiers.
- `eventId`: Optional reference to MS-1.3.18 authoritative BrainEvent.
- `messageType`: Validated against authoritative 16-type taxonomy.
- `direction`: Explicit `BRAIN_TO_SURFACE` or `SURFACE_TO_BRAIN`.
- `sequence`: Monotonically increasing positive integer per connection.
- `payload`: Deeply cloned, deeply frozen JSON data.
- `riskLevel`: Optional `PlanRiskLevel` preserving monotonicity.
- `governanceMetadata`, `lifecycleMetadata`: Preserved contextual metadata.
- `timestamp`: Metadata timestamp (never used for primary identity).
- `fingerprint`: Deterministic 32-bit FNV-1a hex hash.

**VI:**
Mọi giao tiếp giữa Não bộ và các bề mặt đều đi qua phong bì `BrainTransportMessage` chuẩn mực, bất biến:
- `messageId`: Định danh tất định `msg_<fnv1aHex>`.
- `brainId`, `userId`, `sessionId`, `surfaceId`, `transportId`, `connectionId`: Các trường định danh theo phạm vi.
- `correlationId`, `causationId`: Định danh truy vết đầu cuối.
- `eventId`: Tham chiếu tùy chọn đến BrainEvent có thẩm quyền từ MS-1.3.18.
- `messageType`: Được xác thực theo phân loại 16 kiểu có thẩm quyền.
- `direction`: Rõ ràng `BRAIN_TO_SURFACE` hoặc `SURFACE_TO_BRAIN`.
- `sequence`: Số nguyên dương tăng đơn điệu theo từng kết nối.
- `payload`: Dữ liệu JSON được nhân bản và đóng băng sâu.
- `riskLevel`: Mức độ rủi ro tùy chọn bảo toàn tính đơn điệu.
- `governanceMetadata`, `lifecycleMetadata`: Metadata ngữ cảnh được bảo lưu.
- `timestamp`: Timestamp metadata (không bao giờ dùng làm định danh chính).
- `fingerprint`: Mã băm hex FNV-1a 32-bit tất định.

---

## 5. MESSAGE TAXONOMY / PHÂN LOẠI THÔNG ĐIỆP

**EN:**
Authoritative 16-type taxonomy:
`REQUEST`, `RESPONSE`, `EVENT`, `ACK`, `NACK`, `HEARTBEAT`, `HEARTBEAT_ACK`, `CONNECT`, `CONNECT_ACK`, `DISCONNECT`, `RECONNECT`, `RESUME`, `RESUME_ACK`, `ERROR`, `FLOW_CONTROL`, `DELIVERY_STATUS`.

**VI:**
Phân loại 16 kiểu có thẩm quyền:
`REQUEST`, `RESPONSE`, `EVENT`, `ACK`, `NACK`, `HEARTBEAT`, `HEARTBEAT_ACK`, `CONNECT`, `CONNECT_ACK`, `DISCONNECT`, `RECONNECT`, `RESUME`, `RESUME_ACK`, `ERROR`, `FLOW_CONTROL`, `DELIVERY_STATUS`.

---

## 6. CONNECTION IDENTITY / ĐỊNH DANH KẾT NỐI THEO PHẠM VI

**EN:**
Connection identity is scoped by the 5-tuple:
`${userId}::${sessionId}::${brainId}::${surfaceId}::${transportId}`.
Any message received from another user, session, brain, or surface across this connection fails closed (`CROSS_SCOPE_REJECTED`).

**VI:**
Định danh kết nối được xác định theo phạm vi bộ 5:
`${userId}::${sessionId}::${brainId}::${surfaceId}::${transportId}`.
Bất kỳ thông điệp nào nhận được từ người dùng, phiên, não bộ hoặc bề mặt khác qua kết nối này đều thất bại đóng an toàn (`CROSS_SCOPE_REJECTED`).

---

## 7. TRANSPORT SESSION / PHIÊN TRUYỀN TẢI

**EN:**
`TransportSessionSnapshot` tracks connection lifecycle state, last accepted sequence, last acknowledged sequence, health metrics, pending message count, backpressure level, and disconnect reasons. It is deeply immutable at public boundaries.

**VI:**
`TransportSessionSnapshot` theo dõi trạng thái vòng đời kết nối, số thứ tự được chấp nhận gần nhất, số thứ tự được xác nhận gần nhất, chỉ số sức khỏe, số lượng thông điệp chờ xử lý, mức áp lực ngược và lý do ngắt kết nối. Nó bất biến sâu tại các ranh giới công khai.

---

## 8. CONNECTION LIFECYCLE / VÒNG ĐỜI KẾT NỐI

**EN:**
Strict state transitions:
`DISCONNECTED` -> `CONNECTING` -> `CONNECTED` <-> `DEGRADED` -> `RECONNECTING` -> `RESUMING` -> `CONNECTED`.
Terminal/exit states: `CLOSING` -> `CLOSED`, `FAILED`, `BLOCKED`.
Arbitrary state jumps fail closed.

**VI:**
Chuyển đổi trạng thái nghiêm ngặt:
`DISCONNECTED` -> `CONNECTING` -> `CONNECTED` <-> `DEGRADED` -> `RECONNECTING` -> `RESUMING` -> `CONNECTED`.
Trạng thái kết thúc: `CLOSING` -> `CLOSED`, `FAILED`, `BLOCKED`.
Các bước nhảy trạng thái tùy tiện đều thất bại đóng an toàn.

---

## 9. DELIVERY LIFECYCLE / VÒNG ĐỜI PHÂN PHỐI THÔNG ĐIỆP

**EN:**
States: `CREATED`, `VALIDATED`, `QUEUED`, `DISPATCHABLE`, `SENT`, `DELIVERED`, `ACKNOWLEDGED`, `REJECTED`, `TIMED_OUT`, `STALE`, `DUPLICATE`, `CONFLICTED`, `FAILED`, `SUPERSEDED`.
Transitions enforce strict progression.

**VI:**
Các trạng thái: `CREATED`, `VALIDATED`, `QUEUED`, `DISPATCHABLE`, `SENT`, `DELIVERED`, `ACKNOWLEDGED`, `REJECTED`, `TIMED_OUT`, `STALE`, `DUPLICATE`, `CONFLICTED`, `FAILED`, `SUPERSEDED`.
Các bước chuyển đổi thực thi tiến trình nghiêm ngặt.

---

## 10. ORDERING / THỨ TỰ THÔNG ĐIỆP

**EN:**
Tracks per-connection sequence progression. Detects `NEXT_IN_ORDER`, `DUPLICATE_SEQUENCE`, `SEQUENCE_GAP`, `STALE_SEQUENCE`, and `INVALID_SEQUENCE`. Sequence is never silently rewound.

**VI:**
Theo dõi tiến trình số thứ tự theo từng kết nối. Phát hiện `NEXT_IN_ORDER`, `DUPLICATE_SEQUENCE`, `SEQUENCE_GAP`, `STALE_SEQUENCE`, và `INVALID_SEQUENCE`. Không bao giờ âm thầm tua lại số thứ tự.

---

## 11. REPLAY PROTECTION / BẢO VỆ CHỐNG PHÁT LẠI

**EN:**
- Repeated identical message -> `IDEMPOTENT_DUPLICATE`.
- Repeated sequence with mutated payload -> `REPLAY_CONFLICT` (rejected).
- Cross-user/session/brain replay -> `CROSS_SCOPE_REJECTED`.

**VI:**
- Thông điệp lặp lại giống hệt -> `IDEMPOTENT_DUPLICATE`.
- Số thứ tự lặp lại nhưng payload bị biến đổi -> `REPLAY_CONFLICT` (bị từ chối).
- Phát lại xuyên người dùng/phiên/não bộ -> `CROSS_SCOPE_REJECTED`.

---

## 12. CORRELATION / TRUY VẾT TƯƠNG QUAN

**EN:**
Supports correlation tracing: `REQUEST` -> `EVENT` -> `TRANSPORT` -> `ACK` via `correlationId`, `causationId`, `messageId`, and `eventId` without replicating cognitive state onto surfaces.

**VI:**
Hỗ trợ truy vết tương quan: `REQUEST` -> `EVENT` -> `TRANSPORT` -> `ACK` thông qua `correlationId`, `causationId`, `messageId`, và `eventId` mà không sao chép trạng thái nhận thức lên các bề mặt.

---

## 13. ACK SEMANTICS / NGỮ NGHĨA XÁC NHẬN (ACK)

**EN:**
Classifications: `RECEIVED`, `VALIDATED`, `PROCESSED`, `REJECTED`.
`TASK_SUCCEEDED` is strictly forbidden in transport ACK. VerificationService alone verifies task outcomes.

**VI:**
Các phân loại: `RECEIVED`, `VALIDATED`, `PROCESSED`, `REJECTED`.
Nghiêm cấm dùng `TASK_SUCCEEDED` trong ACK truyền tải. Chỉ duy nhất VerificationService mới xác minh kết quả tác vụ.

---

## 14. NACK SEMANTICS / TỪ CHỐI XÁC NHẬN (NACK)

**EN:**
Carries typed `TransportFailureCode` (e.g. `INVALID_SEQUENCE`, `SEQUENCE_GAP`, `REPLAY_CONFLICT`, `BACKPRESSURE`, `DELIVERY_TIMEOUT`) with secret-scrubbed reasons.

**VI:**
Mang mã `TransportFailureCode` định kiểu (ví dụ `INVALID_SEQUENCE`, `SEQUENCE_GAP`, `REPLAY_CONFLICT`, `BACKPRESSURE`, `DELIVERY_TIMEOUT`) với các lý do đã được lọc sạch bí mật.

---

## 15. HEARTBEAT / NHỊP TIM KẾT NỐI

**EN:**
Heartbeat signals track connectivity only (`HEALTHY`, `DEGRADED`, `TIMEOUT`). They NEVER execute tools, invoke LLM, mutate Brain state, or imply task success.

**VI:**
Tín hiệu nhịp tim chỉ theo dõi khả năng kết nối (`HEALTHY`, `DEGRADED`, `TIMEOUT`). Chúng KHÔNG BAO GIỜ thực thi công cụ, gọi LLM, biến đổi trạng thái Não bộ, hay ngụ ý thành công tác vụ.

---

## 16. RECONNECT / KẾT NỐI LẠI

**EN:**
Allows a disconnected surface to reconnect through `DISCONNECTED` -> `RECONNECTING` -> `RESUMING` -> `CONNECTED` while the Brain remains running uninterrupted.

**VI:**
Cho phép bề mặt bị ngắt kết nối có thể kết nối lại qua chuỗi `DISCONNECTED` -> `RECONNECTING` -> `RESUMING` -> `CONNECTED` trong khi Não bộ vẫn hoạt động liên tục không gián đoạn.

---

## 17. RESUME / KHÔI PHỤC PHIÊN

**EN:**
Resume requests validate 5-tuple scope and sequence preservation. Sequence is never reset to zero.

**VI:**
Yêu cầu khôi phục phiên xác thực phạm vi bộ 5 và bảo toàn chuỗi số thứ tự. Không bao giờ reset số thứ tự về 0.

---

## 18. OFFLINE SURFACES / BỀ MẶT NGOẠI TUYẾN

**EN:**
Explicitly supports Brain online while Mobile, Robot, or both are offline. The Brain operates independently.

**VI:**
Hỗ trợ tường minh trường hợp Não bộ trực tuyến trong khi Mobile, Robot, hoặc cả hai đều ngoại tuyến. Não bộ hoạt động độc lập.

---

## 19. BACKPRESSURE / ÁP LỰC NGƯỢC & KIỂM SOÁT LƯU LƯỢNG

**EN:**
Classifies pressure levels: `NORMAL` (0–50%), `ELEVATED` (50–75%), `HIGH` (75–90%), `SATURATED` (90–100%), and `BLOCKED`. Never silently drops authoritative messages.

**VI:**
Phân loại các mức áp lực: `NORMAL` (0–50%), `ELEVATED` (50–75%), `HIGH` (75–90%), `SATURATED` (90–100%), và `BLOCKED`. Không bao giờ âm thầm loại bỏ thông điệp có thẩm quyền.

---

## 20. RESOURCE LIMITS / GIỚI HẠN TÀI NGUYÊN

**EN:**
- Max message size: 1 MB (`MAX_TRANSPORT_MESSAGE_BYTES = 1048576`).
- Max metadata depth: 8 levels (`MAX_METADATA_DEPTH = 8`).
- Max correlation string length: 256 chars (`MAX_CORRELATION_LENGTH = 256`).
- Max queue depth: 1000 messages (`MAX_QUEUE_DEPTH = 1000`).

**VI:**
- Kích thước thông điệp tối đa: 1 MB.
- Độ sâu lồng metadata tối đa: 8 cấp.
- Chiều dài chuỗi correlation tối đa: 256 ký tự.
- Độ sâu hàng đợi tối đa: 1000 thông điệp.

---

## 21. SECURITY / PHÒNG THỦ BẢO MẬT

**EN:**
Defends against prototype pollution, null byte injection, path traversal, and Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`). Scrubs sensitive credentials (`redactTransportSecrets`).

**VI:**
Phòng thủ chống ô nhiễm prototype, tiêm null byte, duyệt đường dẫn và tên thiết bị cấm của Windows. Tự động che giấu thông tin xác thực nhạy cảm.

---

## 22–31. ARCHITECTURAL BOUNDARIES / CÁC RANH GIỚI KIẾN TRÚC

**EN:**
- **Governance**: Transport never invokes PDP, ApprovalService, or IdempotencyStore. Preserves risk monotonicity (`CRITICAL > HIGH > MEDIUM > LOW`).
- **Execution**: Transport never invokes ToolRegistry, ToolExecutor, or ExecutionService.
- **Verification**: Transport never calls VerificationService. ACK != VERIFIED.
- **Commit**: Transport never calls CommitService. Message delivery does not commit state.
- **Recovery**: Transport does not bypass RecoveryService. Interrupted states are handled by Recovery.
- **Coordination**: CoordinationService owns surface registration and handoff; transport only carries packets.
- **Synchronization**: SynchronizationService owns the authoritative event timeline.
- **Mobile / Robot**: Conceptual presentation surfaces only; zero native mobile or robotics code.
- **Network**: Pure in-memory / abstract contracts. Zero real socket or network I/O.

**VI:**
- **Quản trị**: Tầng truyền tải không bao giờ gọi PDP, ApprovalService, hay IdempotencyStore. Bảo toàn tính đơn điệu rủi ro.
- **Thực thi**: Tầng truyền tải không bao giờ gọi ToolRegistry, ToolExecutor, hay ExecutionService.
- **Xác minh**: Tầng truyền tải không bao giờ gọi VerificationService. ACK != VERIFIED.
- **Commit**: Tầng truyền tải không bao giờ gọi CommitService. Giao thông điệp không tự động commit trạng thái.
- **Phục hồi**: Tầng truyền tải không bỏ qua RecoveryService. Trạng thái bị gián đoạn do Recovery xử lý.
- **Điều phối**: CoordinationService sở hữu việc đăng ký bề mặt và bàn giao; truyền tải chỉ vận chuyển gói tin.
- **Đồng bộ hóa**: SynchronizationService sở hữu dòng thời gian sự kiện có thẩm quyền.
- **Mobile / Robot**: Chỉ là bề mặt hiện diện khái niệm; không chứa mã native mobile hay robot.
- **Mạng**: Hợp đồng thuần trừu tượng / in-memory. Không chứa socket hay I/O mạng thực tế.

---

## 32. AGENTLOOP INTEGRATION / TÍCH HỢP AGENTLOOP

**EN:**
`TransportService` is injected into `AgentLoop` via dependency injection with `getTransportService()` accessor and optional `transportContext` in `AgentLoopResult`. 100% backward compatible.

**VI:**
`TransportService` được tiêm vào `AgentLoop` qua dependency injection với getter `getTransportService()` và trường tùy chọn `transportContext` trong `AgentLoopResult`. Tương thích ngược 100%.

---

## 33. FAILURE MODEL / MÔ HÌNH THẤT BẠI

**EN:**
Fails closed. Any scope mismatch, sequence violation, mutated replay, or risk downgrade immediately rejects the message and produces a secret-scrubbed failure descriptor.

**VI:**
Thất bại đóng an toàn. Mọi sự không khớp phạm vi, vi phạm chuỗi, phát lại bị biến đổi, hoặc hạ cấp rủi ro đều lập tức từ chối thông điệp và tạo bộ mô tả lỗi đã lọc sạch bí mật.

---

## 34. TESTING MODEL / MÔ HÌNH KIỂM THỬ

**EN:**
110 dedicated assertions in `tests/test_v4_agent_brain_transport.ts` verifying all categories (01 through 110) with 100% pass rate. Full regression across 21 test suites confirms zero regressions.

**VI:**
110 khẳng định chuyên biệt trong `tests/test_v4_agent_brain_transport.ts` kiểm chứng toàn bộ các danh mục (01 đến 110) với tỷ lệ đạt 100%. Hồi quy toàn diện qua 21 bộ kiểm thử xác nhận không có bất kỳ lỗi thoái lui nào.

---

## 35. FUTURE REAL TRANSPORT ROADMAP / LỘ TRÌNH KẾT NỐI TỪ XA TRONG TƯƠNG LAI

**EN:**
In future milestones, secure concrete transport adapters (e.g. WebSocket, WebRTC, gRPC, MQTT) will implement the `TransportAdapter` and `TransportGatewayContract` interfaces defined in MS-1.3.19.

**VI:**
Trong các cột mốc tương lai, các adapter truyền tải cụ thể an toàn (như WebSocket, WebRTC, gRPC, MQTT) sẽ triển khai các giao diện `TransportAdapter` và `TransportGatewayContract` đã được định nghĩa trong MS-1.3.19.

---

## 36. WHY ACTUAL NETWORK I/O IS INTENTIONALLY DEFERRED / TẠI SAO I/O MẠNG THỰC TẾ ĐƯỢC HOÃN LẠI CÓ CHỦ ĐÍCH

**EN:**
MS-1.3.19 is an architectural foundation milestone. Introducing raw networking (sockets, ports, network daemons, external services) before proving the message contracts, sequence ordering, replay defense, and lifecycle matrices would couple cognitive authority with transport volatility. Separating the abstraction from physical I/O ensures the Brain remains strictly authoritative regardless of connection status.

**VI:**
MS-1.3.19 là cột mốc nền tảng kiến trúc. Việc đưa vào mạng vật lý (socket, port, daemon mạng, dịch vụ ngoài) trước khi chứng minh được hợp đồng thông điệp, thứ tự chuỗi, phòng thủ phát lại và ma trận vòng đời sẽ làm gắn kết thẩm quyền nhận thức với sự bất ổn của tầng truyền tải. Việc tách biệt trừu tượng hóa khỏi I/O vật lý đảm bảo Não bộ luôn duy trì thẩm quyền tuyệt đối bất kể trạng thái kết nối ra sao.
