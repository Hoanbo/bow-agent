# BOWCON V4.0 — BRAIN COORDINATION & CONTINUITY ARCHITECTURE MODEL (EN / VI)
# MÔ HÌNH KIẾN TRÚC ĐIỀU PHỐI VÀ LIÊN TỤC NÃO BỘ BOWCON V4.0 (ANH / VIỆT)

---

## 1. Executive Summary / Tóm Tắt Cấp Cao

### English
Milestone **MS-1.3.17** establishes the foundational **Brain Coordination & Continuity** layer of BOWCON V4.0 (`@bow/agent` 4.0.0). Its primary architectural mandate is:
> **BUILD ONE BOWCON BRAIN THAT CAN MAINTAIN CONTINUITY, IDENTITY, STATE, GOVERNANCE, MEMORY, DECISION CONTEXT, AND EXECUTION CONTEXT ACROSS MULTIPLE PRESENTATION / EMBODIMENT SURFACES.**

Future presentation and embodiment surfaces—such as **BOW-Mobile** (mobile companion application) and **BOW-Robot** (physical robotics embodiment)—are presentation surfaces. They are **NOT** separate brains, **MUST NOT** be implemented as independent agents, **MUST NOT** create duplicate cognitive state, and **MUST NOT** become sources of truth. The authoritative source of truth remains exclusively the **BOWCON Brain**.

### Tiếng Việt
Cột mốc **MS-1.3.17** thiết lập tầng nền tảng **Điều Phối và Liên Tục Não Bộ (Brain Coordination & Continuity)** của BOWCON V4.0 (`@bow/agent` 4.0.0). Mệnh lệnh kiến trúc tối thượng là:
> **XÂY DỰNG MỘT NÃO BỘ BOWCON DUY NHẤT DUY TRÌ TÍNH LIÊN TỤC, DANH TÍNH, TRẠNG THÁI, QUẢN TRỊ, BỘ NHỚ, BỐI CẢNH QUYẾT ĐỊNH VÀ BỐI CẢNH THỰC THI XUYÊN SUỐT NHIỀU BỀ MẶT HIỂN THỊ / HIỆN THÂN KHÁC NHAU.**

Các bề mặt hiển thị và hiện thân trong tương lai—chẳng hạn như **BOW-Mobile** (ứng dụng đồng hành di động) và **BOW-Robot** (hiện thân robot vật lý)—là các bề mặt trình diễn. Chúng **KHÔNG PHẢI** là các não bộ riêng rẽ, **TUYỆT ĐỐI KHÔNG ĐƯỢC** hiện thực như những tác tử độc lập, **KHÔNG ĐƯỢC** tạo trạng thái nhận thức trùng lặp, và **KHÔNG ĐƯỢC** trở thành nguồn chân lý. Nguồn chân lý có thẩm quyền duy nhất luôn là **Não Bộ BOWCON**.

---

## 2. Core Architectural Principle: Brain ≠ Surface / Nguyên Tắc Cốt Lõi: Não Bộ ≠ Bề Mặt

### English
The central paradigm of BOWCON is the strict separation between the universal cognitive Brain and its attached surfaces:

```
                    ONE BRAIN (Authoritative)
                               |
        +----------------------+----------------------+
        |                      |                      |
      Memory               Reasoning              Governance
  (Authoritative)       (Authoritative)         (Authoritative)
        |                      |                      |
        +----------------------+----------------------+
                               |
                       Coordination Layer
                               |
              +----------------+----------------+
              |                                 |
         BOW-Mobile                         BOW-Robot
      Surface (Client)                  Surface (Embodiment)
```

- **Correct Architecture**:
  `User → BOWCON Brain → Coordination → Mobile Surface`
  `User → BOWCON Brain → Coordination → Robot Surface`
- **Strictly Forbidden Architecture**:
  `User → Mobile Brain` and separately `User → Robot Brain` (Split-Brain Antipattern).

When an operator leaves the house, their physical proximity to the robot changes, but the Brain does not duplicate or reset:
- **Robot Surface**: Transitions to `AVAILABLE` or `IDLE`.
- **Mobile Surface**: Transitions to `ACTIVE`.
- **BOWCON Brain**: Remains continuously running with uninterrupted memory, session, and governance state.

### Tiếng Việt
Mô hình trung tâm của BOWCON là sự phân tách triệt để giữa Não Bộ nhận thức vạn năng và các bề mặt kết nối:

```
                  MỘT NÃO BỘ (Có Thẩm Quyền)
                               |
        +----------------------+----------------------+
        |                      |                      |
      Bộ Nhớ                Lập Luận               Quản Trị
  (Có Thẩm Quyền)       (Có Thẩm Quyền)         (Có Thẩm Quyền)
        |                      |                      |
        +----------------------+----------------------+
                               |
                        Tầng Điều Phối
                               |
              +----------------+----------------+
              |                                 |
         BOW-Mobile                         BOW-Robot
       Bề Mặt (Client)                  Bề Mặt (Hiện Thân)
```

- **Kiến trúc Đúng Đắn**:
  `Người Dùng → Não Bộ BOWCON → Điều Phối → Bề Mặt Mobile`
  `Người Dùng → Não Bộ BOWCON → Điều Phối → Bề Mặt Robot`
- **Kiến trúc Nghiêm Cấm**:
  `Người Dùng → Não Mobile` và riêng rẽ `Người Dùng → Não Robot` (Phản mẫu Chia cắt Não bộ).

Khi người dùng rời khỏi nhà, khoảng cách vật lý với robot thay đổi nhưng Não bộ không hề bị phân bản hay tái tạo:
- **Bề mặt Robot**: Chuyển trạng thái sang `AVAILABLE` hoặc `IDLE`.
- **Bề mặt Mobile**: Chuyển trạng thái sang `ACTIVE`.
- **Não Bộ BOWCON**: Duy trì liên tục, bảo toàn tuyệt đối bộ nhớ, phiên làm việc và trạng thái quản trị.

---

## 3. Brain & Surface Identity Models / Mô Hình Danh Tính Não Bộ và Bề Mặt

### English
1. **Brain Identity (`BrainIdentity`)**:
   - Deterministically formatted as `brain_<fingerprint>`.
   - The fingerprint is derived via non-cryptographic FNV-1a 32-bit hashing over stable properties (`userId`, `canonicalName`, `epoch`).
   - Zero dependence on `Math.random`, `crypto.randomUUID`, `Date.now`, hostname, IP, or MAC addresses.
   - Deeply immutable (`Object.freeze`).
2. **Surface Identity (`SurfaceIdentity`)**:
   - Formatted as `surface_<type>_<fingerprint>`.
   - Binds `surfaceType`, `canonicalName`, and declarative `capabilities`.
   - Independent of device IDs or ephemeral OS hardware descriptors.

### Tiếng Việt
1. **Danh Tính Não Bộ (`BrainIdentity`)**:
   - Định dạng tất định dạng `brain_<fingerprint>`.
   - Fingerprint được sinh ra qua giải thuật băm FNV-1a 32-bit trên các trường ổn định (`userId`, `canonicalName`, `epoch`).
   - Không phụ thuộc vào `Math.random`, `crypto.randomUUID`, `Date.now`, hostname, địa chỉ IP hay MAC.
   - Đóng băng bất biến sâu (`Object.freeze`).
2. **Danh Tính Bề Mặt (`SurfaceIdentity`)**:
   - Định dạng `surface_<type>_<fingerprint>`.
   - Gắn kết `surfaceType`, `canonicalName` và danh sách năng lực khai báo `capabilities`.
   - Hoàn toàn độc lập với ID thiết bị hay các định danh phần cứng tạm thời.

---

## 4. Surface Lifecycle & Transition Matrix / Vòng Đời Bề Mặt và Ma Trận Chuyển Đổi

### English
Surfaces undergo deterministic state transitions governed by an authoritative transition matrix:

```
                  [REGISTERED]
                       │
                       ▼
                  [ATTACHED]
                   ▲      │
                   │      ▼
                   │  [AVAILABLE] ◄────────┐
                   │   │       ▲          │
                   │   ▼       │          │
                   │ [ACTIVE] ─┼──► [IDLE]┘
                   │   │   │   │       │
                   │   │   ▼   │       │
                   │   │ [UNAVAILABLE] ┘
                   │   │       │
                   │   ▼       ▼
                   └── [DETACHING]
                           │
                           ▼
                      [DETACHED] (Terminal)
                           ▲
             [FAILED] ─────┤
             [BLOCKED] ────┘
```

- **Operational States**: `AVAILABLE`, `ACTIVE`, `IDLE`.
- **Controlled Failures**: Transitions to `FAILED` or `BLOCKED` can be recovered to `DETACHED` for clean re-attachment.
- **Terminal State**: `DETACHED` cannot transition back directly; re-attaching requires a new attachment cycle.

### Tiếng Việt
Các bề mặt tuân theo ma trận chuyển đổi trạng thái tất định có thẩm quyền:
- **Trạng thái Hoạt động**: `AVAILABLE` (sẵn sàng), `ACTIVE` (đang tương tác), `IDLE` (nghỉ).
- **Xử lý Sự cố Có Kiểm soát**: Chuyển sang `FAILED` hoặc `BLOCKED` có thể chuyển tiếp về `DETACHED` để dọn dẹp và kết nối lại an toàn.
- **Trạng thái Cuối**: `DETACHED` không thể chuyển ngược trực tiếp; việc kết nối lại đòi hỏi một chu kỳ gắn kết mới.

---

## 5. Multi-Surface Coexistence / Cùng Tồn Tại Đa Bề Mặt

### English
A single Brain may host:
- Zero active surfaces (Brain running autonomous background tasks).
- One active surface (e.g., Mobile while walking outside).
- Multiple active surfaces (e.g., Robot displaying a dashboard while Mobile receives user audio).

Activity of a surface does **not** alter the Brain's identity or state. The Brain remains `brain_001` regardless of whether 0, 1, or 5 surfaces are attached.

### Tiếng Việt
Một Não bộ duy nhất có thể chứa:
- 0 bề mặt active (Não đang chạy tác vụ nền tự chủ).
- 1 bề mặt active (ví dụ: Mobile khi đi dạo bên ngoài).
- Nhiều bề mặt active cùng lúc (ví dụ: Robot hiển thị bảng điều khiển trong khi Mobile nhận âm thanh của người dùng).

Sự kích hoạt của bề mặt **không làm thay đổi** danh tính hay trạng thái của Não bộ. Não bộ luôn giữ nguyên danh tính `brain_001`.

---

## 6. Data-Only Handoff Model / Mô Hình Bàn Giao Thuần Dữ Liệu

### English
Handoff (e.g., Robot → Mobile) is purely **DATA + VALIDATION + AUDIT**:
- It carries: `sourceSurface`, `targetSurface`, `brainId`, `userId`, `sessionId`, `continuityId`, `correlationId`, `currentLifecycleState`, `memoryScope`, `governance`, and `riskLevel`.
- **Zero Execution Rule**: Handoff metadata **MUST NOT** execute tools, call ToolRegistry, invoke PDP, consume approval tokens, send network packets, start mobile apps, or trigger robot servos.
- Network transport belongs to future protocol milestones.

### Tiếng Việt
Quá trình bàn giao (ví dụ: Robot → Mobile) hoàn toàn là **DỮ LIỆU + XÁC THỰC + KIỂM TOÁN**:
- Mang theo đầy đủ thông tin định danh, phiên, ngữ cảnh bộ nhớ, quản trị và mức độ rủi ro.
- **Quy Tắc Không Thực Thi**: Dữ liệu bàn giao **TUYỆT ĐỐI KHÔNG ĐƯỢC** gọi công cụ, không gọi PDP, không tiêu thụ token phê duyệt, không gửi gói tin mạng và không kích hoạt phần cứng robot.
- Tầng truyền tải mạng thuộc về các cột mốc tương lai.

---

## 7. Handoff Safety & Invariant Guarantees / An Toàn Bàn Giao và Các Bất Biến

### English
All handoffs must pass strict fail-closed validation:
1. **Cross-User Protection**: Attempting to hand off between User A and User B is immediately rejected (`CROSS_USER_HANDOFF_REJECTED`).
2. **Cross-Session Protection**: Attempting to hand off between different sessions is rejected (`CROSS_SESSION_HANDOFF_REJECTED`).
3. **Cross-Brain Protection**: Handing off to a different brainId fails closed (`CROSS_BRAIN_HANDOFF_REJECTED`).
4. **Monotonic Risk Preservation**: Monotonic hierarchy `CRITICAL > HIGH > MEDIUM > LOW`. Any attempt to downgrade risk during handoff (e.g., `HIGH → LOW`) is strictly rejected (`RISK_DOWNGRADE_REJECTED`).
5. **Governance & Approval Preservation**: Active approval tokens and governance constraints must be preserved without mutation or bypass.

### Tiếng Việt
Mọi thao tác bàn giao đều phải vượt qua kiểm tra an toàn đóng kín (fail-closed):
1. **Bảo Vệ Chéo Người Dùng**: Chuyển giao giữa User A và User B bị từ chối ngay lập tức.
2. **Bảo Vệ Chéo Phiên**: Chuyển giao giữa hai session khác nhau bị từ chối.
3. **Bảo Vệ Chéo Não Bộ**: Chuyển giao sang brainId khác bị từ chối fail-closed.
4. **Bảo Toàn Rủi Ro Đơn Điệu**: Phân cấp `CRITICAL > HIGH > MEDIUM > LOW`. Bất kỳ nỗ lực hạ cấp rủi ro nào đều bị bác bỏ.
5. **Bảo Toàn Quản Trị & Phê Duyệt**: Giữ nguyên token phê duyệt và các ràng buộc chính sách.

---

## 8. Split-Brain & Stale State Prevention / Chống Chia Cắt Não Bộ & Trạng Thái Cũ Kỹ

### English
1. **Split-Brain Prevention**:
   - Occurs when two competing contexts claim authoritative ownership of the same `brainId` + `userId` + `sessionId` with conflicting state fingerprints.
   - The system detects the conflict via `detectSplitBrainConflict()` and rejects mutation with `COORDINATION_CONFLICT`.
2. **Stale Surface Protection**:
   - The Brain maintains a strictly monotonic coordination sequence (`sequence = 1, 2, 3...`).
   - If a lagging surface sends an update with `updateSequence <= brainSequence`, it is rejected with `STALE_COORDINATION_STATE`.

### Tiếng Việt
1. **Chống Chia Cắt Não Bộ (Split-Brain)**:
   - Xảy ra khi hai ngữ cảnh xung đột cùng nhận quyền sở hữu một `brainId` + `userId` + `sessionId` với fingerprint trạng thái khác biệt.
   - Hệ thống phát hiện qua `detectSplitBrainConflict()` và từ chối cập nhật với mã lỗi `COORDINATION_CONFLICT`.
2. **Chống Trạng Thái Cũ Kỹ (Stale Surface)**:
   - Não bộ duy trì số thứ tự điều phối tăng đơn điệu (`sequence = 1, 2, 3...`).
   - Nếu một bề mặt gửi cập nhật có `updateSequence <= brainSequence`, yêu cầu bị từ chối với mã `STALE_COORDINATION_STATE`.

---

## 9. Surface Capabilities / Khả Năng Khai Báo Của Bề Mặt

### English
Capabilities are purely declarative:
- `TEXT_INPUT`, `VOICE_INPUT`, `TEXT_OUTPUT`, `VOICE_OUTPUT`, `SCREEN`, `CAMERA`, `MOTION`, `PHYSICAL_ACTION`, `NOTIFICATION`.
- The coordination subsystem describes capabilities; it never invokes or authorizes physical devices.

### Tiếng Việt
Các năng lực hoàn toàn mang tính khai báo:
- `TEXT_INPUT`, `VOICE_INPUT`, `TEXT_OUTPUT`, `VOICE_OUTPUT`, `SCREEN`, `CAMERA`, `MOTION`, `PHYSICAL_ACTION`, `NOTIFICATION`.
- Phân hệ điều phối mô tả các năng lực này chứ không bao giờ trực tiếp điều khiển thiết bị vật lý.

---

## 10. Boundaries & System Integrations / Ranh Giới và Tích Hợp Hệ Thống

### English
- **AgentLoop**: Instantiates `CoordinationService` via dependency injection and exposes `getCoordinationService()`. `AgentLoopResult` carries `coordinationContext?: ContinuityContext`.
- **Memory Boundary**: Preserves memory namespace IDs; does NOT mutate memory stores.
- **Lifecycle Boundary**: Captures lifecycle state for handoffs; does NOT bypass `LifecycleService`.
- **Verification Boundary**: Respects `VerificationService`; coordination acceptance does not imply task success.
- **Commit Boundary**: Emits coordination metadata; does NOT duplicate durable commit persistence.
- **Recovery Boundary**: Reconstructs valid coordination state post-crash; never auto-executes in-flight handoffs.

### Tiếng Việt
- **Tích hợp AgentLoop**: Khởi tạo `CoordinationService` qua dependency injection và cung cấp hàm `getCoordinationService()`. `AgentLoopResult` mang theo trường `coordinationContext?: ContinuityContext`.
- **Ranh giới Bộ nhớ**: Chỉ lưu định danh namespace; KHÔNG tự ý sửa đổi bộ nhớ.
- **Ranh giới Vòng đời**: Ghi nhận trạng thái vòng đời; KHÔNG vượt mặt `LifecycleService`.
- **Ranh giới Xác minh**: Tuân thủ `VerificationService`; việc điều phối được chấp nhận không đồng nghĩa tác vụ đã hoàn thành.
- **Ranh giới Commit**: Cung cấp metadata điều phối; KHÔNG thay thế tầng lưu trữ bền vững.
- **Ranh giới Phục hồi**: Tái cấu trúc trạng thái điều phối sau sự cố; không tự ý tiếp tục bàn giao dang dở.

---

## 11. Security Model & Defensive Hardening / Mô Hình Bảo Mật & Phòng Thủ

### English
- **Defensive Copying & Deep Freeze**: All returned coordination identities, records, checkpoints, and handoff results are deeply frozen (`deepFreeze`).
- **Prototype Pollution Defense**: Rejects `__proto__`, `constructor`, `prototype` in all identifiers and payloads.
- **Filesystem & Injection Defense**: Rejects null bytes (`\0`), path traversal (`..`), and Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1..9`, `LPT1..9`).
- **Secret Scrubbing**: Automatically scrubs tokens, API keys, passwords, and credentials from audit records and failure messages.

### Tiếng Việt
- **Sao Chép Phòng Vệ & Đóng Băng Sâu**: Toàn bộ kết quả, bản ghi kiểm toán và checkpoint đều được đóng băng bất biến (`deepFreeze`).
- **Chống Ô Nhiễm Prototype**: Chặn đứng `__proto__`, `constructor`, `prototype`.
- **Chống Tấn Công Đường Dẫn**: Chặn ký tự null, duyệt đường dẫn và tên thiết bị cấm của Windows.
- **Lọc Bí Mật Tự Động**: Tự động lọc sạch API key, token, mật khẩu khỏi thông báo lỗi và bản ghi kiểm toán.

---

## 12. Verification & Regression Metrics / Kết Quả Xác Minh & Hồi Quy

- **Dedicated Test Suite**: `tests/test_v4_agent_brain_coordination.ts` — **75 / 75 assertions PASS (100%)**.
- **Full Ecosystem Regression**: 19 test suites — **888 / 888 assertions PASS (100%)**.
- **TypeScript Typecheck**: 0 diagnostics (`npm run typecheck`).
- **Production Build**: 0 errors (`npm run build`).
- **Git Diff Check**: 0 whitespace errors (`git diff --check`).
- **Forbidden Primitives**: 0 occurrences of `eval`, `child_process`, `fetch`, `WebSocket`, `Math.random`, `crypto.randomUUID`, `Date.now`, hardware, robotics, mobile runtimes, or LLMs in `src/core/coordination/`.
- **Workspace Boundary**: `C:\BOW\shopofbow` strictly untouched (0 reads, 0 writes, 0 imports, 0 touches).
- **Package Version**: `@bow/agent` strictly maintained at `4.0.0`.
