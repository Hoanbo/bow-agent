# BOWCON L4 Roadmap — Autonomous Agent Within a Defined Operating Domain

## 1. Mục tiêu và giới hạn

BOWCON không được định nghĩa là AGI hay “tự chủ mọi việc”. Mục tiêu là autonomy cấp 4 **trong phạm vi vận hành xác định (ODD)**: trợ lý vận hành Shop of BOW, trợ lý desktop có kiểm soát và robot bàn làm việc.

Một tác vụ chỉ được tự động thực hiện khi nằm trong allowlist, có tác động thấp hoặc đảo ngược được, policy engine cho phép, và telemetry/audit đang hoạt động.

| Cấp hành động | Ví dụ | Điều kiện |
|---|---|---|
| Observe | đọc dashboard, cảm biến, knowledge base | không cần approval |
| Recommend | báo cáo, draft trả lời, đề xuất voucher | không tự gửi/thay đổi dữ liệu |
| Reversible execute | tạo bản nháp, gắn nhãn ticket, cảnh báo tồn kho | policy allowlist + idempotency + audit |
| Irreversible/high impact | gửi tin, tạo voucher, desktop automation, robot movement | human approval rõ ràng, expiry và audit |
| Forbidden | chuyển tiền, xóa dữ liệu, chạy code do LLM tạo trên host, vượt interlock robot | luôn từ chối |

## 2. Definition of Done cho “L4 trong ODD”

Chỉ tuyên bố đạt mốc này khi toàn bộ điều kiện sau có bằng chứng lưu trữ:

1. Autonomy Charter, risk register và owner cho từng use case được phê duyệt.
2. Không có đường gọi tool tác động nào bypass policy/approval layer.
3. Robot có emergency stop và safety interlock độc lập với LLM/network.
4. Mọi hành động có side effect có identity, correlation ID, idempotency key, policy decision và audit trail append-only.
5. Eval security, regression, load và chaos đạt ngưỡng đã công bố trong ít nhất 30 ngày vận hành canary.
6. SLO, dashboard, alert, rollback, backup/restore drill và incident runbook đã được kiểm tra.
7. Có đánh giá độc lập trước khi mở rộng quyền tự chủ hoặc phạm vi robot.

## 3. Kiến trúc đích

```text
Clients / Robot / Shop webhook
              |
     HTTPS reverse proxy or private VPN
              |
  AuthN (device/JWT/mTLS) + rate limit + replay protection
              |
    BOW gateway -> policy/approval/idempotency/audit layer
              |                    |
      bounded agent planner     Postgres + encrypted object storage
              |
   allowlisted tools / isolated skill runner / robot safety controller
              |
 Gemini cloud <-> health-checked Ollama local <-> deterministic fallback
              |
 OpenTelemetry logs, metrics, traces, evals, alerts, rollback
```

## 4. Milestones

### M0 — Governance and operating domain (Week 1)

Deliverables:

- `docs/autonomy-charter.md`: mission, ODD, excluded actions, human roles, emergency contacts.
- `docs/risk-register.md`: risk, likelihood, impact, owner, mitigation, residual risk.
- Per-tool action classification: observe, recommend, reversible, high impact, forbidden.
- Model/data inventory: Gemini, Qwen/Ollama, prompts, data source, retention, data owner.

Acceptance:

- Each tool has a named owner and a default-deny policy.
- Robot cannot move or actuate from a plain text prompt alone.

### M1 — P0 gateway and secret hardening (Weeks 1–2)

Implementation:

- Remove all production fallback credentials; load secrets from Windows Credential Manager or a secret manager.
- Add HMAC-SHA256 webhook verification with timestamp and nonce replay store.
- Authenticate WebSocket robot/desktop at handshake with short-lived credential; use mTLS for physical devices when possible.
- Add strict origin allowlist, IP allowlist for operator/robot routes, request/body/connection limits and rate limits.
- Put BOW behind Caddy or Nginx HTTPS, or only expose it via Tailscale/VPN; keep Ollama loopback-only.
- Add security headers, request IDs and redacted structured logs.

Acceptance:

- Unauthenticated robot WebSocket, stale/replayed webhook and cross-origin request are denied by automated tests.
- Secret scan finds no production secret in Git history, source, fixtures or logs.

### M2 — Policy, approval and audit ledger (Weeks 2–4)

Implementation:

- Build a single policy decision point before every tool execution; default deny.
- Implement approval records with requested action, rendered diff, approver, expiry and one-time execution token.
- Require idempotency keys for all write/action endpoints.
- Add append-only audit events: actor, device, session, tool, arguments hash, policy decision, approval ID, result, timestamp.
- Add global kill switch and per-domain kill switches: desktop, shop actions, robot actuation, autonomous scheduling.

Acceptance:

- Model output cannot directly invoke a privileged tool.
- Replayed request cannot create a second side effect.
- An approver can revoke a pending action and emergency stop takes effect within the documented limit.

### M3 — Remove unsafe self-modification (Weeks 3–5)

Implementation:

- Disable `AsyncFunction`-based `sandboxRunner` and dynamic skill execution in production immediately.
- Replace it with an isolated runner: disposable container/VM, non-admin user, read-only filesystem, no host secrets, egress deny by default, CPU/RAM/time quotas.
- Treat generated skills as untrusted artifacts: static scan, test, human review, signed release, versioned rollback.

Acceptance:

- A generated skill cannot read host environment variables, network secrets or arbitrary host files.
- A failed skill is killed by resource limits and its artifact is quarantined.

### M4 — Reliable state, memory and data governance (Weeks 4–7)

Implementation:

- Replace global Gemini history with user/tenant/session-scoped state and TTL.
- Introduce Postgres for operational data and an approved vector store for retrieval; enforce access filters before retrieval.
- Encrypt data at rest, define retention/deletion/export procedures and record consent for personal memory.
- Add migrations, encrypted backups, restore runbook and scheduled restore drills.

Acceptance:

- Two test users cannot retrieve each other’s memory under adversarial queries.
- Restore into a clean environment meets declared RPO/RTO.

### M5 — LLM resilience and bounded planning (Weeks 5–8)

Implementation:

- Probe Ollama health/model availability; report `healthy`, `degraded`, `unavailable` rather than URL presence.
- Add timeout, circuit breaker, queue limit and backpressure for Gemini and Ollama.
- Make fallback explicit: deterministic response is not represented as successful LLM reasoning.
- Enforce token/cost/latency budgets and tool-call iteration limits per task.
- Version prompts, models and routing policy; attach versions to every trace.

Acceptance:

- Network loss, rate limiting and missing local model result in safe degraded behavior.
- No task exceeds configured time, tool or cost budget.

### M6 — Robot and desktop safety (Weeks 6–10)

Implementation:

- Hardware E-stop and power cut independent from ESP32, BOW server and LLM.
- Servo/motor limits, speed limits, heartbeat timeout, obstacle/battery/temperature interlocks in firmware.
- Separate perception from actuation; robot command schema is signed, range-validated and replay-protected.
- Desktop mode starts read-only; screenshot/view controls are distinct from keyboard/mouse/write controls.

Acceptance:

- Loss of network, process crash, malformed command and out-of-range motion all transition to a safe state.
- Human can stop actuation without needing the BOW application.

### M7 — Evaluation, security testing and SLOs (Weeks 8–12)

Implementation:

- Build versioned Vietnamese golden sets by use case: shop, owner, robot, desktop, safety refusal.
- Add prompt injection, tool abuse, data exfiltration, auth bypass and replay tests to CI.
- Add unit, integration, end-to-end, contract, load and chaos suites; replace assertion-count claims with coverage and pass-rate reports.
- Define SLOs: availability, p95 latency, tool authorization denial correctness, unsafe-action escape rate, rollback time, backup restore success.

Acceptance examples:

- 100% denial of known forbidden-action and unauthenticated-action tests.
- 0 cross-tenant memory retrieval in the test corpus.
- Measured p95 latency and error budgets meet the approved service target for 30 days.

### M8 — Observability and production operations (Weeks 10–14)

Implementation:

- OpenTelemetry traces spanning request, LLM call, policy, tool and approval.
- Metrics/dashboard for model health, queue depth, cost, approvals, policy denials, robot heartbeat and safety events.
- Alerts, on-call ownership, runbooks, incident severity definitions and post-incident review.
- Canary deployments, feature flags, versioned release artifacts and tested rollback.

Acceptance:

- A simulated Gemini outage, Ollama outage, database restore and robot disconnect each follow a runbook successfully.

### M9 — L4 ODD validation and controlled rollout (Weeks 14–18+)

Implementation:

- Shadow mode: BOW recommends; human executes and labels decisions.
- Limited autonomy: only low-impact allowlisted tasks, small user/device cohort, fixed budget.
- Expand ODD one use case at a time after independent review of telemetry, incident and eval evidence.
- Publish an internal assurance case linking requirements, controls, tests and operational evidence.

Acceptance:

- 30-day canary report meets M7 SLOs with no unresolved critical safety/security incident.
- Change advisory approval is required to expand a tool permission, model or robot capability.

## 5. Backlog order for the current repository

1. Add WebSocket robot authentication and signed shop webhook tests.
2. Add `production` feature gate that disables dynamic skill execution and sandbox synthesis.
3. Implement policy decision point, approval API, idempotency store and audit event interface.
4. Replace global conversation history with session store abstraction.
5. Implement real Ollama health probe/circuit breaker and correct degraded semantics.
6. Add Postgres migration/storage adapter and encrypted backup/restore scripts.
7. Add OpenTelemetry and CI security/eval/load pipelines.
8. Integrate robot firmware E-stop/interlocks before granting autonomous actuator access.

## 6. Standards and evidence

- ISO/IEC 42001: AI management system and continual improvement.
- ISO/IEC 23894: AI risk management process.
- NIST AI RMF: Govern, Map, Measure, Manage; apply its Generative AI profile for LLM-specific risks.

These frameworks do not themselves certify an arbitrary “Level 4 agent”. They provide the governance, risk and evidence structure needed to make a bounded autonomy claim credible.
