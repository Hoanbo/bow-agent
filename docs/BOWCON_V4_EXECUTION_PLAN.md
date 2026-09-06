# BOWCON V4 — Kế hoạch triển khai phối hợp

## Mục tiêu phát hành

Đưa BOWCON đến **L4 trong Operational Design Domain (ODD) có kiểm soát**: trợ lý vận hành Shop of BOW, desktop có giám sát và robot bàn làm việc. Đây không phải tuyên bố AGI. Mọi hành động có side effect phải bị chặn bởi policy, approval, idempotency, audit và kill switch.

Tiêu chí hoàn thành của một release:

- Mọi request/tool có side effect đi qua một điểm quyết định policy duy nhất.
- Tác vụ high-impact chỉ chạy bằng approval còn hạn và token một lần.
- Robot/desktop có trạng thái an toàn, kill switch hiển thị rõ và không được xem là an toàn chỉ vì LLM nói vậy.
- UI không tự động thực thi hành động rủi ro; chỉ hiển thị thông tin, tạo approval và gửi token hợp lệ.
- Typecheck và toàn bộ regression suite xanh trước handoff; test mới phủ các nhánh deny, replay và expiry.

Nguồn yêu cầu chi tiết: `docs/BOWCON_L4_ROADMAP.md`, `docs/autonomy-charter.md`, `docs/risk-register.md`.

## Quy ước phối hợp bắt buộc

1. Trước khi sửa: chạy `git status --short` và đọc `git diff -- <file liên quan>`.
2. Không sửa file thuộc ownership của agent kia nếu chưa có handoff rõ ràng.
3. Mỗi handoff ghi: thay đổi, API/contract liên quan, test đã chạy, rủi ro/tồn đọng.
4. Trước merge: agent còn lại review `git diff`, contract và regression trong phạm vi của mình.
5. Không commit/revert/format hàng loạt thay đổi chưa sở hữu.

## Ownership

| Phạm vi | Owner | Các khu vực chính | Không làm |
|---|---|---|---|
| UX, dashboard, trạng thái realtime, accessibility, action/approval flows | Antigravity | ứng dụng frontend hiện hữu; assets/component/style; client API wrapper | Không đổi policy, server, safety controller, backend test |
| API, policy/approval/idempotency/audit, auth, safety, persistence, test/CI | Codex | `src/server.ts`, `src/core/**`, `src/embodied/**`, `src/production/**`, `src/contracts/**`, `tests/**` | Không đổi layout, component/style/frontend routing |
| Contract chia sẻ | Cả hai, theo thứ tự Codex đề xuất → Antigravity xác nhận | request/response schema, error codes, realtime event names | Không phá vỡ field đã public mà không version hóa |

## Mốc triển khai

### Mốc A — Contract và baseline an toàn

**Codex**

- Review thay đổi V4 hiện có trong policy decision point và robot safety controller.
- Chuẩn hóa các contract: `PolicyDecision`, `ApprovalRecord`, `AuditEvent`, `SafetyState`, lỗi `FORBIDDEN`, `APPROVAL_REQUIRED`, `IDEMPOTENCY_CONFLICT`, `KILL_SWITCH_ACTIVE`.
- Viết/hoàn thiện test deny-by-default, action classification và kill switch.

**Antigravity**

- Chỉ phân tích UI hiện có và tạo wireframe/plan, chưa sửa code ở mốc này.
- Xác định màn hình tối thiểu: Operations overview, Approval queue, Audit timeline, Robot safety status, Model health.
- Liệt kê API/event cần dùng cùng trạng thái loading/empty/error/permission-denied.

**Exit criteria**

- Có contract document/API inventory được cả hai xác nhận.
- Không có UI/API nào diễn giải một policy denial là thành công.

### Mốc B — Backend trust plane

**Codex**

- Bảo vệ webhook Shop bằng HMAC, timestamp, nonce replay protection và test adversarial.
- Xác thực robot/desktop WebSocket ngay khi handshake; từ chối session không xác thực.
- Enforce policy trước mọi tool/action side effect.
- Tạo approval expiry/revocation/one-time execution token, idempotency store và audit append-only interface.
- Expose read-only API/event contracts cho policy status, approval queue, audit, kill switch, robot/model health.

**Antigravity**

- Không bắt đầu code UI cho tới khi Codex công bố request/response schema và fixture an toàn.

**Exit criteria**

- Request replay, token hết hạn, approval bị revoke và action bị kill-switched đều bị từ chối bằng test.
- Không có privileged tool path bypass policy.

### Mốc C — Control-room frontend

**Antigravity**

- Triển khai dashboard theo contract đã khóa: hiển thị policy result, approval queue/audit, health và trạng thái kill switch.
- Flow high-impact phải yêu cầu người dùng xem action summary trước khi request approval; không gửi execution token tự động.
- UI robot hiển thị hardware E-stop/heartbeat/interlock riêng với trạng thái LLM/network; accessibility và responsive states đầy đủ.
- Dùng dữ liệu mock/fixture do Codex cung cấp; không thay đổi backend schema tự phát.

**Codex**

- Hỗ trợ fixture/test endpoint nếu cần, review client usage đối với auth, error code, expiry và idempotency.
- Không thay đổi component/style.

**Exit criteria**

- UI minh bạch trạng thái an toàn; không cho phép thao tác nguy hiểm khi API trả denial/approval required.

### Mốc D — Resilience và vận hành

**Codex**

- Health probe thật cho Gemini/Ollama, timeout/circuit breaker/backpressure và degraded semantics.
- Session-scoped memory, retention/access boundary và test isolation.
- Observability: request/correlation ID, redacted logs, metrics/traces; security, load và chaos test nền.

**Antigravity**

- Thể hiện rõ healthy/degraded/unavailable, cost/latency/budget và audit correlation ID; không biến degraded thành “AI đang suy luận thành công”.

**Exit criteria**

- Outage model/network chuyển về safe degraded behavior và Control Room phản ánh đúng.

### Mốc E — Canary readiness

**Cả hai**

- Codex chạy regression/security/eval; Antigravity kiểm UI flows và accessibility.
- Cùng review diff cuối theo ownership và checklist rủi ro.
- Chỉ bật limited autonomy cho các action reversible, allowlisted, có telemetry, quota và rollback.

**Exit criteria**

- Bằng chứng test/eval, runbook, owner/on-call và rollback rõ ràng trước canary.

## API handoff tối thiểu cho frontend

Antigravity không giả định endpoint cụ thể trước khi Codex xác nhận. Các capability cần có:

| Capability | Read model tối thiểu | Command an toàn |
|---|---|---|
| Policy | decision, classification, reason, correlationId | không có bypass |
| Approval | id, action summary, status, expiresAt, approver | create/revoke; execute chỉ với one-time token |
| Audit | timestamp, actor, tool, policy decision, result, correlationId | read-only |
| Kill switch | global/domain status, updatedAt, actor | enable/disable theo authorization; luôn confirm server-side |
| Robot safety | eStop, heartbeat, interlocks, battery/temperature, safeState | không có “override” từ UI/LLM |
| Model health | provider, healthy/degraded/unavailable, latency | read-only |

## Prompt giao cho Antigravity

> Đọc `git status --short`, `git diff`, và toàn bộ `docs/BOWCON_V4_EXECUTION_PLAN.md`. Ở Mốc A, hãy chỉ phân tích code/frontend hiện có và cập nhật hoặc tạo kế hoạch UI chi tiết; chưa sửa code. Nêu rõ file frontend sẽ sở hữu, wireframe cho Control Room, API/event dependency, accessibility states, acceptance criteria và rủi ro. Không sửa `src/server.ts`, `src/core/**`, `src/embodied/**`, `src/production/**`, `src/contracts/**`, hoặc `tests/**`. Khi xong, kiểm tra `git diff` và handoff lại cho Codex để review contract/backend.

## Prompt trở lại cho Codex sau handoff

> Đọc `git status --short`, `git diff`, `docs/BOWCON_V4_EXECUTION_PLAN.md` và plan UI vừa cập nhật. Không sửa frontend. Hoàn thiện Mốc A/B thuộc backend, viết test security/regression, chạy typecheck và suite liên quan. Báo lại API contracts/fake fixtures đã khóa để Antigravity triển khai Mốc C.
