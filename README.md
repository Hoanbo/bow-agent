# BOW Agent — BOWCON V4.0

## English

BOWCON V4.0 is a production-grade, provider-independent AI agent runtime for the ShopOfBow ecosystem. It provides structured multi-channel interaction (web, desktop, robot, speech) through a strictly typed 7-stage lifecycle with governance, memory isolation, voice synthesis, and conversation context.

**Current status:** `@bow/agent@4.0.0` — 404/404 regression tests PASS.

### Architecture Quick Reference

- **Architecture Contract:** `docs/BOWCON_V4_ARCHITECTURE.md`
- **Bilingual Architecture Guide:** `docs/BOWCON_V4_BILINGUAL_ARCHITECTURE.md`
- **Architecture Flow Diagrams:** `docs/BOWCON_V4_ARCHITECTURE_FLOW.md`
- **Component Reality Matrix:** `docs/BOWCON_V4_COMPONENT_MATRIX.md`
- **Milestone Learning Notes:** `docs/BOWCON_V4_MILESTONE_LEARNING_NOTES.md`
- **Security Model:** `docs/BOWCON_V4_SECURITY_MODEL_EN_VI.md`
- **Glossary (EN/VI):** `docs/BOWCON_V4_GLOSSARY_EN_VI.md`

---

## Tiếng Việt

BOWCON V4.0 là runtime agent AI cấp sản xuất, độc lập với provider, cho hệ sinh thái ShopOfBow. Nó cung cấp tương tác đa kênh có cấu trúc (web, desktop, robot, giọng nói) thông qua vòng đời 7 giai đoạn được định kiểu chặt chẽ với quản trị, cô lập bộ nhớ, tổng hợp giọng nói và ngữ cảnh hội thoại.

**Trạng thái hiện tại:** `@bow/agent@4.0.0` — 404/404 kiểm thử hồi quy ĐẠT.

---

## How to Study This Codebase / Cách Nghiên Cứu Codebase Này

### Recommended Learning Order / Thứ Tự Học Được Đề Xuất

**EN:**
Follow this order because each milestone builds on the previous one. Understanding the architecture contract first gives you the mental model needed for everything else.

**VI:**
Hãy theo thứ tự này vì mỗi mốc được xây dựng dựa trên mốc trước. Hiểu hợp đồng kiến trúc trước tiên giúp bạn có mô hình tư duy cần thiết cho mọi thứ khác.

| # | Topic | File(s) | Milestone |
|---|---|---|---|
| 1 | **Architecture Contract** | `docs/BOWCON_V4_ARCHITECTURE.md` | MS-1.1 |
| 2 | **AgentLoop** | `src/core/agentLoop.ts` | MS-1.2 |
| 3 | **Working Memory** | `src/core/memory.ts` | MS-1.3.1 |
| 4 | **Durable Memory** | `src/core/persistence/durableJsonStore.ts` | MS-1.3.2 |
| 5 | **Multi-User Isolation** | `src/core/persistence/userPartitionResolver.ts`, `src/embodied/bossMemoryHub.ts` | MS-1.3.3 |
| 6 | **Governance / PDP** | `src/core/policyDecisionPoint.ts` | MS-1.2 |
| 7 | **Approval & Idempotency** | `src/core/approvalService.ts`, `src/core/idempotencyStore.ts` | MS-1.3.4 |
| 8 | **Voice Runtime** | `src/core/voice/voiceService.ts` | MS-1.3.5 |
| 9 | **Voice Quality** | `src/core/voice/speechSegmenter.ts`, `src/core/voice/voiceProsody.ts` | MS-1.3.6 |
| 10 | **Conversation Context** | `src/core/context/contextManager.ts` | MS-1.3.7 |

### Why This Order? / Tại Sao Theo Thứ Tự Này?

**EN:**
1. The **Architecture Contract** defines all subsystem boundaries and invariants. Read this first so you understand why the code is structured the way it is.
2. The **AgentLoop** is the central nervous system. Everything connects through it.
3. **Working Memory** is the simplest form of state — understand this before durable memory.
4. **Durable Memory** builds on working memory concepts but adds crash-safety.
5. **Multi-User Isolation** extends durable memory to multiple users.
6. **Governance/PDP** is the safety gate — understand before you study tool execution.
7. **Approval & Idempotency** are the two safety mechanisms for high-impact operations.
8. **Voice Runtime** introduces the provider abstraction pattern.
9. **Voice Quality** shows how text is normalized for natural speech.
10. **Conversation Context** ties everything together with intelligent response memory.

**VI:**
1. **Hợp đồng kiến trúc** xác định tất cả các ranh giới hệ thống con và bất biến.
2. **AgentLoop** là hệ thần kinh trung ương. Mọi thứ kết nối qua nó.
3. **Working Memory** là dạng trạng thái đơn giản nhất — hiểu điều này trước bộ nhớ bền vững.
4. **Durable Memory** xây dựng trên các khái niệm working memory nhưng thêm an toàn khi crash.
5. **Multi-User Isolation** mở rộng bộ nhớ bền vững cho nhiều người dùng.
6. **Governance/PDP** là cổng an toàn — hiểu trước khi nghiên cứu thực thi công cụ.
7. **Approval & Idempotency** là hai cơ chế an toàn cho các thao tác tác động lớn.
8. **Voice Runtime** giới thiệu mẫu trừu tượng hóa provider.
9. **Voice Quality** cho thấy văn bản được chuẩn hóa như thế nào cho giọng nói tự nhiên.
10. **Conversation Context** kết hợp tất cả với bộ nhớ phản hồi thông minh.

---

## Quickstart / Khởi Động Nhanh

Requirements: Windows 11 x64, Node.js 22+, Gemini API key (for cloud mode).

```powershell
Copy-Item .env.example .env
npm ci
npm run typecheck
npm run build
npm start
Invoke-RestMethod http://127.0.0.1:4000/health
```

Fill in `.env`: `GEMINI_API_KEY`, `BOW_DESKTOP_AUTH_TOKEN`, `ROBOT_GATEWAY_SECRET`.

Điền vào `.env`: `GEMINI_API_KEY`, `BOW_DESKTOP_AUTH_TOKEN`, `ROBOT_GATEWAY_SECRET`.

---

## Running Tests / Chạy Kiểm Thử

```powershell
# Run all BOWCON V4.0 regression tests
npx tsx tests/test_v4_architecture_contract.ts
npx tsx tests/test_v4_agent_loop.ts
npx tsx tests/test_v4_memory_session_isolation.ts
npx tsx tests/test_v4_durable_memory_persistence.ts
npx tsx tests/test_v4_multi_user_durable_memory.ts
npx tsx tests/test_v4_multi_tenant_approval_idempotency.ts
npx tsx tests/test_v4_agent_voice_runtime.ts
npx tsx tests/test_v4_agent_voice_quality.ts
npx tsx tests/test_v4_agent_conversation_context.ts
```

Expected: **404 / 404 PASS** across all suites.

---

## Further Reading / Đọc Thêm

| Document | Language | Contents |
|---|---|---|
| `docs/BOWCON_V4_BILINGUAL_ARCHITECTURE.md` | EN + VI | Full architecture guide |
| `docs/BOWCON_V4_ARCHITECTURE_FLOW.md` | EN + VI | Mermaid diagrams |
| `docs/BOWCON_V4_SECURITY_MODEL_EN_VI.md` | EN + VI | 15 threat/defense pairs |
| `docs/BOWCON_V4_MILESTONE_LEARNING_NOTES.md` | EN + VI | Per-milestone explanations |
| `docs/BOWCON_V4_GLOSSARY_EN_VI.md` | EN + VI | 35-term glossary |
| `docs/BOWCON_V4_ARCHITECTURE.md` | EN | Technical architecture contract |
| `docs/BOWCON_V4_COMPONENT_MATRIX.md` | EN | 62-component reality matrix |

---

## Operational Security / Bảo Mật Vận Hành

- Only expose HTTPS via reverse proxy; keep BOW and Ollama ports on loopback/VPN.
- Chỉ expose HTTPS qua reverse proxy; giữ port BOW và Ollama trên loopback/VPN.
- Use random tokens of at least 32 bytes; rotate regularly.
- Dùng token ngẫu nhiên tối thiểu 32 bytes; xoay định kỳ.
- Do not log prompts containing PII or API keys.
- Không log prompt chứa PII hoặc API key.

---

## API Endpoints / Các Endpoint API

- `GET /health`
- `POST /api/agent/query`
- `POST /api/speech/tts`
- `POST /api/speech/stt`
- `POST /api/desktop/command`
- `GET /api/knowledge/gaps`
- `POST /api/events/shop`

Endpoints with real side-effects (desktop, robot, webhook) must be behind authentication/authorization before use outside localhost. Do not treat current endpoints as a stable public API.

Các endpoint có tác động thật (desktop, robot, webhook) phải nằm sau xác thực/ủy quyền trước khi sử dụng ngoài localhost.
