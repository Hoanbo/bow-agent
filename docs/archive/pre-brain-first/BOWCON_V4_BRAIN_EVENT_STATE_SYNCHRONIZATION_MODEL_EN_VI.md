# BOWCON V4.0 — BRAIN EVENT & STATE SYNCHRONIZATION ARCHITECTURE MODEL (EN / VI)
# MÔ HÌNH KIẾN TRÚC ĐỒNG BỘ HÓA TRẠNG THÁI VÀ SỰ KIỆN NÃO BỘ BOWCON V4.0 (ANH / VIỆT)

---

## 1. Executive Summary & Purpose / Tóm Tắt Cấp Cao & Mục Đích

### English
Milestone **MS-1.3.18** establishes the foundational **Brain Event & State Synchronization** subsystem of BOWCON V4.0 (`@bow/agent` 4.0.0). Its primary architectural mandate is:
> **BUILD A DETERMINISTIC INTERNAL EVENT AND STATE SYNCHRONIZATION FOUNDATION THAT ALLOWS MULTIPLE PRESENTATION AND EMBODIMENT SURFACES (BOW-MOBILE, BOW-ROBOT, DESKTOP, WEB, VOICE) TO OBSERVE AND ACKNOWLEDGE AUTHORITATIVE BRAIN STATE WITHOUT EVER BECOMING SECONDARY BRAINS.**

The Brain is the **ONLY** authoritative cognitive entity. Surfaces are observation windows and embodiment surfaces. They **NEVER** own independent cognitive state, never make policy decisions, and never execute tools.

### Tiếng Việt
Cột mốc **MS-1.3.18** thiết lập phân hệ nền tảng **Đồng Bộ Hóa Trạng Thái & Sự Kiện Não Bộ** của BOWCON V4.0 (`@bow/agent` 4.0.0). Mệnh lệnh kiến trúc tối thượng là:
> **XÂY DỰNG NỀN TẢNG ĐỒNG BỘ HÓA TRẠNG THÁI VÀ SỰ KIỆN NỘI BỘ TẤT ĐỊNH CHO PHÉP NHIỀU BỀ MẶT TRÌNH DIỄN VÀ HIỆN THÂN (BOW-MOBILE, BOW-ROBOT, DESKTOP, WEB, VOICE) QUAN SÁT VÀ XÁC NHẬN TRẠNG THÁI NÃO BỘ CÓ THẨM QUYỀN MÀ KHÔNG BAO GIỜ TRỞ THÀNH NÃO BỘ THỨ HAI.**

Não bộ là thực thể nhận thức có thẩm quyền **DUY NHẤT**. Các bề mặt chỉ là cửa sổ quan sát và bề mặt hiện thân. Chúng **TUYỆT ĐỐI KHÔNG** sở hữu trạng thái nhận thức độc lập, không đưa ra quyết định chính sách và không thực thi công cụ.

---

## 2. Brain-First Architecture Invariants / Các Bất Biến Kiến Trúc Brain-First

### English
The central paradigm enforces:
```
                    ONE BOWCON BRAIN (Authoritative)
                                   |
            +----------------------+----------------------+
            |                      |                      |
          Memory               Reasoning              Governance
      (Authoritative)       (Authoritative)         (Authoritative)
            |                      |                      |
            +----------------------+----------------------+
                                   |
                         Lifecycle & Recovery
                                   |
                         Verification & Commit
                                   |
                       Coordination & Continuity
                                   |
                         EVENT SYNCHRONIZATION
                                   |
                  +----------------+----------------+
                  |                                 |
             BOW-Mobile                         BOW-Robot
          Surface (Client)                  Surface (Embodiment)
```

Core Invariants:
1. `SURFACE OFFLINE != BRAIN OFFLINE`: A surface disconnecting or going offline does not halt Brain execution.
2. `SURFACE UNAVAILABLE != BRAIN UNAVAILABLE`: Surface unhealth does not corrupt Brain health.
3. `SURFACE DISCONNECTED != SESSION DESTROYED`: The user session continues uninterrupted in Brain memory.
4. `SURFACE RECONNECTED != NEW BRAIN`: A reconnected surface syncs against the same continuous Brain.
5. `EVENT OBSERVED != EVENT EXECUTED`: Observation records observation only; events have zero execution power.
6. `EVENT RECEIVED != EVENT AUTHORIZED`: Receiving an event does not bypass PDP governance.
7. `EVENT ACKNOWLEDGED != TASK SUCCESS`: Verification remains the sole authority for task outcome.
8. `SURFACE STATE != BRAIN STATE`: Brain state always wins; surfaces cannot dictate state to the Brain.

### Tiếng Việt
Mô hình trung tâm bắt buộc:
1. `BỀ MẶT OFFLINE != NÃO BỘ OFFLINE`: Bề mặt ngắt kết nối không làm dừng hoạt động của Não bộ.
2. `BỀ MẶT KHÔNG KHẢ DỤNG != NÃO BỘ KHÔNG KHẢ DỤNG`: Sự cố bề mặt không làm ảnh hưởng sức khỏe Não bộ.
3. `BỀ MẶT NGẮT KẾT NỐI != PHIÊN BỊ HỦY`: Phiên người dùng tiếp tục liên tục trong bộ nhớ Não bộ.
4. `BỀ MẶT KẾT NỐI LẠI != NÃO BỘ MỚI`: Bề mặt kết nối lại đồng bộ với chính Não bộ liên tục đó.
5. `SỰ KIỆN ĐƯỢC QUAN SÁT != SỰ KIỆN ĐƯỢC THỰC THI`: Sự kiện thuần túy là dữ liệu mô tả; không có quyền thực thi.
6. `SỰ KIỆN ĐƯỢC NHẬN != SỰ KIỆN ĐƯỢC ỦY QUYỀN`: Nhận sự kiện không vượt qua quản trị PDP.
7. `SỰ KIỆN ĐƯỢC XÁC NHẬN != TÁC VỤ THÀNH CÔNG`: Tầng Xác minh (Verification) duy trì thẩm quyền tối cao về kết quả.
8. `TRẠNG THÁI BỀ MẶT != TRẠNG THÁI NÃO BỘ`: Trạng thái Não bộ luôn chiến thắng; bề mặt không thể áp đặt trạng thái lên Não bộ.

---

## 3. Canonical Event Envelope / Phong Bì Sự Kiện Chuẩn Mực

### English
Every synchronization event is encapsulated within an immutable, deeply frozen `BrainEvent`:
- `brainId`: Authoritative Brain identifier (`brain_<fingerprint>`).
- `userId`: Tenant identifier for strict user isolation.
- `sessionId`: Session scope.
- `eventId`: Deterministic event identifier (`evt_<fingerprint>`).
- `eventType`: Canonical event taxonomy.
- `sequence`: Monotonic positive integer sequence number.
- `previousSequence`: Monotonic previous sequence (`sequence - 1`, or 0 if initial).
- `correlationId`: Distributed correlation tracking token.
- `causationId`: Causal parent event token.
- `source`: Authoritative origin (`BRAIN`, `LIFECYCLE`, `VERIFICATION`, `COMMIT`, `RECOVERY`, `COORDINATION`, `SURFACE`).
- `targetSurfaceId`?: Optional targeted surface.
- `lifecycleState`?: Associated agent lifecycle state.
- `riskLevel`?: Associated plan risk level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- `governanceMetadata`?: Policy evaluation metadata.
- `payload`: Deeply frozen event payload.
- `timestamp`: Audit timestamp (excluded from deterministic identity).
- `fingerprint`: FNV-1a 32-bit hex hash.

### Tiếng Việt
Mỗi sự kiện đồng bộ hóa được đóng gói trong một `BrainEvent` bất biến, đóng băng sâu:
- Bao gồm đầy đủ định danh phạm vi, chuỗi số thứ tự đơn điệu, nguồn phát sinh, rủi ro, quản trị và fingerprint tất định.
- Hoàn toàn loại trừ timestamp khỏi định danh để đảm bảo tính tất định 100%.

---

## 4. Event Taxonomy & Sources / Phân Loại Sự Kiện và Nguồn Phát Sinh

### English
Authoritative event types:
- **Core Brain**: `BRAIN_INITIALIZED`, `BRAIN_STATE_CHANGED`, `BRAIN_READY`.
- **Cognitive**: `CONTEXT_UPDATED`, `INTENT_UPDATED`, `PLAN_UPDATED`, `DECISION_UPDATED`, `ORCHESTRATION_UPDATED`.
- **Execution & Verification**: `EXECUTION_STARTED`, `EXECUTION_FINISHED`, `VERIFICATION_UPDATED`.
- **Commit & Recovery**: `COMMIT_STARTED`, `COMMIT_COMPLETED`, `RECOVERY_STARTED`, `RECOVERY_COMPLETED`.
- **Lifecycle & Governance**: `LIFECYCLE_CHANGED`.
- **Surface Lifecycle**: `SURFACE_REGISTERED`, `SURFACE_ATTACHED`, `SURFACE_AVAILABLE`, `SURFACE_ACTIVE`, `SURFACE_IDLE`, `SURFACE_UNAVAILABLE`, `SURFACE_DETACHED`.
- **Handoff**: `HANDOFF_CREATED`, `HANDOFF_ACCEPTED`, `HANDOFF_REJECTED`.
- **Synchronization**: `SYNC_CHECKPOINT_CREATED`, `SYNC_ACKNOWLEDGED`, `SYNC_REJECTED`, `SYNC_CONFLICT`, `SYNC_STALE`.

Authoritative Event Sources:
- `BRAIN`, `LIFECYCLE`, `VERIFICATION`, `COMMIT`, `RECOVERY`, `COORDINATION`, `SURFACE`.
- *Note*: `SURFACE` may only emit observation/acknowledgement metadata; it **CANNOT** emit cognitive decisions or execution commands.

### Tiếng Việt
Phân loại sự kiện bao quát toàn bộ vòng đời tác tử nhận thức, từ lập kế hoạch, quyết định, thực thi, xác minh, commit, phục hồi cho đến quản lý bề mặt và đồng bộ hóa. Nguồn `SURFACE` chỉ được phép phát sinh metadata quan sát/xác nhận.

---

## 5. Sequence Model & Monotonic Ordering / Mô Hình Chuỗi và Thứ Tự Đơn Điệu

### English
Events are partitioned strictly by `${userId}::${sessionId}::${brainId}`.
Within each scope, events have a strictly monotonic sequence (`sequence = 1, 2, 3...`):
- `sequence` never decreases.
- `sequence` never silently resets.
- Order classification evaluates:
  - `VALID_NEXT_EVENT`: `incoming.sequence === lastSequence + 1` && `previousSequence === lastSequence`.
  - `DUPLICATE_EVENT`: `incoming.sequence <= lastSequence` with identical event ID and fingerprint.
  - `STALE_EVENT`: `incoming.sequence <= lastSequence` from a lagging surface.
  - `SEQUENCE_GAP`: `incoming.sequence > lastSequence + 1` (missing intermediate events).
  - `CONFLICTING_EVENT`: Same sequence or ID with mutated or divergent payload.
  - `CROSS_SCOPE_EVENT`: Mismatched `userId`, `sessionId`, or `brainId`.
  - `INVALID_EVENT`: Malformed sequence or corrupt envelope.

### Tiếng Việt
Các sự kiện được phân vùng nghiêm ngặt theo `${userId}::${sessionId}::${brainId}`.
Chuỗi số tăng đơn điệu ngăn chặn hoàn toàn việc thụt lùi số thứ tự, phát hiện tức thì các lỗ hổng chuỗi (sequence gaps), sự kiện cũ (stale) và xung đột (conflicts).

---

## 6. Surface Observation & Acknowledgement / Quan Sát & Xác Nhận Của Bề Mặt

### English
Surfaces interact with Brain events through declarative records:
1. **Observation (`SyncObservation`)**:
   - Captures `surfaceId`, `eventId`, `sequence`, `observedAt`, and deterministic `fingerprint`.
   - Invariant: A surface observing an event does NOT mean the event was executed or authorized.
2. **Acknowledgement (`SyncAcknowledgement`)**:
   - Captures `surfaceId`, `eventId`, `sequence`, `acknowledgedAt`, and deterministic `fingerprint`.
   - Invariant: A surface acknowledging an event confirms receipt only. It does NOT imply task success or tool execution.
3. **Multi-Surface Coexistence**:
   - Mobile and Robot can observe and acknowledge the exact same event at sequence N independently.
   - The Brain remains ONE single cognitive authority throughout.

### Tiếng Việt
Các bề mặt tương tác với sự kiện Não bộ qua các bản ghi khai báo:
1. **Quan Sát (`SyncObservation`)**: Xác nhận bề mặt đã thấy sự kiện; không mang tính thực thi.
2. **Xác Nhận (`SyncAcknowledgement`)**: Xác nhận bề mặt đã nhận và xử lý giao diện; không đồng nghĩa tác vụ thành công.
3. **Đa Bề Mặt Cùng Tồn Tại**: Mobile và Robot cùng quan sát và ACK một sự kiện mà không tạo ra phân tách nhận thức.

---

## 7. State Reconciliation Engine / Động Cơ Hòa Giải Trạng Thái

### English
When an external surface presents a synchronization state to the Brain, `reconcileSynchronizationState()` evaluates:
- **CONSISTENT**: Identical sequence and matching event fingerprint.
- **STALE**: Surface sequence is older, but matches Brain history at that sequence (clean lag).
- **DIVERGED**: Surface sequence is older, but payload differs from Brain history (divergence).
- **CONFLICT**: Same sequence but mismatched event identity or fingerprint.
- **GAP**: Surface claims a future sequence that the Brain has not emitted.
- **CROSS_SCOPE**: Mismatched user, session, or brain identifiers.

**Architectural Rule**: Brain authority **ALWAYS** wins reconciliation. Surface state is never promoted above authoritative Brain state.

### Tiếng Việt
Khi bề mặt gửi trạng thái đồng bộ về Não bộ, động cơ hòa giải phân loại chính xác các trường hợp `CONSISTENT`, `STALE`, `DIVERGED`, `CONFLICT`, `GAP`, hoặc `CROSS_SCOPE`. Thẩm quyền của Não bộ luôn là tối thượng.

---

## 8. Checkpoint Model / Mô Hình Checkpoint

### English
`SyncCheckpoint` captures point-in-time synchronization snapshots:
- Monotonic sequence.
- Latest event ID and fingerprint.
- Active surfaces list.
- Acknowledged surfaces list.
- Deterministic fingerprint `chk_sync_<hex>`.
- Deeply immutable; zero filesystem IO; zero external calls.

### Tiếng Việt
Checkpoint đồng bộ hóa lưu lại trạng thái tại số thứ tự N một cách bất biến, phục vụ kiểm toán và hòa giải trạng thái khi bề mặt kết nối lại.

---

## 9. Security Model & Defensive Hardening / Mô Hình Bảo Mật

### English
- **Scope Isolation**: Multi-tenant partitioning via `${userId}::${sessionId}::${brainId}`.
- **Prototype Pollution Defense**: Rejects `__proto__`, `constructor`, `prototype`.
- **Filesystem & Injection Defense**: Rejects null bytes (`\0`), path traversal (`..`), and Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1..9`, `LPT1..9`).
- **Secret Scrubbing**: Automatically scrubs sensitive tokens, passwords, and API keys from audit records and error messages.
- **Monotonic Risk Preservation**: Enforces `CRITICAL > HIGH > MEDIUM > LOW`. Any event attempting to downgrade risk fails closed with `RISK_DOWNGRADE`.

### Tiếng Việt
Phòng thủ toàn diện chống ô nhiễm prototype, tấn công đường dẫn, tiêm nhiễm null-byte, rò rỉ khóa bí mật và vi phạm hạ cấp mức rủi ro.

---

## 10. Boundaries & Intentionally Excluded Transports / Ranh Giới & Các Tầng Cố Tình Loại Trừ

### English
This milestone is **DATA & STATE SYNCHRONIZATION ARCHITECTURE**:
- **Zero Networking**: No WebSockets, WebRTC, MQTT, gRPC, HTTP, or sockets.
- **Zero Hardware**: No ROS, Arduino, GPIO, servos, or robotics runtimes.
- **Zero Mobile Runtime**: No React Native or mobile OS dependencies.
- **Zero Event Execution**: Events are state representations, NOT executable commands.
- **Future Transports**: Future milestones (e.g., MS-1.3.19 Secure Remote Transport) will consume this synchronization foundation.

### Tiếng Việt
Cột mốc này là **KIẾN TRÚC DỮ LIỆU & ĐỒNG BỘ TRẠNG THÁI NỘI BỘ**:
- Không triển khai mạng, không WebSocket/HTTP, không điều khiển robot vật lý, không runtime di động.
- Các tầng truyền tải từ xa trong tương lai sẽ sử dụng nền tảng này làm hợp đồng đồng bộ có thẩm quyền.

---

## 11. Verification & Regression Metrics / Kết Quả Xác Minh & Hồi Quy

- **Dedicated Suite**: `tests/test_v4_agent_brain_synchronization.ts` — **80 / 80 PASS (100%)**.
- **Full Ecosystem Regression**: 20 milestone suites — **968 / 968 PASS (100%)**.
- **TypeScript Typecheck**: 0 diagnostics (`npm run typecheck`).
- **Production Build**: 0 errors (`npm run build`).
- **Git Diff Check**: 0 whitespace errors (`git diff --check`).
- **Forbidden Primitives**: 0 occurrences of `eval`, `child_process`, `fetch`, `WebSocket`, `Math.random`, `crypto.randomUUID`, `fs.write`, hardware, or LLMs in `src/core/synchronization/`.
- **Workspace Boundary**: `C:\BOW\shopofbow` strictly untouched (0 reads, 0 writes, 0 imports, 0 touches).
- **Package Version**: `@bow/agent` strictly maintained at `4.0.0`.
