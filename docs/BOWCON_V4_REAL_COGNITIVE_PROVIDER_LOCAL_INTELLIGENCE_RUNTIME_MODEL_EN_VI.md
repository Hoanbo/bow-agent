# BOWCON V4.0 — REAL COGNITIVE PROVIDER & LOCAL INTELLIGENCE RUNTIME MODEL (EN/VI)
# MÔ HÌNH NHÀ CUNG CẤP NHẬN THỨC THỰC TẾ VÀ MÔI TRƯỜNG THỰC THI TRÍ TUỆ BẢN ĐỊA BOWCON V4.0

**Milestone Identifier**: MS-1.3.32  
**Package Version**: `@bow/agent@4.0.0`  
**Authoritative Scope**: Cognitive Provider Abstraction, Ollama Integration, Circuit-Breaking Fallback Hierarchy, Multi-Turn Context Reconstruction, 13-Class Intent Understanding, Structured Planning & Decision Governance, Zero-Trust Tool Boundaries.

---

## 1. Architecture Overview / Tổng quan Kiến trúc

### English
Milestone **MS-1.3.32** upgrades the BOWCON Brain from simple keyword heuristic parsing to a **real, tiered Cognitive Provider and Local Intelligence Runtime**. The Brain now integrates real local Large Language Models (specifically local Ollama instances at `http://127.0.0.1:11434`) while maintaining absolute zero-trust execution authority boundaries. The cognitive provider serves strictly as an intelligence advisor and plan proposer; it **never** directly executes tools, never bypasses policy decision points (PDP), and never mutates durable state without independent verification.

```
+-------------------------------------------------------------------------------+
|                       BOWCON BRAIN COGNITIVE PIPELINE                         |
+-------------------------------------------------------------------------------+
|                                                                               |
|   1. User Request (Text / Voice Transcript / System Directive)                |
|           |                                                                   |
|   2. Input Normalization & Secret Redaction (Fail-Closed Sanitizer)           |
|           |                                                                   |
|   3. Multi-Turn Context Reconstruction (Pronoun & Entity Resolution)          |
|           |                                                                   |
|   4. Intent Understanding (13 Authoritative Semantic Categories)              |
|           |                                                                   |
|   5. Structured Prompt Assembly (System / Policy / Capability Segregation)    |
|           |                                                                   |
|   6. Cognitive Provider Invocation (Local Real -> Ollama -> Fallback)         |
|           |                                                                   |
|   7. Structured Reasoning Summary & Risk Estimation                           |
|           |                                                                   |
|   8. Structured Plan Proposal (Stepwise Actions & Capabilities)               |
|           |                                                                   |
|   9. Decision Formulation (Eligibility, Approval Requirement, Risk Level)     |
|           |                                                                   |
|   10. Hand-off to Authoritative Brain Governance (PDP -> Tool -> Verify)      |
+-------------------------------------------------------------------------------+
```

### Tiếng Việt
Cột mốc **MS-1.3.32** nâng cấp Bộ não BOWCON từ bộ phân tích ngữ nghĩa thô sơ thành **Môi trường Nhận thức Trí tuệ Bản địa Đa tầng Thực tế**. Bộ não kết nối với mô hình ngôn ngữ cục bộ (cụ thể là Ollama daemon tại `http://127.0.0.1:11434`) nhưng vẫn duy trì tuyệt đối ranh giới kiểm soát Zero-Trust. Nhà cung cấp nhận thức thuần túy đóng vai trò cố vấn thông minh và đề xuất kế hoạch; **tuyệt đối không** trực tiếp thực thi công cụ, không bỏ qua điểm kiểm soát chính sách (PDP), và không ghi nhận trạng thái bền vững nếu chưa qua xác minh độc lập.

---

## 2. Provider Abstraction / Trừu tượng hóa Nhà cung cấp

### English
The `CognitiveProvider` contract defines the uniform interface for all intelligence backends:
- `readonly providerType: 'local-real' | 'ollama' | 'deterministic-fallback'`
- `readonly providerName: string`
- `readonly modelName: string`
- `healthCheck(): Promise<CognitiveHealthStatus>`
- `process(context: CognitivePromptContext, options?: CognitiveExecutionOptions): Promise<CognitiveResult>`
- `summarize(taskSummary: Record<string, unknown>): Promise<string>`
- `shutdown(): Promise<void>`

### Tiếng Việt
Hợp đồng giao diện `CognitiveProvider` định nghĩa tiêu chuẩn chung cho mọi backend trí tuệ nhân tạo: phân loại rõ ràng nhà cung cấp, kiểm tra sức khỏe động, xử lý ngữ cảnh đa phần có kiểm duyệt, sinh kết quả nhận thức cấu trúc `CognitiveResult`, tóm tắt tác vụ và đóng tài nguyên an toàn.

---

## 3. Ollama Provider Integration / Tích hợp Nhà cung cấp Ollama

### English
The `OllamaProvider` establishes genuine HTTP wire communication with the configured local daemon:
- **Base URL**: `BRAIN_OLLAMA_BASE_URL` (defaults to `http://127.0.0.1:11434`).
- **Model**: `BRAIN_OLLAMA_MODEL` (defaults to `qwen2.5:7b` or installed models).
- **Timeout**: `BRAIN_OLLAMA_TIMEOUT_MS` (defaults to 3000ms with failover).
- **Endpoints Utilized**:
  - `GET /api/tags`: Probes daemon liveness, latency, and catalog of pulled models.
  - `POST /api/generate`: Sends structured JSON prompts with `stream: false`, temperature calibration, and token limits.
  - `POST /api/chat`: Multi-turn message sequence completions.
- **Fail-Closed Honesty**: If the daemon is offline, times out, or returns an error, it is classified under the failure taxonomy and never faked.

### Tiếng Việt
`OllamaProvider` thiết lập kết nối HTTP thực tế với tiến trình Ollama cục bộ qua các cổng API chuẩn (`/api/tags`, `/api/generate`), hỗ trợ cấu hình linh hoạt qua biến môi trường. Tuyệt đối trung thực: nếu daemon ngoại tuyến hoặc lỗi, hệ thống kích hoạt hạ cấp công khai chứ không bao giờ giả mạo phản hồi mô hình.

---

## 4. Fallback Hierarchy & Circuit Breaker / Thứ bậc Dự phòng & Bộ ngắt mạch

### English
The system strictly enforces the provider priority hierarchy:
$$\text{LOCAL REAL MODEL} \longrightarrow \text{OLLAMA LOCAL MODEL} \longrightarrow \text{DETERMINISTIC LOCAL FALLBACK}$$

1. If local real / Ollama is responsive, it processes the request.
2. If Ollama fails or times out, the `CognitiveRegistry` registers a failure and activates a 30-second circuit-breaker cooldown.
3. During cooldown, subsequent requests immediately route to `DeterministicFallbackProvider` with zero network delay.
4. The fallback explicitly stamps `providerType: 'deterministic-fallback'` and `model: 'bowcon-rule-engine-v4'`.

### Tiếng Việt
Hệ thống tuân thủ thứ bậc ưu tiên: Mô hình bản địa thực tế $\rightarrow$ Mô hình Ollama $\rightarrow$ Dự phòng tất định. Bộ ngắt mạch tự động kích hoạt chế độ làm mát 30 giây khi Ollama gặp sự cố, đảm bảo các tác vụ tiếp theo phản hồi tức thì qua bộ quy tắc tất định mà không bị nghẽn mạng.

---

## 5. Offline Operation / Vận hành Ngoại tuyến (100% Offline)

### English
BOWCON requires zero external Internet access:
- **No WAN Dependency**: Operates flawlessly with Wi-Fi, Ethernet, and cellular disabled.
- **Local IPC & Storage**: Requests flow through local stdin/stdout JSONL or loopback HTTP.
- **Deterministic Independence**: Even if no LLM exists on the host machine, the rule engine provides full coverage for file creation, reads, appends, queries, and system commands.

### Tiếng Việt
BOWCON không phụ thuộc kết nối Internet. Khi tắt toàn bộ Wi-Fi và mạng dây, hệ thống vẫn khởi động bình thường, tiếp nhận chỉ thị, phân loại ý định, lập kế hoạch, kích hoạt công cụ cục bộ, xác minh và lưu vết trạng thái bền vững.

---

## 6. Cognitive Pipeline Stages / Các Giai đoạn Đường ống Nhận thức

### English
1. **Input Normalization**: Trims whitespace and runs fail-closed secret scanning.
2. **Context Reconstruction**: Resolves pronouns ("it", "that file") against durable session entity caches.
3. **Intent Understanding**: Maps user expression into 13 standardized intent categories.
4. **Prompt Construction**: Assembles multi-section prompt isolating system, policy, memory, and user data.
5. **Provider Execution**: Invokes active provider (or falls back on fault).
6. **Reasoning & Planning**: Synthesizes safe high-level reasoning summary and stepwise action sequence.
7. **Decision Formulation**: Computes risk tier, capability prerequisites, and approval gate.
8. **Governance Hand-off**: Submits proposed plan to PDP and Verification Service.

### Tiếng Việt
Đường ống 8 bước chuẩn hóa dữ liệu, giải quyết đại từ chỉ định theo lịch sử phiên, phân loại ý định, đóng gói prompt chống tiêm nhiễm, kích hoạt provider, tổng hợp tóm tắt suy luận và đề xuất kế hoạch hành động trước khi chuyển giao cho bộ máy kiểm soát PDP.

---

## 7. Intent Classification Taxonomy / Phân loại Ý định (13 Danh mục)

| Intent Category | Semantic Purpose | Recommended Capability | Risk Level |
|:---|:---|:---|:---|
| `OBSERVE` | Telemetry & telemetry monitoring | `telemetry:read` | LOW |
| `READ` | File & resource inspection | `fs:read` | LOW |
| `WRITE` | File creation & content writing | `fs:write` | MEDIUM |
| `APPEND` | Adding records / log entries | `fs:append` | MEDIUM |
| `UPDATE` | Configuration or file modification | `fs:update` | MEDIUM |
| `SEARCH` | Directory listings, indexing, search | `fs:search` | LOW |
| `ANALYZE` | Analytical reasoning & discrepancy evaluation | `cognitive:analyze` | LOW |
| `PLAN` | Strategic planning & breakdown | `cognitive:plan` | LOW |
| `DECIDE` | Trade-off decision formulation | `cognitive:decide` | LOW |
| `COMMUNICATE` | User feedback, notifications, echoing | `comm:echo` | LOW |
| `QUERY` | Information queries & state queries | `query:read` | LOW |
| `SYSTEM` | Service management, status, shutdown | `sys:status` | LOW / HIGH |
| `UNKNOWN` | Ambiguous / unclassified input | `none` | LOW (Fail-Safe) |

---

## 8. Multi-Turn Context Reconstruction / Tái tạo Ngữ cảnh Đa lượt

### English
The `ContextReconstructor` maintains session-level entity memory to resolve referential directives across turns:
- Turn 1: *"Create a file named reality_manifest.json with initial telemetry."* $\rightarrow$ records `targetEntity = reality_manifest.json`.
- Turn 2: *"Append new section to it."* $\rightarrow$ resolves "to it" to `reality_manifest.json`.
- Turn 3: *"Read that file now."* $\rightarrow$ resolves "that file" to `reality_manifest.json`.
- Session state is exportable and durable across system restarts.

### Tiếng Việt
`ContextReconstructor` duy trì thực thể được tham chiếu gần nhất trong phiên để giải quyết các đại từ như "nó", "file đó", "vào đó", giúp người dùng ra lệnh tự nhiên trong hội thoại nhiều lượt mà không cần lặp lại tên file.

---

## 9. Reasoning Summary / Tóm tắt Suy luận An toàn

### English
- **No Chain-of-Thought Leakage**: Never exposes internal raw scratchpads or hidden tokens.
- **Safe Rationale**: Produces clean, auditable high-level summaries explaining why an action was proposed.
- **Sanitized Output**: Filtered against secret patterns and adversarial injections.

### Tiếng Việt
Không làm lộ chuỗi suy luận nội bộ (chain-of-thought). Chỉ xuất tóm tắt giải trình cấp cao an toàn, phục vụ kiểm toán và hiển thị cho người dùng.

---

## 10. Planning Stage / Giai đoạn Lập Kế hoạch

### English
The planning stage outputs a structured `CognitivePlan`:
- `planId`: Durable unique identifier (`cogpln_<hex>`).
- `steps`: Array of `CognitivePlanStep` (step index, action, target entity, parameters, required capability, validation criteria).
- `estimatedRisk`: Risk tier (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`).
- **Invariant**: Plans are data structures only; they have zero direct execution authority.

### Tiếng Việt
Đề xuất kế hoạch hành động từng bước rõ ràng, bao gồm hành động, đối tượng tác động, tham số, quyền hạn yêu cầu và tiêu chí nghiệm thu. Kế hoạch thuần túy là dữ liệu, không có quyền tự kích hoạt.

---

## 11. Decision Stage / Giai đoạn Quyết định

### English
The decision output encapsulates governance prerequisites:
- `decisionType`: `PROCEED` | `REQUIRE_APPROVAL` | `REJECT` | `CLARIFY`.
- `requiresApproval`: Enforces human confirmation for dangerous actions (e.g. deletions, system modifications, critical risk).
- `executionEligibility`: Boolean flag indicating whether the proposal meets all calibration and safety checks.

### Tiếng Việt
Quyết định chỉ rõ hành động có được phép tiến hành ngay (`PROCEED`), cần phê duyệt của con người (`REQUIRE_APPROVAL`), bị từ chối (`REJECT`) hay cần làm rõ (`CLARIFY`).

---

## 12. Confidence vs. Authorization Invariant / Bất biến Độ tin cậy và Quyền hạn

$$\text{CONFIDENCE} \neq \text{AUTHORIZATION}$$
$$\text{HIGH\_CONFIDENCE} \neq \text{EXECUTION\_AUTHORITY}$$

### English
Even if a local model expresses 100% confidence ($1.0$), it can never override system policy. Destructive actions (such as file deletion or system reconfiguration) always require manual approval regardless of model confidence.

### Tiếng Việt
Độ tin cậy cao của AI không đồng nghĩa với quyền thực thi. Dù mô hình tự tin 100%, các thao tác có độ rủi ro cao vẫn bắt buộc phải qua phê duyệt của con người theo chính sách hệ thống.

---

## 13. Policy & Governance Boundaries / Ranh giới Chính sách và Quản trị

```
+-------------------+      Proposes Plan      +-------------------------+
| CognitiveProvider | ---------------------> | Brain Decision Pipeline |
+-------------------+                         +-------------------------+
                                                           |
                                                Evaluates Policy (PDP)
                                                           |
                                                           v
                                              +-------------------------+
                                              | Approval Service (Gate) |
                                              +-------------------------+
                                                           |
                                                   Executes Tool
                                                           v
                                              +-------------------------+
                                              |      ToolRegistry       |
                                              +-------------------------+
                                                           |
                                                 Verifies Checksum
                                                           v
                                              +-------------------------+
                                              |   VerificationService   |
                                              +-------------------------+
                                                           |
                                                   Durable Commit
                                                           v
                                              +-------------------------+
                                              |      CommitService      |
                                              +-------------------------+
```

---

## 14. Tool Authority Separation / Tách biệt Quyền hạn Công cụ

### English
Cognitive providers propose candidate tool names (`brain_fs_write`, `brain_fs_read`, etc.) and arguments. Only the authoritative `ToolRegistry` within the Brain process can execute filesystem or system operations.

### Tiếng Việt
Provider chỉ gợi ý công cụ và tham số; việc thực thi thuộc thẩm quyền duy nhất của `ToolRegistry` dưới sự kiểm soát của tiến trình Brain.

---

## 15. Failure Taxonomy & Classification / Phân loại Sự cố Nhà cung cấp

| Failure Code | Cause | Recoverable? | Action |
|:---|:---|:---:|:---|
| `PROVIDER_UNAVAILABLE` | Daemon offline, ECONNREFUSED | Yes | Circuit-breaker cooldown, activate fallback |
| `PROVIDER_TIMEOUT` | Request exceeded deadline | Yes | Circuit-breaker cooldown, activate fallback |
| `PROVIDER_INVALID_RESPONSE` | Non-200 HTTP response | Yes | Activate fallback, record audit event |
| `PROVIDER_MALFORMED_OUTPUT` | Non-JSON or corrupt schema | Yes | Activate fallback, log corrupt payload |
| `PROVIDER_AUTH_FAILURE` | HTTP 401 / 403 credentials error | Yes | Report degraded health, activate fallback |
| `PROVIDER_RATE_LIMITED` | HTTP 429 backpressure | Yes | Backoff and retry or fallback |
| `PROVIDER_PROTOCOL_ERROR` | Connection reset or socket drop | Yes | Re-establish connection or fallback |
| `PROVIDER_INTERNAL_ERROR` | Unhandled exception in provider | Yes | Fail-closed recovery, preserve service PID |

---

## 16. Persistence & Restart Recovery / Độ bền vững và Khôi phục sau Khởi động lại

### English
- All session turns and referenced entities serialize into durable JSON storage.
- When BrainService restarts, durable state, previous request counts, and completed task IDs are reloaded.
- Subsequent requests correctly recognize previously referenced files.

### Tiếng Việt
Dữ liệu ngữ cảnh phiên và trạng thái bền vững được lưu trữ nguyên tử. Khi khởi động lại dịch vụ Brain, toàn bộ lịch sử và thực thể tham chiếu được phục hồi nguyên vẹn.

---

## 17. Request Idempotency / Tính Bất biến (Idempotency)

### English
If a request is submitted with an existing `requestId`, the cognitive pipeline returns the cached `CognitiveResult` without re-invoking the provider or re-generating traces.

### Tiếng Việt
Xử lý lặp lại cùng một `requestId` sẽ trả về kết quả đã ghi nhớ mà không kích hoạt tính toán lại hay phát sinh hiệu ứng phụ.

---

## 18. Security Audit & Injection Defense / Kiểm toán Bảo mật và Chống Tiêm nhiễm

### English
- **Secret Redaction**: Automatically scrubs RSA/EC private keys, GitHub tokens, Slack tokens, 256-bit hex keys, and passwords, replacing them with `[REDACTED_SECRET]`.
- **Prompt Injection Neutralization**: Detects directives like "ignore previous instructions", "reveal system prompt", and "developer mode", wrapping adversarial text as untrusted data.
- **Zero Forbidden Primitives**: No `eval`, no `new Function`, no production `child_process`, no `Math.random`.

### Tiếng Việt
Hệ thống tự động che giấu khóa bí mật và mã định danh nhạy cảm, vô hiệu hóa các câu lệnh tấn công tiêm nhiễm prompt, và tuân thủ tuyệt đối quy tắc không sử dụng các hàm nguy hiểm.

---

## 19. Reality Testing / Thử nghiệm Thực tế

### English
The reality gate `tests/test_v4_agent_real_cognitive_provider.ts` validates actual execution across 29 categories:
- Real Ollama probe hitting port 11434.
- Real filesystem write verified with independent `node:fs` calls.
- PID continuity across 5 sequential requests on a single process.
- Restart recovery loading durable request state.
- Zero touch of `C:\BOW\shopofbow`.

### Tiếng Việt
Bộ kiểm thử thực tế xác nhận kết nối thật tới Ollama, thao tác ghi file thật và xác minh độc lập bằng `node:fs`, duy trì PID liên tục qua 5 yêu cầu, và bảo toàn cách ly tuyệt đối với workspace bảo vệ.

---

## 20. Hardware Independence / Độc lập Phần cứng

### English
The cognitive provider architecture functions identically on:
1. Multi-socket Dual-Xeon Brain servers.
2. Single-chip workstations and desktop machines.
Resource constraints (memory, timeout, threads) adjust dynamically without altering cognitive invariants.

### Tiếng Việt
Kiến trúc nhận thức vận hành đồng nhất trên cả máy chủ Dual-Xeon đa luồng lẫn máy trạm đơn chip thông thường, chỉ thay đổi giới hạn tài nguyên mà không thay đổi cấu trúc mã nguồn.

---

## 21. Deployment Guidelines / Hướng dẫn Triển khai

```bash
# 1. Start Ollama with desired model (Optional, fallback is automatic)
ollama run qwen2.5:7b

# 2. Run Brain Service with Cognitive Runtime
node scripts/run-brain-service.mjs

# 3. Configure environment (Optional)
set BRAIN_OLLAMA_BASE_URL=http://127.0.0.1:11434
set BRAIN_OLLAMA_MODEL=qwen2.5:7b
set BRAIN_OLLAMA_TIMEOUT_MS=3000
```

---

## 22. Limitations / Giới hạn Kỹ thuật

1. **Local Model Latency**: Cold-start loading of 7B+ GGUF models into GPU/RAM may take several seconds on initial query.
2. **Context Window Bounding**: Bounded to last 20 conversation turns to prevent context exhaustion.

---

## 23. Known Non-Goals / Các Mục tiêu Không Thuộc Phạm vi

- **External Mobile / Robot / UI Integration**: Out of scope for MS-1.3.32 (connected in later surface milestones).
- **Public Cloud LLM Dependencies**: System must never require OpenAI, Anthropic, or external Internet APIs to function.
- **Model Training / Fine-Tuning**: BOWCON consumes existing pre-trained local weights; it does not perform gradient updates.
