# BOWCON V4.0 — MILESTONE LEARNING NOTES (BILINGUAL)
# Ghi Chú Học Tập Về Các Mốc Phát Triển (Song Ngữ)

---

## Overview / Tổng Quan

**EN:** This document explains each BOWCON V4.0 milestone: why it exists, what problem it solves, what architecture was introduced, and how future milestones depend on it.

**VI:** Tài liệu này giải thích từng mốc phát triển BOWCON V4.0: tại sao nó tồn tại, vấn đề gì nó giải quyết, kiến trúc nào được giới thiệu, và các mốc tương lai phụ thuộc vào nó như thế nào.

---

## MS-1.1 — Architecture Contract & Baseline Lock

### Problem / Vấn Đề

**EN:** Without a written contract, every developer interprets the architecture differently, leading to inconsistent implementations, version drift, and broken invariants.

**VI:** Không có hợp đồng kiến trúc thành văn bản, mọi nhà phát triển diễn giải kiến trúc theo cách khác nhau, dẫn đến triển khai không nhất quán, trôi dạt phiên bản và phá vỡ các bất biến.

### Architecture Introduced / Kiến Trúc Được Giới Thiệu

- `docs/BOWCON_V4_ARCHITECTURE.md` — 20 mandatory sections defining every subsystem boundary.
- `docs/BOWCON_V4_COMPONENT_MATRIX.md` — Maps all components to REAL/PARTIAL/MOCK reality tiers.
- `BOWCON_V4_FORENSIC_AUDIT.md` — Append-only audit record.

**VI:** Hợp đồng kiến trúc 20 mục bắt buộc. Ma trận thành phần ánh xạ REAL/PARTIAL/MOCK. Bản ghi kiểm tra pháp y.

### Security Boundary / Ranh Giới Bảo Mật

**EN:** Declared that `C:\BOW\shopofbow` is FROZEN and READ-ONLY. No milestone may modify it.

**VI:** Khai báo rằng `C:\BOW\shopofbow` bị ĐÓNG BĂNG và CHỈ ĐỌC. Không có mốc nào được phép sửa đổi nó.

### What REAL/PARTIAL/MOCK Means / REAL/PARTIAL/MOCK Có Nghĩa Là Gì

**EN:**
- **REAL**: Operating with genuine APIs, databases, OS primitives, or hardware.
- **PARTIAL**: Real architecture but relies on in-memory stubs or unisolated boundaries.
- **MOCK**: Simulated implementation — no external invocation, purely synthetic.

**VI:**
- **REAL**: Hoạt động với API thực, cơ sở dữ liệu, nguyên hàm OS hoặc phần cứng.
- **PARTIAL**: Kiến trúc thực nhưng dựa vào stub trong bộ nhớ hoặc ranh giới chưa cô lập.
- **MOCK**: Triển khai mô phỏng — không có lời gọi bên ngoài, hoàn toàn tổng hợp.

### Tests / Kiểm Thử

`test_v4_architecture_contract.ts` — **45/45 PASS**

---

## MS-1.2 — Core Agent Loop

### Problem / Vấn Đề

**EN:** The previous agent had no structured lifecycle. Requests could skip governance, execute unvalidated tools, or update memory without verification.

**VI:** Agent trước đây không có vòng đời có cấu trúc. Các yêu cầu có thể bỏ qua quản trị, thực thi công cụ chưa được xác thực, hoặc cập nhật bộ nhớ mà không xác minh.

### Architecture Introduced / Kiến Trúc Được Giới Thiệu

**EN:** The strict 7-stage AgentLoop lifecycle:
1. Intent Resolution — Identify what the user wants.
2. Memory Retrieval — Read-only memory snapshot.
3. Bounded Planning — Create a constrained action plan.
4. PDP Governance — Every action must pass the PolicyDecisionPoint.
5. Tool Execution — Execute only through ToolRegistry.
6. Verification — Confirm the action achieved its goal.
7. State Update — Only commit memory after verification.

**VI:** Vòng lặp AgentLoop 7 giai đoạn nghiêm ngặt: xác định ý định, đọc bộ nhớ, lập kế hoạch có giới hạn, kiểm tra PDP, thực thi công cụ, xác minh, cập nhật trạng thái.

### Invariants / Bất Biến

**EN:**
1. No privileged action bypasses PDP.
2. No result bypasses verification.
3. No state commit without passing verification.

**VI:**
1. Không có hành động đặc quyền nào bỏ qua PDP.
2. Không có kết quả nào bỏ qua xác minh.
3. Không có cam kết trạng thái nào mà không qua xác minh.

### Tests / Kiểm Thử

`test_v4_agent_loop.ts` — **58/58 PASS**

---

## MS-1.3.1 — Session Memory Isolation

### Problem / Vấn Đề

**EN:** The previous implementation had a single global conversation history. Session A could see Session B's turns. User A could see User B's context.

**VI:** Triển khai trước đây có một lịch sử hội thoại toàn cục duy nhất. Session A có thể thấy các lượt của Session B. User A có thể thấy ngữ cảnh của User B.

### Architecture Introduced / Kiến Trúc Được Giới Thiệu

**EN:** `MemoryStore` with composite partition key `${userId}::${sessionId}`. Eliminated all global mutable conversation state.

**VI:** `MemoryStore` với khóa phân vùng tổng hợp `${userId}::${sessionId}`. Loại bỏ tất cả trạng thái hội thoại toàn cục có thể thay đổi.

### Tests / Kiểm Thử

`test_v4_memory_session_isolation.ts` — **62/62 PASS**

---

## MS-1.3.2 — Atomic Durable Memory Persistence

### Problem / Vấn Đề

**EN:** Memory was written with `fs.writeFileSync()` (non-atomic). A crash during write could produce a half-written corrupt JSON file that would silently return garbage on next load.

**VI:** Bộ nhớ được ghi bằng `fs.writeFileSync()` (không nguyên tử). Một lần crash khi ghi có thể tạo ra file JSON được ghi nửa chừng, bị hỏng và sẽ âm thầm trả về dữ liệu rác ở lần tải tiếp theo.

### Architecture Introduced / Kiến Trúc Được Giới Thiệu

**EN:**
- `DurableJsonStore`: write-to-temp + atomic rename pattern.
- Schema validation before every write and after every load.
- Corruption quarantine: corrupted files moved to `.corrupted.<timestamp>`.
- Fail-closed: invalid schema is rejected without silent reset.

**VI:**
- `DurableJsonStore`: mẫu ghi vào file tạm + đổi tên nguyên tử.
- Xác thực schema trước mỗi lần ghi và sau mỗi lần tải.
- Cách ly hỏng hóc: file bị hỏng được chuyển sang `.corrupted.<timestamp>`.
- Fail-closed: schema không hợp lệ bị từ chối mà không âm thầm đặt lại.

### Tests / Kiểm Thử

`test_v4_durable_memory_persistence.ts` — **44/44 PASS**

---

## MS-1.3.3 — Multi-User Durable Memory Partitioning

### Problem / Vấn Đề

**EN:** Durable memory (BossMemory, rules) was a single file shared by all users. There was no physical or logical isolation between users.

**VI:** Bộ nhớ bền vững (BossMemory, quy tắc) là một file duy nhất được chia sẻ bởi tất cả người dùng. Không có cô lập vật lý hoặc logic giữa người dùng.

### Architecture Introduced / Kiến Trúc Được Giới Thiệu

**EN:**
- `UserPartitionResolver`: maps `userId` to a safe, isolated file path.
- `BossMemoryHub` and `BossFeedbackLearner` refactored to be per-user.
- Legacy migration: primary owner inherits the old single file on first access.

**VI:**
- `UserPartitionResolver`: ánh xạ `userId` sang đường dẫn file an toàn, cô lập.
- `BossMemoryHub` và `BossFeedbackLearner` được cấu trúc lại theo từng người dùng.
- Di chuyển kế thừa: chủ sở hữu chính kế thừa file đơn cũ ở lần truy cập đầu tiên.

### Tests / Kiểm Thử

`test_v4_multi_user_durable_memory.ts` — **48/48 PASS**

---

## MS-1.3.4 — Multi-Tenant Approval & Idempotency Durable Storage

### Problem / Vấn Đề

**EN:** Approval records were stored in a single shared file. Any user could potentially consume another user's execution token. Idempotency had no concurrency protection against duplicate side-effects.

**VI:** Bản ghi phê duyệt được lưu trong một file dùng chung. Bất kỳ người dùng nào cũng có thể tiêu thụ token thực thi của người dùng khác. Idempotency không có bảo vệ đồng thời chống lại tác dụng phụ trùng lặp.

### Architecture Introduced / Kiến Trúc Được Giới Thiệu

**EN:**
- `ApprovalService`: per-user partitioned durable storage.
- Token ownership verification: consumer `userId` must match `ownerUserId`.
- One-time token consumption: `APPROVED → CONSUMED` is atomic.
- `IdempotencyStore`: per-user partitioned storage with `IN_PROGRESS` reservation.
- Token TTL and status state machine: `PENDING → APPROVED/REJECTED → CONSUMED/EXPIRED/REVOKED`.

**VI:**
- `ApprovalService`: lưu trữ bền vững được phân vùng theo người dùng.
- Xác minh quyền sở hữu token: `userId` của người tiêu thụ phải khớp `ownerUserId`.
- Tiêu thụ token một lần: `APPROVED → CONSUMED` là nguyên tử.
- `IdempotencyStore`: lưu trữ phân vùng theo người dùng với đặt trước `IN_PROGRESS`.

### Tests / Kiểm Thử

`test_v4_multi_tenant_approval_idempotency.ts` — **59/59 PASS**

---

## MS-1.3.5 — Agent Voice Runtime & Natural TTS Foundation

### Problem / Vấn Đề

**EN:** The agent had no production-grade voice output capability. Text responses could not be converted to speech. Any voice implementation was tightly coupled to the AgentLoop, making provider switching impossible.

**VI:** Agent không có khả năng đầu ra giọng nói cấp sản xuất. Các phản hồi văn bản không thể được chuyển đổi thành giọng nói. Bất kỳ triển khai giọng nói nào cũng được ghép chặt với AgentLoop, khiến việc chuyển đổi provider không thể.

### Architecture Introduced / Kiến Trúc Được Giới Thiệu

**EN:**
- `VoiceService`: provider-independent synthesis orchestrator.
- `TTSProvider` interface: swap OpenAI, ElevenLabs, or Mock without changing AgentLoop.
- `SpeechTextProcessor`: markdown/emoji/code-block removal for natural speech.
- `VoiceConfig` with prototype pollution defense and BCP-47 language validation.
- Timeout race, provider fallback chain, secret redaction on error paths.

**VI:**
- `VoiceService`: bộ điều phối tổng hợp độc lập với provider.
- Giao diện `TTSProvider`: hoán đổi OpenAI, ElevenLabs hoặc Mock mà không thay đổi AgentLoop.
- `SpeechTextProcessor`: loại bỏ markdown/emoji/khối code cho giọng nói tự nhiên.

### Tests / Kiểm Thử

`test_v4_agent_voice_runtime.ts` — **22/22 PASS**

---

## MS-1.3.6 — Agent Voice Quality & Conversational TTS

### Problem / Vấn Đề

**EN:** The basic TTS produced robotic, monotone speech. Sentences ran together without pauses. Technical terms, numbers, and currencies were read literally instead of naturally.

**VI:** TTS cơ bản tạo ra giọng nói robot, đơn điệu. Các câu chạy liền nhau mà không có dừng. Thuật ngữ kỹ thuật, số và tiền tệ được đọc theo nghĩa đen thay vì tự nhiên.

### Architecture Introduced / Kiến Trúc Được Giới Thiệu

**EN:**
- `SpeechSegmenter`: sentence-aware splitting (protects URLs, decimals, versions).
- `VoiceProsodyPlanner`: per-sentence pause, speed, and emphasis planning.
- `PronunciationNormalizer`: API, SDK, CLI → natural spoken expansion.
- `SpeechNumberNormalizer`: $100 → "100 đô la"; 50% → "50 phần trăm".
- `AudioAssembler`: merges sentence-level audio chunks with silent pause buffers.
- `VoicePersonalityModel`: ASSISTANT, PROFESSIONAL, FRIENDLY presets.

**VI:**
- Phân đoạn câu thông minh, lập kế hoạch ngữ điệu theo câu, chuẩn hóa phát âm, lắp ráp âm thanh, mô hình tính cách giọng nói.

### Tests / Kiểm Thử

`test_v4_agent_voice_quality.ts` — **31/31 PASS**

---

## MS-1.3.7 — Agent Conversation Context & Intelligent Response Memory

### Problem / Vấn Đề

**EN:** The agent had no memory of the current conversation beyond raw turn storage. It could not track topic continuity, resolve "cái đó" (that) references, or compact history when it grew too long. Context was not injected into the AgentLoop's planning stages.

**VI:** Agent không có bộ nhớ về cuộc hội thoại hiện tại ngoài việc lưu trữ lượt thô. Nó không thể theo dõi tính liên tục chủ đề, giải quyết các tham chiếu "cái đó", hoặc nén lịch sử khi nó quá dài. Ngữ cảnh không được tiêm vào các giai đoạn lập kế hoạch của AgentLoop.

### Architecture Introduced / Kiến Trúc Được Giới Thiệu

**EN:**
- `ContextClassifier`: 4-tier classification (EPHEMERAL/SESSION/USER/DURABLE) + 5-tier importance.
- `TopicTracker`: deterministic local keyword topic detection — no LLM call required.
- `ReferenceResolver`: resolves pronouns/demonstratives fail-closed (zero hallucination).
- `ContextRanker`: CRITICAL > HIGH > MEDIUM > LOW > TRIVIAL ranking with topic affinity boost.
- `ContextCompactor`: threshold-triggered history compression preserving critical items.
- `ContextStore`: LRU/TTL pruned partition map with security validation.
- `ContextManager`: orchestration façade; failure-isolated from AgentLoop.
- AgentLoop Stage 2 injection: context snapshot enriches memory context.
- AgentLoop Stage 7 recording: agent responses are recorded for future context.

**VI:** Phân loại ngữ cảnh 4 cấp, theo dõi chủ đề, giải quyết tham chiếu, xếp hạng, nén lịch sử, kho ngữ cảnh, quản lý ngữ cảnh, tiêm vào Stage 2 và ghi lại ở Stage 7.

### How Tests Verify It / Cách Kiểm Thử Xác Minh

**EN:** 35 sections covering: isolation (Sections 6-7), classification (8-11), memory boundaries (14), ranking (15-16), topic tracking (17-19), reference resolution (20-22), compaction (23-26), storage (27-28), corruption recovery (29), security (30-31), AgentLoop integration (32-33), governance non-interference (34), voice non-interference (35).

**VI:** 35 mục bao gồm cô lập, phân loại, ranh giới bộ nhớ, xếp hạng, theo dõi chủ đề, giải quyết tham chiếu, nén, lưu trữ, phục hồi tham nhũng, bảo mật, tích hợp AgentLoop và không can thiệp.

### Tests / Kiểm Thử

`test_v4_agent_conversation_context.ts` — **35/35 PASS**

---

## Dependency Graph / Đồ Thị Phụ Thuộc

```
MS-1.1 Architecture Contract
  └── MS-1.2 AgentLoop
        ├── MS-1.3.1 Session Memory Isolation
        │     └── MS-1.3.2 Atomic Durable Memory
        │           └── MS-1.3.3 Multi-User Partitioning
        │                 └── MS-1.3.4 Approval & Idempotency
        ├── MS-1.3.5 Voice Runtime
        │     └── MS-1.3.6 Voice Quality
        └── MS-1.3.7 Conversation Context
              (depends on: MS-1.3.1, MS-1.3.2, MS-1.3.5)
```

---

## BOWCON Version Policy / Chính Sách Phiên Bản

**EN:** The system version is `BOWCON V4.0` and must remain `@bow/agent@4.0.0`. All milestones described here are internal development checkpoints, not public version changes. No MS-1.3.x creates a V4.1 or V5.

**VI:** Phiên bản hệ thống là `BOWCON V4.0` và phải giữ nguyên `@bow/agent@4.0.0`. Tất cả các mốc được mô tả ở đây là điểm kiểm tra phát triển nội bộ, không phải thay đổi phiên bản công khai. Không có MS-1.3.x nào tạo ra V4.1 hoặc V5.

---

*BOWCON V4.0 Milestone Learning Notes — 404/404 regression assertions PASS*
*Ghi chú học tập BOWCON V4.0 — 404/404 kiểm thử hồi quy ĐẠT*
