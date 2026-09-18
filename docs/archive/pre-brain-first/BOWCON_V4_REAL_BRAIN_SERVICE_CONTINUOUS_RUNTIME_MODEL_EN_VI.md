# BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME MODEL (EN / VI)
# MÔ HÌNH DỊCH VỤ BRAIN THỰC & RUNTIME LIÊN TỤC BOWCON V4.0

============================================================
## 1. ARCHITECTURAL OVERVIEW / TỔNG QUAN KIẾN TRÚC
============================================================

### EN:
Milestone **MS-1.3.31** establishes the authoritative **BOWCON Brain Service & Continuous Runtime**. It transforms the cognitive foundation from MS-1.3.30 into an autonomous, long-running, process-level service capable of executing genuine local operations, maintaining continuous multi-request runtime coherence, surviving recoverable failures, atomically persisting state across process restarts, and gracefully shutting down.

Crucially, MS-1.3.31 maintains strict architectural boundaries:
- **Zero External Network Exposure**: The Brain Service does not expose public or local network listening ports (no HTTP/WebSocket endpoints). Communication is strictly local IPC (standard input/output streams via JSONL).
- **Single Authoritative Brain**: The Brain Service hosts and orchestrates the single authoritative Brain; it does NOT become a second planning engine or duplicate cognitive authority.
- **Hardware Deployment Independence**: The same Brain Service runs on Dual-Chip Xeon Brain Servers or 1-Chip Workstations without modifying cognitive logic.

### VI:
Cột mốc **MS-1.3.31** thiết lập **Dịch vụ Brain Thực & Runtime Liên Tục BOWCON**. Cột mốc này chuyển hóa nền tảng nhận thức từ MS-1.3.30 thành một tiến trình dịch vụ chạy nền độc lập, có khả năng thực thi các tác vụ thực tế tại chỗ, duy trì tính nhất quán qua nhiều yêu cầu liên tiếp, tự phục hồi sau lỗi có thể khắc phục, lưu trữ trạng thái nguyên tử qua các lần khởi động lại và tắt an toàn.

Các ranh giới kiến trúc cốt lõi:
- **Không mở cổng mạng bên ngoài**: Dịch vụ Brain không mở cổng lắng nghe mạng (không có HTTP/WebSocket). Giao tiếp hoàn toàn qua IPC nội bộ (dòng vào/ra chuẩn JSONL qua stdin/stdout).
- **Một Não bộ Thẩm quyền Duy nhất**: Dịch vụ Brain lưu trữ và điều phối Brain thẩm quyền duy nhất; nó KHÔNG trở thành động cơ lập kế hoạch thứ hai và KHÔNG nhân bản thẩm quyền nhận thức.
- **Độc lập Phần cứng**: Cùng một kiến trúc Brain Service chạy trên Máy chủ Dual Xeon hoặc Máy trạm 1-Chip mà không cần thay đổi logic nhận thức.

```
+-------------------------------------------------------------------------+
|                    LOCAL OS PROCESS (run-brain-service.mjs)              |
|                                                                         |
|   stdin (JSONL Requests) ──► [ Request Validator & Sanitizer ]          |
|                                         │                               |
|                                         ▼                               |
|   [ Idempotency Cache ] ◄─── [ Serialized Queue & Backpressure ]        |
|                                         │                               |
|                                         ▼                               |
|   +-----------------------------------------------------------------+   |
|   |                  AUTHORITATIVE BRAIN RUNTIME                    |   |
|   |                                                                 |   |
|   |   Understanding ──► Reasoning ──► Planning ──► Decision         |   |
|   |                                                   │             |   |
|   |   Commit ◄─── Verification ◄─── Tool Execution ◄──┘             |   |
|   |     │               │                 │                         |   |
|   |     ▼               ▼                 ▼                         |   |
|   |  [Durable     [Independent       [Governed                      |   |
|   |   Commit]      Verifier]       Real Tools]                      |   |
|   +-----------------------------------------------------------------+   |
|                                         │                               |
|                                         ▼                               |
|   stdout (JSONL Responses) ◄── [ Response Formatter & Telemetry ]      |
|                                         │                               |
|                                         ▼                               |
|   [ Durable State: brain_service_state.json ] ◄── Atomic Commit        |
+-------------------------------------------------------------------------+
```

============================================================
## 2. PROCESS LIFECYCLE & 16-STATE FINITE STATE MACHINE / VÒNG ĐỜI TIẾN TRÌNH
============================================================

### EN:
The Brain Service operates under a strict, fail-closed 16-state lifecycle model:
1. `CREATED`: Initial memory allocation; configuration resolved.
2. `INITIALIZING`: Tool registry bindings and singleton validations.
3. `LOADING_STATE`: Reading and validating durable state from disk via `DurableJsonStore`.
4. `READY`: Service is resting and ready to accept incoming requests.
5. `RECEIVING`: Request envelope received and structurally validated.
6. `PROCESSING`: Request dequeued and passed to worker execution.
7. `PLANNING`: Cognitive loop formulating execution plan.
8. `EXECUTING`: PDP-governed tool execution performing real work.
9. `VERIFYING`: Independent verification of execution outcomes.
10. `COMMITTING`: Durable commit of results and memory mutations.
11. `RESPONDING`: Outbound response envelope serialized to stdout.
12. `DEGRADED`: Transient errors or elevated backpressure detected.
13. `RECOVERING`: Recovery orchestrator resetting cognitive loop to clean state.
14. `SHUTTING_DOWN`: Draining queue, flushing state and audit records.
15. `STOPPED`: Terminal clean state; process exit code 0.
16. `FAILED`: Fatal unrecoverable error encountered.

### VI:
Dịch vụ Brain vận hành theo mô hình máy trạng thái 16 bước đóng-an-toàn (fail-closed):
Mọi bước chuyển trạng thái trái phép đều bị từ chối và ghi vết kiểm toán. Lỗi nhận thức không bao giờ trực tiếp dẫn tới sụp đổ tiến trình trừ khi thuộc loại lỗi nghiêm trọng (FATAL).

```
CREATED ──► INITIALIZING ──► LOADING_STATE ──► READY ◄──────────┐
                                                 │              │
                                                 ▼              │
                                             RECEIVING          │
                                                 │              │
                                                 ▼              │
                                             PROCESSING         │
                                                 │              │
                                                 ▼              │
                                             PLANNING           │
                                                 │              │
                                                 ▼              │
                                             EXECUTING          │
                                                 │              │
                                                 ▼              │
                                             VERIFYING          │
                                                 │              │
                                                 ▼              │
                                             COMMITTING         │
                                                 │              │
                                                 ▼              │
                                             RESPONDING ────────┘
                                                 │
                                                 ▼ (on recoverable error)
                                             RECOVERING ──► READY
                                                 │
                                                 ▼ (on shutdown)
                                            SHUTTING_DOWN ──► STOPPED
```

============================================================
## 3. CARDINAL INVARIANTS / CÁC BẤT BIẾN CỐT LÕI
============================================================

1. `ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN`
   Exactly one cognitive brain instance exists. Brain Service hosts it; it does not replace it.
2. `BRAIN_SERVICE != BRAIN`
   The service provides process and request infrastructure. It does not think.
3. `SERVICE_PROCESS != COGNITIVE_AUTHORITY`
   Process lifecycle manages operating system resources; cognitive authority governs actions.
4. `REQUEST != BRAIN_RESTART`
   Requests execute continuously without recreating Brain instances.
5. `SESSION != BRAIN_INSTANCE`
   Sessions are interaction contexts; the Brain is a persistent universal intelligence.
6. `TASK != PROCESS`
   Tasks are atomic cognitive loop cycles; the service process remains persistent.
7. `DUPLICATE_REQUEST != DUPLICATE_EXECUTION`
   Idempotency guarantees that committed operations never duplicate real-world side effects.
8. `FAILURE != BRAIN_DEATH`
   Recoverable execution failures do not terminate the service process.
9. `RECOVERABLE_FAILURE != SERVICE_TERMINATION`
   The service recovers to READY and accepts subsequent requests.

============================================================
## 4. LOCAL REQUEST MODEL & IPC / MÔ HÌNH YÊU CẦU NỘI BỘ
============================================================

### EN:
The Brain Service uses standard input/output line-delimited JSON (JSONL) as its local IPC mechanism:
- **Input Pipe (`process.stdin`)**: Accepts single-line JSON request envelopes.
- **Output Pipe (`process.stdout`)**: Emits single-line JSON response envelopes and system signals (`SERVICE_READY`, `SERVICE_STOPPED`).
- **Request Envelope Format**:
  ```json
  {
    "requestId": "req_1788880000_abcd",
    "sessionId": "sess_local_user",
    "deviceContext": { "deviceId": "dev_workstation_01" },
    "timestamp": 1788880000000,
    "input": {
      "userText": "Create file 'reality/manifest.txt' with content: READY"
    }
  }
  ```
- **Response Envelope Format**:
  ```json
  {
    "requestId": "req_1788880000_abcd",
    "sessionId": "sess_local_user",
    "success": true,
    "result": {
      "taskId": "task_1788880000_1234",
      "success": true,
      "summary": "Task completed successfully",
      "verificationStatus": "VERIFIED",
      "completedAt": 1788880000500,
      "totalDurationMs": 500,
      "iterationCount": 1
    },
    "health": "READY",
    "queueStatus": "IDLE",
    "durationMs": 500,
    "timestamp": 1788880000500
  }
  ```

### VI:
Giao thức IPC nội bộ sử dụng JSON phân tách bằng dòng mới (JSONL) trên stdin/stdout:
- Đảm bảo độ trễ tối thiểu (zero socket overhead).
- Không cần cấp phát cổng mạng, không bị xung đột port trên máy chủ.
- Chạy được 100% khi ngắt hoàn toàn Internet, Wi-Fi, Ethernet và mạng di động.

============================================================
## 5. REAL FILESYSTEM EXECUTION & REALITY GATE / THỰC THI FILESYSTEM THỰC
============================================================

### EN:
The Brain Service demonstrates true executable behavior:
1. Brain receives instruction via standard input.
2. Cognitive loop plans execution with `DeterministicBrainModelProvider` or `OllamaModelProvider`.
3. Action policy is evaluated against `PolicyDecisionPoint` (PDP).
4. Authorized tool (`brain_fs_write`, `brain_fs_read`, `brain_fs_append`) executes in `data/brain/reality/`.
5. Real file is created, read, and modified on the physical storage device.
6. Verification stage confirms actual state before commit.
7. Result is committed and durable service state updated.

Independent verification in tests directly inspects the filesystem using `node:fs` (`existsSync`, `readFileSync`, `statSync`, `crypto.createHash`) to ensure test success reflects real external reality, not mock state.

### VI:
Dịch vụ Brain chứng minh hành vi thực thi thực tế:
Tất cả các thao tác file đều diễn ra trên ổ đĩa vật lý trong không gian làm việc `data/brain/reality/`. Các bài kiểm thử Reality Gate xác minh độc lập bằng cách đọc trực tiếp filesystem thay vì tin vào cờ nội bộ của Brain.

============================================================
## 6. DURABLE STATE PERSISTENCE & CRASH RECOVERY / LƯU TRỮ TRẠNG THÁI BỀN VỮNG
============================================================

### EN:
Durable persistence is powered by `DurableJsonStore`:
- **Atomic Writes**: Writes to temporary file and atomically replaces target file via rename.
- **Crash Consistency**: Power loss during write leaves previous valid state intact.
- **Schema Validation**: State is validated on read and write against `validateBrainServiceState`.
- **Durable File**: `data/brain-service/brain_service_state.json`.
- **Persisted Attributes**:
  - `serviceId`: Unique service instance ID.
  - `brainId`: Authoritative Brain ID.
  - `totalRequestsReceived`: Cumulative count.
  - `totalRequestsCompleted`: Cumulative count.
  - `totalRequestsFailed`: Cumulative count.
  - `completedRequestIds`: Set of executed request IDs for durable idempotency.
  - `lastCommittedAt`: Timestamp of last commit.

### VI:
Lưu trữ trạng thái bền vững được đảm bảo bởi `DurableJsonStore`:
Ghi nguyên tử (atomic write) qua file tạm ngăn chặn hoàn toàn tình trạng file bị hỏng nửa chừng khi mất điện hoặc tắt đột ngột. Khi khởi động lại, dịch vụ nạp lại toàn bộ lịch sử idempotency và số lượng request đã hoàn thành.

============================================================
## 7. HARDWARE INDEPENDENT DEPLOYMENT / TRIỂN KHAI ĐỘC LẬP PHẦN CỨNG
============================================================

The Brain Service supports environment-driven configuration:
- `BRAIN_HOST_MODE`: `server` (e.g. Dual Xeon) or `workstation` (1-chip machine).
- `BRAIN_DATA_DIR`: Base directory for durable state and reality operations.
- `BRAIN_SERVICE_MODE`: `standalone` (CLI process), `embedded`, or `worker`.

Hardware determines available queue depths and concurrency thresholds (e.g. queue size 200 on Server vs 50 on Workstation).
Hardware does **NOT** determine Brain identity or cognitive architecture.

============================================================
## 8. REALITY STATUS MATRIX / MA TRẬN TÍNH THỰC TẾ
============================================================

| Component | Status | Verification Evidence |
|-----------|--------|----------------------|
| `brainServiceTypes.ts` | REAL | Complete types, contracts, and deterministic ID generators |
| `brainServiceStates.ts` | REAL | 16 fail-closed lifecycle states and predicates |
| `brainServiceTransitions.ts` | REAL | Validated finite state transition matrix |
| `brainServiceFailure.ts` | REAL | Strongly-typed error hierarchy and classification |
| `brainServiceConfig.ts` | REAL | Deployment configuration with environment bindings |
| `brainServicePersistence.ts` | REAL | Atomic JSON store integration, schema validation |
| `brainServiceRequest.ts` | REAL | Inbound envelope validation and sanitization |
| `brainServiceResponse.ts` | REAL | Outbound envelope builder and serializer |
| `brainServiceAudit.ts` | REAL | Append-only audit ledger with recursive secret redaction |
| `brainServiceHealth.ts` | REAL | Dynamic health monitoring and telemetry |
| `brainServiceQueue.ts` | REAL | Serialized queue management and backpressure control |
| `brainServiceRecovery.ts` | REAL | Failure classification and loop reset recovery |
| `brainServiceShutdown.ts` | REAL | Graceful multi-step shutdown coordinator |
| `brainServiceWorker.ts` | REAL | Cognitive pipeline orchestration and idempotency |
| `brainServiceLifecycle.ts` | REAL | Service lifecycle state machine and bootstrap |
| `brainServiceRegistry.ts` | REAL | Single Brain authority registration and session store |
| `brainServiceRuntime.ts` | REAL | Master service runtime orchestrator |
| `brainService.ts` | REAL | Public facade exposing unified API |
| `scripts/run-brain-service.mjs` | REAL | Executable standalone process with stdin/stdout JSONL |
| Remote Wire / Internet Edge | PARTIAL | Outer transport layers implemented in MS-1.3.28/29 |
| LLM Remote Models | PARTIAL | Deterministic provider real; Ollama real when running |
| Mobile / Robot / Voice Surface | MOCK / EXCLUDED | Strictly excluded from MS-1.3.31 per mandate |
