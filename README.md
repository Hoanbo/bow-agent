# BOW Agent 4.0

BOW Agent là runtime TypeScript cho trợ lý đa kênh: web, desktop, robot, giọng nói và Shop of BOW. Runtime định tuyến giữa Gemini cloud và Ollama local.

> Kết quả audit: codebase có nền tảng agent cấp cao, nhưng chưa thể tự nhận là một hệ “AI Level 4 quốc tế” đã được chứng nhận. “Level 4” trong repository là mục tiêu tự chủ có giới hạn; production vẫn cần rào chắn an toàn, đánh giá, quan sát và người phê duyệt cho hành động có hậu quả.

## Khởi động an toàn trên Windows

Yêu cầu: Windows 11 x64, Node.js 22+ và Gemini API key nếu dùng cloud.

```powershell
Copy-Item .env.example .env
npm ci
```

Điền vào `.env`: `GEMINI_API_KEY`, `BOW_DESKTOP_AUTH_TOKEN`, `ROBOT_GATEWAY_SECRET`. Không commit `.env`, không gửi key qua chat và không dùng giá trị placeholder.

Gemini key chỉ được đọc ở server qua `GEMINI_API_KEY`; model lấy từ `GEMINI_MODEL` (mặc định `gemini-3.6-flash`). Gemini client đã được sửa để tôn trọng biến này. Hãy kiểm tra danh sách model đang được Google hỗ trợ trước khi đổi model production.

### Ollama local

Cài Ollama Windows từ trang chính thức, rồi mở PowerShell mới:

```powershell
ollama pull qwen2.5:7b
ollama list
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

BOW dùng endpoint OpenAI-compatible của Ollama:

```dotenv
LOCAL_LLM_URL=http://127.0.0.1:11434/v1
LOCAL_LLM_MODEL=qwen2.5:7b
```

Giữ Ollama ở loopback. Không đặt `OLLAMA_HOST=0.0.0.0:11434` trừ khi đã có firewall, VPN và reverse proxy xác thực.

### Run và kiểm tra

```powershell
npm run typecheck
npm run build
npm start
Invoke-RestMethod http://127.0.0.1:4000/health
```

Regression suites: `npm run test:all`. Có thể chạy riêng `test:multichannel`, `test:executive`, `test:v4m1`, `test:v4m2`, `test:v4m3`, `test:phase1`, `test:phase2`, `test:phase3`.

## Kiến trúc hiện có

```text
Web / Desktop / Robot / Speech
              |
      HTTP + WebSocket gateway
              |
      Agent engine + tool registry
              |
    Gemini cloud <-> Hybrid router <-> Ollama local
              |
Memory | knowledge governance | analytics | embodied services
```

- `src/server.ts`: HTTP health/query/speech/desktop/webhook và WebSocket gateway.
- `src/gemini/`: Gemini prompt, tools, REST client.
- `src/llm/`: Ollama provider và cloud-local failover.
- `src/adapters/`: web, robot, desktop; `src/speech/` và `src/embodied/`: voice/robot.
- `src/knowledge/`, `src/monitoring/`, `src/production/`: governance, analytics, vận hành.

## Audit và roadmap production / autonomy cấp 4

| Ưu tiên | Phát hiện | Hành động bắt buộc |
|---|---|---|
| P0 | Server bind `0.0.0.0`, CORS `*`; webhook shop và WebSocket robot chưa xác thực tại gateway. | Reverse proxy HTTPS/VPN, allowlist origin, signed webhook/JWT/mTLS, rate-limit và IP allowlist. |
| P0 | Token desktop/robot từng có default trong code; desktop và robot có tác động thật. | Xoay token, bỏ secret default, dùng secret manager, device identity và audit log bất biến. |
| P0 | `sandboxRunner` / dynamic skill dùng `AsyncFunction`, không phải sandbox bảo mật. | Không cho LLM tự chạy/lưu code trên host; tách container/VM không đặc quyền, egress deny, quota, read-only FS và human approval. |
| P1 | Local provider coi URL là available mà chưa probe health; fallback heuristic vẫn success. | Health probe, circuit breaker, timeout/queue/backpressure, trạng thái degraded và SLO. |
| P1 | Gemini conversation history là global in-memory. | Store theo tenant/user/session, TTL, encryption at rest, quota và chống leakage. |
| P1 | Chưa thấy persistence production, migration, backup/restore/DR drill. | Postgres + vector store, migration, backup mã hóa và restore test định kỳ. |
| P1 | Test là script assertions, thiếu threat/eval/load/replay. | Unit/integration/e2e, prompt-injection & tool-abuse eval, golden set tiếng Việt, load/chaos, CI coverage + SBOM. |
| P2 | Chưa thấy OpenTelemetry/tracing/alerts chuẩn. | Structured log redaction, traces/metrics, dashboard, on-call, runbook và incident review. |
| P2 | Chưa có approval/idempotency ledger/policy engine tách biệt. | Phân loại read/reversible/irreversible; approval cho tiền, đơn hàng, desktop, robot; kill switch và simulation mode. |

### Tiêu chí autonomy đo được

Chỉ gọi là tự chủ cấp 4 trong phạm vi nghiệp vụ xác định khi có: boundary nhiệm vụ rõ ràng; least privilege; human approval cho hành động không đảo ngược; emergency stop; audit trail; eval liên tục; monitoring/rollback; bằng chứng SLO. Robot cần safety interlock vật lý độc lập với LLM.

## Bảo mật vận hành tối thiểu

- Chỉ expose HTTPS qua reverse proxy; giữ port BOW và Ollama trên loopback/VPN.
- Dùng token ngẫu nhiên tối thiểu 32 bytes, xoay định kỳ và tách token desktop/robot/webhook.
- Không log prompt chứa PII/key; không để secret trong data JSON/test fixture/screenshot.
- Chạy service bằng Windows account không Administrator; không chạy dynamic skill dưới quyền user có dữ liệu quan trọng.
- Firewall allowlist, backup mã hóa, update Node/dependencies, dependency scan trong CI.

## API hiện có

- `GET /health`
- `POST /api/agent/query`
- `POST /api/speech/tts`
- `POST /api/speech/stt`
- `POST /api/desktop/command`
- `GET /api/knowledge/gaps`
- `POST /api/events/shop`

Các endpoint tác động (desktop, robot, webhook) phải nằm sau xác thực/ủy quyền trước khi dùng ngoài localhost. Không coi endpoint hiện tại là public API ổn định.

## Ghi chú worktree

`package-lock.json` đã có thay đổi cục bộ trước audit và không bị ghi đè.
