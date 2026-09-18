# BOWCON V4.0 — BILINGUAL ARCHITECTURE GUIDE
# Hướng Dẫn Kiến Trúc Song Ngữ

**Package:** `@bow/agent@4.0.0`
**Version Status:** LOCKED — Do not increment.
**Language:** English + Vietnamese (Tiếng Anh + Tiếng Việt)

---

## 1. System Overview / Tổng Quan Hệ Thống

**EN:**
BOWCON V4.0 is a personal AI cognitive and autonomous operating runtime for the single Master Owner within the broader BOW personal ecosystem. It provides structured multi-channel interaction (web, desktop, robot, speech) through a strictly typed 7-stage lifecycle. Every stage is gated, verified, and logged. The agent cannot modify its own governance rules or bypass its own Policy Decision Point. ShopOfBow is an independent project within BOW, not the architectural parent of BOWCON.

**VI:**
BOWCON V4.0 là runtime điều hành nhận thức và tự chủ AI cá nhân cho một Master Owner duy nhất bên trong hệ sinh thái cá nhân BOW. Nó cung cấp tương tác đa kênh có cấu trúc (web, desktop, robot, giọng nói) thông qua một vòng đời 7 giai đoạn được định kiểu chặt chẽ. Mỗi giai đoạn được kiểm soát, xác minh và ghi lại. Agent không thể sửa đổi các quy tắc quản trị của chính nó hoặc bỏ qua Điểm Quyết Định Chính Sách của chính nó. ShopOfBow là một dự án độc lập trong BOW, không phải cha đẻ kiến trúc của BOWCON.

---

## 2. AgentLoop 7 Stages / AgentLoop 7 Giai Đoạn

**EN:**
Every user request travels through exactly 7 stages. Each stage has a single responsibility. No stage can be skipped.

**VI:**
Mọi yêu cầu của người dùng đều đi qua đúng 7 giai đoạn. Mỗi giai đoạn có một trách nhiệm duy nhất. Không giai đoạn nào có thể bị bỏ qua.

| Stage | Name (EN) | Tên (VI) | Responsibility |
|---|---|---|---|
| 1 | Intent Resolution | Xác định ý định | Understand what the user wants |
| 2 | Memory Retrieval | Đọc bộ nhớ | Read-only snapshot of context, working memory, boss memory |
| 3 | Bounded Planning | Lập kế hoạch | Create a constrained execution plan |
| 4 | PDP Governance | Kiểm tra chính sách | Gate every action through PolicyDecisionPoint |
| 5 | Tool Execution | Thực thi công cụ | Execute through ToolRegistry only |
| 6 | Verification | Xác minh | Confirm action achieved its goal |
| 7 | State Update | Cập nhật trạng thái | Commit memory, context, and voice output |

**EN:** The happy path ends in state `COMPLETED`. Terminal failure states include `POLICY_DENIED`, `EXECUTION_FAILED`, `VERIFICATION_FAILED`.

**VI:** Đường đi thành công kết thúc ở trạng thái `COMPLETED`. Các trạng thái lỗi cuối cùng bao gồm `POLICY_DENIED`, `EXECUTION_FAILED`, `VERIFICATION_FAILED`.

---

## 3. Working Memory / Bộ Nhớ Làm Việc

**EN:**
Working Memory is short-term, in-process storage for the current session. It holds conversation turns, product context, order context, and user preferences within a session. It does NOT survive process restarts. Key: `${userId}::${sessionId}`.

**VI:**
Working Memory là bộ nhớ ngắn hạn trong process cho phiên hiện tại. Nó lưu các lượt hội thoại, ngữ cảnh sản phẩm, ngữ cảnh đơn hàng và sở thích người dùng trong một phiên. Nó KHÔNG tồn tại qua các lần khởi động lại process. Khóa: `${userId}::${sessionId}`.

- **File:** `src/core/memory.ts`
- **Class:** `MemoryStore`
- **Reality:** REAL

---

## 4. Durable Memory / Bộ Nhớ Bền Vững

**EN:**
Durable Memory persists to disk as JSON files. It survives process restarts. It uses atomic writes (temp file + rename) to prevent corruption. All writes are validated against a schema. Corrupted files are quarantined, not deleted.

**VI:**
Durable Memory được lưu trữ trên đĩa dưới dạng file JSON. Nó tồn tại qua các lần khởi động lại process. Nó sử dụng ghi nguyên tử (file tạm + đổi tên) để ngăn hỏng hóc. Tất cả các lần ghi được xác thực theo schema. Các file bị hỏng được cách ly, không bị xóa.

- **Engine:** `DurableJsonStore` (`src/core/persistence/durableJsonStore.ts`)
- **Partition:** `UserPartitionResolver` → `data/users/{userId}/bossMemory.json`
- **Reality:** REAL

---

## 5. Multi-User Isolation / Cô Lập Đa Người Dùng

**EN:**
Every memory store (working, durable, approval, idempotency, context) is partitioned by `userId`. Physically separated into per-user directories. One user's data cannot be read or written by another. Anonymous users are explicitly rejected from durable memory ownership.

**VI:**
Mọi kho bộ nhớ (làm việc, bền vững, phê duyệt, idempotency, ngữ cảnh) đều được phân vùng theo `userId`. Được tách vật lý thành các thư mục riêng cho mỗi người dùng. Dữ liệu của một người dùng không thể được đọc hoặc ghi bởi người dùng khác. Người dùng ẩn danh bị từ chối rõ ràng khỏi quyền sở hữu bộ nhớ bền vững.

---

## 6. Approval System / Hệ Thống Phê Duyệt

**EN:**
HIGH_IMPACT actions (e.g., desktop automation, data modification) require explicit human approval. The ApprovalService issues a one-time execution token. This token is consumed atomically when the action executes — it cannot be reused. Token ownership is enforced: only the user who requested approval may consume the token.

**VI:**
Các hành động HIGH_IMPACT (ví dụ: tự động hóa desktop, sửa đổi dữ liệu) yêu cầu phê duyệt rõ ràng của con người. ApprovalService cấp token thực thi một lần. Token này được tiêu thụ nguyên tử khi hành động thực thi — không thể tái sử dụng. Quyền sở hữu token được thực thi: chỉ người dùng đã yêu cầu phê duyệt mới có thể tiêu thụ token.

Status machine / Máy trạng thái:
`PENDING → APPROVED → CONSUMED` (success path)
`PENDING → REJECTED` | `PENDING/APPROVED → EXPIRED/REVOKED` (other paths)

---

## 7. Idempotency System / Hệ Thống Idempotency

**EN:**
Idempotency (tính bất biến khi lặp lại) prevents the same operation from executing more than once when a request is retried. The `IdempotencyStore` marks a key as `IN_PROGRESS` immediately on first invocation. Concurrent requests seeing `IN_PROGRESS` are blocked. After completion, the result is cached and replayed for identical requests.

**VI:**
Idempotency (tính bất biến khi lặp lại) ngăn cùng một thao tác thực thi nhiều hơn một lần khi yêu cầu được thử lại. `IdempotencyStore` đánh dấu một khóa là `IN_PROGRESS` ngay lập tức ở lần gọi đầu tiên. Các yêu cầu đồng thời thấy `IN_PROGRESS` bị chặn. Sau khi hoàn thành, kết quả được lưu vào cache và phát lại cho các yêu cầu giống hệt.

---

## 8. Governance / PDP / Quản Trị

**EN:**
The PolicyDecisionPoint (PDP) is the mandatory gate before every tool execution. It classifies actions into: OBSERVE, RECOMMEND, REVERSIBLE, HIGH_IMPACT, FORBIDDEN. It operates on Default Deny: unknown actions are rejected. It maintains global and per-domain kill switches for emergency stop.

**VI:**
PolicyDecisionPoint (PDP) là cổng bắt buộc trước mỗi lần thực thi công cụ. Nó phân loại các hành động thành: OBSERVE, RECOMMEND, REVERSIBLE, HIGH_IMPACT, FORBIDDEN. Hoạt động theo Default Deny: các hành động không xác định bị từ chối. Nó duy trì các công tắt khẩn cấp toàn cục và theo từng lĩnh vực.

---

## 9. Voice Runtime / Thời Gian Chạy Giọng Nói

**EN:**
The VoiceService provides a provider-independent TTS layer. Registered providers (OpenAI, ElevenLabs, Mock) implement the `TTSProvider` interface. The AgentLoop never knows which provider is active. Voice synthesis failures are isolated: they never crash the AgentLoop or alter the text response.

**VI:**
VoiceService cung cấp lớp TTS độc lập với provider. Các provider đã đăng ký (OpenAI, ElevenLabs, Mock) triển khai giao diện `TTSProvider`. AgentLoop không bao giờ biết provider nào đang hoạt động. Lỗi tổng hợp giọng nói được cô lập: chúng không bao giờ làm crash AgentLoop hoặc thay đổi phản hồi văn bản.

---

## 10. Voice Quality Pipeline / Quy Trình Chất Lượng Giọng Nói

**EN:**
Before text reaches a TTS provider, it passes through a quality pipeline:
1. `SpeechTextProcessor` — Remove markdown, emojis, code blocks.
2. `PronunciationNormalizer` — API → "A-P-I"; SDK → "S-D-K".
3. `SpeechNumberNormalizer` — $100 → "100 đô la"; 50% → "50 phần trăm".
4. `SpeechSegmenter` — Split into sentences (protect URLs, decimals).
5. `VoiceProsodyPlanner` — Assign pauses, speed, emphasis per sentence.
6. `AudioAssembler` — Merge audio chunks after per-sentence synthesis.

**VI:**
Trước khi văn bản đến provider TTS, nó đi qua quy trình chất lượng gồm 6 bước: xóa markdown/emoji, chuẩn hóa phát âm, chuẩn hóa số, phân đoạn câu, lập kế hoạch ngữ điệu và lắp ráp âm thanh.

---

## 11. Conversation Context / Ngữ Cảnh Hội Thoại

**EN:**
The Conversation Context subsystem gives the agent structured, classified, and ranked memory of the ongoing conversation. It operates deterministically without external LLM calls. It is injected at Stage 2 of the AgentLoop and recorded at Stage 7.

Key components:
- `ContextClassifier` — 4-tier classification (EPHEMERAL/SESSION/USER/DURABLE).
- `TopicTracker` — Local keyword topic detection.
- `ReferenceResolver` — Pronoun/demonstrative resolution, fail-closed.
- `ContextRanker` — CRITICAL > HIGH > MEDIUM > LOW > TRIVIAL.
- `ContextCompactor` — History compression at configurable threshold.

**VI:**
Hệ thống Conversation Context cung cấp cho agent bộ nhớ có cấu trúc, được phân loại và xếp hạng của cuộc hội thoại đang diễn ra. Nó hoạt động một cách xác định mà không cần gọi LLM bên ngoài.

---

## 12. Security Boundaries / Ranh Giới Bảo Mật

**EN:** BOWCON V4.0 implements 15 documented security boundaries. See `docs/BOWCON_V4_SECURITY_MODEL_EN_VI.md` for the complete threat/defense/test mapping.

**VI:** BOWCON V4.0 triển khai 15 ranh giới bảo mật được ghi lại. Xem `docs/BOWCON_V4_SECURITY_MODEL_EN_VI.md` để biết ánh xạ mối đe dọa/phòng thủ/kiểm thử đầy đủ.

Key defenses / Các phòng thủ chính:
- Path traversal rejection (`UserPartitionResolver`, `ContextStore`)
- Null byte defense
- Windows device-name defense (`CON`, `NUL`, `COM1`, etc.)
- Prototype pollution defense (all config validators)
- Secret redaction on all error paths (`scanSecurity`)
- Fail-closed on all security boundaries
- One-time token consumption
- Token ownership enforcement

---

## 13. Persistence Boundaries / Ranh Giới Lưu Trữ

**EN:**
Data that lives in memory only: `MemoryStore` (session turns), `ContextStore` (context items).
Data that is durably persisted: `BossMemoryHub`, `BossFeedbackLearner`, `ApprovalService`, `IdempotencyStore`.
All durable data uses `DurableJsonStore` with atomic writes and schema validation.

**VI:**
Dữ liệu chỉ sống trong bộ nhớ: `MemoryStore`, `ContextStore`.
Dữ liệu được lưu trữ bền vững: `BossMemoryHub`, `BossFeedbackLearner`, `ApprovalService`, `IdempotencyStore`.
Tất cả dữ liệu bền vững sử dụng `DurableJsonStore` với ghi nguyên tử và xác thực schema.

---

## 14. Provider Abstraction / Trừu Tượng Hóa Provider

**EN:**
BOWCON uses the provider abstraction pattern. The system defines an interface; concrete implementations can be swapped without changing business logic. Current providers: `OpenAiTtsProvider`, `ElevenLabsProvider`, `MockTtsProvider`. Future providers (Google TTS, Azure) can be added by implementing `TTSProvider`.

**VI:**
BOWCON sử dụng mẫu trừu tượng hóa provider. Hệ thống định nghĩa một giao diện; các triển khai cụ thể có thể được hoán đổi mà không thay đổi logic nghiệp vụ.

---

## 15. Error Isolation / Cô Lập Lỗi

**EN:**
Each subsystem wraps its operations in try-catch. Errors are logged but do not propagate upward in ways that would crash the AgentLoop. Examples: voice failure at Stage 7 does not kill the text response; context ingestion failure does not prevent AgentLoop from running; corrupted durable memory is quarantined without bringing down the service.

**VI:**
Mỗi hệ thống con bọc các thao tác của nó trong try-catch. Lỗi được ghi lại nhưng không truyền lên trên theo cách làm crash AgentLoop.

---

## 16. Token Lifecycle / Vòng Đời Token

**EN:**
Execution tokens for HIGH_IMPACT actions follow a strict state machine:
`PENDING` (created, awaiting human) → `APPROVED` (human approved) → `CONSUMED` (executed, irrevocably used).
Side paths: `REJECTED` (human rejected), `EXPIRED` (TTL exceeded), `REVOKED` (administrator revoked).

**VI:**
Token thực thi cho các hành động HIGH_IMPACT theo máy trạng thái nghiêm ngặt.

---

## 17. Session Isolation / Cô Lập Phiên

**EN:**
A session is scoped to `userId + sessionId`. Two sessions of the same user are isolated from each other. The composite key `${userId}::${sessionId}` is used universally across MemoryStore, ContextStore, and all related subsystems.

**VI:**
Một phiên được giới hạn trong `userId + sessionId`. Hai phiên của cùng một người dùng được cô lập khỏi nhau.

---

## 18. Data Flow / Luồng Dữ Liệu

**EN:** User Request → Server → AgentLoop (7 stages) → ToolRegistry → External APIs/OS → VoiceService → JSON Response + Audio

**VI:** Yêu cầu người dùng → Server → AgentLoop (7 giai đoạn) → ToolRegistry → API bên ngoài/OS → VoiceService → Phản hồi JSON + Âm thanh

See `docs/BOWCON_V4_ARCHITECTURE_FLOW.md` for Mermaid diagrams.

---

## 19. Component Relationships / Quan Hệ Thành Phần

See `docs/BOWCON_V4_COMPONENT_MATRIX.md` for the complete 62-component reality audit.

**EN:** Key relationships:
- `AgentLoop` owns and orchestrates all 7 stages.
- `PolicyDecisionPoint` gates Stage 4 (cannot be bypassed).
- `ToolRegistry` is the only permitted tool execution path.
- `VoiceService` is invoked optionally at Stage 7.
- `ContextManager` is injected at Stage 2 and records at Stage 7.

**VI:** AgentLoop sở hữu và điều phối tất cả 7 giai đoạn. PolicyDecisionPoint kiểm soát Stage 4. ToolRegistry là con đường thực thi công cụ duy nhất được phép.

---

## 20. Reality Classification / Phân Loại Mức Thực Tế

**EN:** Every component in BOWCON V4.0 is graded as REAL, PARTIAL, or MOCK. A component cannot be certified as production-complete unless it achieves REAL grade with automated test coverage.

**VI:** Mọi thành phần trong BOWCON V4.0 được xếp hạng là REAL, PARTIAL hoặc MOCK. Một thành phần không thể được chứng nhận là hoàn chỉnh sản xuất trừ khi đạt loại REAL với độ phủ kiểm thử tự động.

Current distribution / Phân phối hiện tại:
- REAL: 45/66 (68.2%)
- PARTIAL: 15/66 (22.7%)
- MOCK: 6/66 (9.1%)

---

## 21. Current Milestone Status / Trạng Thái Mốc Hiện Tại

| Milestone | Tests | Status |
|---|---|---|
| MS-1.1 Architecture Contract | 45/45 | ✅ REAL |
| MS-1.2 Agent Loop | 58/58 | ✅ REAL |
| MS-1.3.1 Session Memory Isolation | 62/62 | ✅ REAL |
| MS-1.3.2 Atomic Durable Memory | 44/44 | ✅ REAL |
| MS-1.3.3 Multi-User Memory | 48/48 | ✅ REAL |
| MS-1.3.4 Approval & Idempotency | 59/59 | ✅ REAL |
| MS-1.3.5 Voice Runtime | 22/22 | ✅ REAL |
| MS-1.3.6 Voice Quality | 31/31 | ✅ REAL |
| MS-1.3.7 Conversation Context | 35/35 | ✅ REAL |
| **TOTAL** | **404/404** | ✅ **100%** |

---

## 22. Future Architecture Boundaries / Ranh Giới Kiến Trúc Tương Lai

**EN:** The following capabilities are defined in the architecture contract but NOT yet implemented (MOCK tier). They are preserved for future milestones and must not be assumed to be operational.

**VI:** Các khả năng sau được định nghĩa trong hợp đồng kiến trúc nhưng CHƯA được triển khai (bậc MOCK). Chúng được bảo tồn cho các mốc tương lai và không được coi là hoạt động.

- `AutonomousNavigation` — Milestone 4.0
- `SpatialMemory` — Milestone 4.1
- `PhysicalVisionService` (currently MOCK) — Milestone 3.2
- `MultiAgentMesh` (currently PARTIAL) — Milestone 2.3
- Local LLM integration (`HybridLlmRouter`) — Milestone 1.4

---

*BOWCON V4.0 Bilingual Architecture Guide*
*Được tạo như một phần của Tài liệu Song Ngữ BOWCON V4.0 — Ngày 2026-09-06*
