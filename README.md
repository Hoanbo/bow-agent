# BOW Agent — BOWCON V4.0

## English

BOWCON V4.0 is a personal AI cognitive and autonomous operating runtime created to serve its single Master Owner.
BOWCON belongs to the broader BOW personal ecosystem.
ShopOfBow is one independent project within BOW and is not the architectural parent of BOWCON.
BOWCON is designed around runtime host observation and capability discovery rather than assuming a specific operating system.

**Current status:** `@bow/agent@4.0.0` — MS-1.3.53 (Governed Post-Deployment Autonomous Verification, Drift Detection & Observability Telemetry Mesh) — All 56 regression test suites PASS, 29 reality gate assertions PASS, 0 failures.

### Architecture Quick Reference

- **Governed Post-Deployment Autonomous Verification, Drift Detection & Observability Telemetry Mesh (EN/VI):** `docs/BOWCON_V4_GOVERNED_POST_DEPLOYMENT_OBSERVABILITY_EN_VI.md`
- **Governed Production Deployment & Canary Verification Pipeline (EN/VI):** `docs/BOWCON_V4_GOVERNED_PRODUCTION_DEPLOYMENT_CANARY_EN_VI.md`
- **Governed Release Execution & Authorized Deployment Boundary (EN/VI):** `docs/BOWCON_V4_GOVERNED_RELEASE_EXECUTION_EN_VI.md`
- **Governed Continuous Integration & Milestone Release Verification Pipeline (EN/VI):** `docs/BOWCON_V4_GOVERNED_CI_MILESTONE_RELEASE_VERIFICATION_EN_VI.md`
- **Governed Project Build, Test & Quality Pipeline (EN/VI):** `docs/BOWCON_V4_MASTER_OWNER_GOVERNED_BUILD_TEST_QUALITY_GATE_EN_VI.md`
- **Controlled Change Promotion & Governed Project Integration (EN/VI):** `docs/BOWCON_V4_MASTER_OWNER_CONTROLLED_CHANGE_PROMOTION_EN_VI.md`
- **Governed Autonomous Project Sandbox & Worktree Isolation (EN/VI):** `docs/BOWCON_V4_MASTER_OWNER_GOVERNED_SANDBOX_WORKTREE_EN_VI.md`
- **Governed Multi-Agent Task Orchestration & Evidence (EN/VI):** `docs/BOWCON_V4_MASTER_OWNER_MULTI_AGENT_ORCHESTRATION_EVIDENCE_EN_VI.md`
- **Master Owner Delegation Governance (EN/VI):** `docs/BOWCON_V4_MASTER_OWNER_DELEGATION_FEDERATION_GOVERNANCE_EN_VI.md`
- **Master Owner Durable Resilience & Goal Continuity (EN/VI):** `docs/BOWCON_V4_MASTER_OWNER_DURABLE_RESILIENCE_CONTINUITY_EN_VI.md`
- **Master Owner Cognitive Resilience & Episodic Synthesis (EN/VI):** `docs/BOWCON_V4_MASTER_OWNER_COGNITIVE_RESILIENCE_EPISODIC_SYNTHESIS_EN_VI.md`
- **Master Owner World Model & Capability Reasoning (EN/VI):** `docs/BOWCON_V4_MASTER_OWNER_WORLD_MODEL_REASONING_MODEL_EN_VI.md`
- **Master Architecture Identity Model (EN/VI):** `docs/BOWCON_V4_MASTER_ARCHITECTURE_IDENTITY_EN_VI.md`
- **Master Owner Personal Operating System Model (EN/VI):** `docs/BOWCON_V4_MASTER_OWNER_PERSONAL_OPERATING_SYSTEM_MODEL_EN_VI.md`
- **Master Owner Cognitive Partnership Model (EN/VI):** `docs/BOWCON_V4_MASTER_OWNER_COGNITIVE_PARTNERSHIP_MODEL_EN_VI.md`
- **Master Human Authority Model (EN/VI):** `docs/BOWCON_V4_MASTER_HUMAN_AUTHORITY_EXECUTIVE_GOVERNANCE_MODEL_EN_VI.md`
- **Architecture Contract:** `docs/BOWCON_V4_ARCHITECTURE.md`
- **Bilingual Architecture Guide:** `docs/BOWCON_V4_BILINGUAL_ARCHITECTURE.md`
- **Architecture Flow Diagrams:** `docs/BOWCON_V4_ARCHITECTURE_FLOW.md`
- **Component Reality Matrix:** `docs/BOWCON_V4_COMPONENT_MATRIX.md`
- **Milestone Learning Notes:** `docs/BOWCON_V4_MILESTONE_LEARNING_NOTES.md`
- **Security Model:** `docs/BOWCON_V4_SECURITY_MODEL_EN_VI.md`
- **Glossary (EN/VI):** `docs/BOWCON_V4_GLOSSARY_EN_VI.md`

---

## Tiếng Việt

BOWCON V4.0 là runtime điều hành nhận thức và tự chủ AI cá nhân được xây dựng để phục vụ một Master Owner duy nhất.
BOWCON thuộc về hệ sinh thái cá nhân rộng hơn là BOW.
ShopOfBow là một dự án độc lập bên trong BOW và không phải là cha đẻ kiến trúc của BOWCON.
BOWCON được thiết kế dựa trên quan sát host tại runtime và khám phá năng lực thay vì giả định một hệ điều hành cụ thể.

**Trạng thái hiện tại:** `@bow/agent@4.0.0` — MS-1.3.53 (Lưới Đo từ xa Quan sát, Xác minh Tự động & Phát hiện Sai lệch Sau Triển khai Có quản trị) — Tất cả 56 bộ kiểm thử hồi quy ĐẠT, 29 khẳng định cổng thực tế ĐẠT, 0 thất bại.

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

Requirements: Node.js 22+, supported JavaScript runtime environment, configured cognitive provider for cloud mode, host capabilities required by selected operations (Windows-specific optional capabilities documented separately).

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
node scratch/run_full_regression.mjs
```

Expected: **55 / 55 PASS** across all suites.

---

## Further Reading / Đọc Thêm

- **MS-1.3.52 (Current)** establishes Governed Production Deployment & Canary Verification Pipeline, staged rollout rings (`RING_0`..`RING_4`), automated SLO degradation circuit breaking, governed rollbacks, multi-agent contradiction detection without majority voting, and immutable audit evidence (`CANARY_PASS != OWNER_APPROVAL`). See `docs/BOWCON_V4_GOVERNED_PRODUCTION_DEPLOYMENT_CANARY_EN_VI.md`.
- **MS-1.3.51** established Governed Release Execution & Authorized Deployment Boundary, single-use WorldActionAuthorization tokens, supervisory review, post-release verification, atomic rollback, and provenance logging (`OWNER_APPROVAL != EXECUTION_TOKEN`). See `docs/BOWCON_V4_GOVERNED_RELEASE_EXECUTION_EN_VI.md`.
- **MS-1.3.50** established Governed Continuous Integration & Milestone Release Verification Pipeline, multi-stage release audit, acceptance criteria checklist verification, multi-agent contradiction detection, cryptographic verification packet assembly (`TECHNICAL_VERIFICATION != OWNER_APPROVAL`), and advisory release recommendation. See `docs/BOWCON_V4_GOVERNED_CI_MILESTONE_RELEASE_VERIFICATION_EN_VI.md`.
- **MS-1.3.49** established Governed Project Build, Test & Continuous Quality Gate Pipeline, command allowlist registry, in-sandbox execution, cryptographic evidence aggregation, contradiction engine, and continuous quality gates. See `docs/BOWCON_V4_MASTER_OWNER_GOVERNED_BUILD_TEST_QUALITY_GATE_EN_VI.md`.
- **MS-1.3.48** established Controlled Change Promotion & Governed Project Integration, deterministic proposal generation, freshness validation, conflict detection, review gates, and atomic rollback. See `docs/BOWCON_V4_MASTER_OWNER_CONTROLLED_CHANGE_PROMOTION_EN_VI.md`.
- **MS-1.3.47** established Governed Autonomous Project Sandbox & Controlled Worktree Isolation, deterministic path containment, symlink/junction escape rejection, protected workspace isolation (`C:\BOW\shopofbow`), deterministic SHA-256 manifests, cryptographic diffs, sandbox change rollback, and governed export without unrestricted execution. See `docs/BOWCON_V4_MASTER_OWNER_GOVERNED_SANDBOX_WORKTREE_EN_VI.md`.
- **MS-1.3.46** established Governed Multi-Agent Task Orchestration, parent/child task lifecycle management, task dependency and cycle validation, verifiable artifact handoffs, cryptographic evidence aggregation, evidence provenance and integrity verification, supervisor review (`VERIFIED != OWNER_APPROVED`), cross-agent contradiction preservation, and safe recovery without unrestricted execution. See `docs/BOWCON_V4_MASTER_OWNER_MULTI_AGENT_ORCHESTRATION_EVIDENCE_EN_VI.md`.
- **MS-1.3.45** established Master Owner delegation governance, agent identity separation (`AGENT != MASTER_OWNER`), federated device registry, capability leases, scope containment (`DELEGATED_AUTHORITY <= OWNER_GRANTED_SCOPE`), immediate revocation (`REVOCATION > AGENT_INTENT`), and replay protection. See `docs/BOWCON_V4_MASTER_OWNER_DELEGATION_FEDERATION_GOVERNANCE_EN_VI.md`.
- **MS-1.3.44** established Master Owner durable cognitive resilience, cross-episode learning with minimum observation threshold, world-model learning federation (advisory only), and long-horizon goal continuity across restarts with Master Owner intent supremacy. See `docs/BOWCON_V4_MASTER_OWNER_DURABLE_RESILIENCE_CONTINUITY_EN_VI.md`.
- **MS-1.3.43** established Master Owner cognitive resilience, adaptive host orchestration, self-reflective cognitive engine, and episodic memory synthesis. See `docs/BOWCON_V4_MASTER_OWNER_COGNITIVE_RESILIENCE_EPISODIC_SYNTHESIS_EN_VI.md`.
- **MS-1.3.38** unifies the runtime under a single **Master Human Authority** (`MasterHumanAuthority`), subordinating executive orchestration, continuous operating loop, and recovery under canonical `HumanGate` with 12-attribute cryptographic token bindings, fail-closed DAG safety, and absolute `USER_STOP` supremacy. See `docs/BOWCON_V4_MASTER_HUMAN_AUTHORITY_EXECUTIVE_GOVERNANCE_MODEL_EN_VI.md`.
- **MS-1.3.37** added real executive task orchestration: durable session-scoped goals, dependency DAG scheduling, governed execution, human-supremacy controls, and SHA-256-verified checkpoint recovery. See `docs/BOWCON_V4_EXECUTIVE_TASK_LONG_HORIZON_GOAL_ORCHESTRATION_MODEL_EN_VI.md`.

| Document | Language | Contents |
|---|---|---|
| `docs/BOWCON_V4_GOVERNED_PRODUCTION_DEPLOYMENT_CANARY_EN_VI.md` | EN + VI | Governed Production Deployment & Canary Pipeline (MS-1.3.52) |
| `docs/BOWCON_V4_GOVERNED_RELEASE_EXECUTION_EN_VI.md` | EN + VI | Governed Release Execution & Authorized Deployment Boundary (MS-1.3.51) |
| `docs/BOWCON_V4_GOVERNED_CI_MILESTONE_RELEASE_VERIFICATION_EN_VI.md` | EN + VI | Governed CI & Milestone Release Verification Pipeline (MS-1.3.50) |
| `docs/BOWCON_V4_MASTER_OWNER_GOVERNED_BUILD_TEST_QUALITY_GATE_EN_VI.md` | EN + VI | Governed Project Build, Test & Quality Pipeline (MS-1.3.49) |
| `docs/BOWCON_V4_MASTER_OWNER_CONTROLLED_CHANGE_PROMOTION_EN_VI.md` | EN + VI | Controlled Change Promotion & Governed Project Integration (MS-1.3.48) |
| `docs/BOWCON_V4_MASTER_OWNER_GOVERNED_SANDBOX_WORKTREE_EN_VI.md` | EN + VI | Governed Autonomous Project Sandbox & Controlled Worktree Isolation (MS-1.3.47) |
| `docs/BOWCON_V4_MASTER_OWNER_MULTI_AGENT_ORCHESTRATION_EVIDENCE_EN_VI.md` | EN + VI | Governed Multi-Agent Task Orchestration & Distributed Evidence Verification (MS-1.3.46) |
| `docs/BOWCON_V4_MASTER_OWNER_DELEGATION_FEDERATION_GOVERNANCE_EN_VI.md` | EN + VI | Master Owner Delegation Governance & Authority Lease Architecture (MS-1.3.45) |
| `docs/BOWCON_V4_MASTER_OWNER_DURABLE_RESILIENCE_CONTINUITY_EN_VI.md` | EN + VI | Master Owner Durable Resilience, Cross-Episode Learning & Goal Continuity (MS-1.3.44) |
| `docs/BOWCON_V4_MASTER_OWNER_COGNITIVE_RESILIENCE_EPISODIC_SYNTHESIS_EN_VI.md` | EN + VI | Master Owner Cognitive Resilience & Episodic Synthesis (MS-1.3.43) |
| `docs/BOWCON_V4_MASTER_HUMAN_AUTHORITY_EXECUTIVE_GOVERNANCE_MODEL_EN_VI.md` | EN + VI | Master Human Authority & Executive Governance Model |
| `docs/BOWCON_V4_EXECUTIVE_TASK_LONG_HORIZON_GOAL_ORCHESTRATION_MODEL_EN_VI.md` | EN + VI | Executive Task & Goal Orchestration Model |
| `docs/BOWCON_V4_CONTINUOUS_OPERATING_LOOP_CONTROLLED_AUTONOMY_MODEL_EN_VI.md` | EN + VI | Continuous Operating Loop & Autonomy Model |
| `docs/BOWCON_V4_SUPERVISORY_AUTONOMOUS_RECOVERY_HUMAN_GOVERNANCE_MODEL_EN_VI.md` | EN + VI | Supervisory Autonomous Recovery & Human Gate Model |
| `docs/BOWCON_V4_BILINGUAL_ARCHITECTURE.md` | EN + VI | Full architecture guide |
| `docs/BOWCON_V4_ARCHITECTURE_FLOW.md` | EN + VI | Mermaid diagrams |
| `docs/BOWCON_V4_SECURITY_MODEL_EN_VI.md` | EN + VI | 15 threat/defense pairs |
| `docs/BOWCON_V4_MILESTONE_LEARNING_NOTES.md` | EN + VI | Per-milestone explanations |
| `docs/BOWCON_V4_GLOSSARY_EN_VI.md` | EN + VI | 35-term glossary |
| `docs/BOWCON_V4_ARCHITECTURE.md` | EN | Technical architecture contract |
| `docs/BOWCON_V4_COMPONENT_MATRIX.md` | EN | Comprehensive component reality matrix |

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
