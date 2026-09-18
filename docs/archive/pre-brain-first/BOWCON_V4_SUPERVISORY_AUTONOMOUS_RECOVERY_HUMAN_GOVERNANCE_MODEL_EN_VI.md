# BOWCON V4.0 — MS-1.3.35 ARCHITECTURAL SPECIFICATION
# REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME MODEL (EN / VI)
# MÔ HÌNH RUNTIME GIÁM SÁT PHỤC HỒI TỰ TRỊ VÀ QUẢN TRỊ CON NGƯỜI THỰC TẾ TRONG BOWCON V4.0

---

## 1. EXECUTIVE OVERVIEW / TỔNG QUAN ĐIỀU HÀNH

### English
Milestone **MS-1.3.35** establishes the **Real Supervisory Autonomous Recovery & Human Governance Runtime** for BOWCON V4.0. It evolves the agent from a passive request/response AI into a continuous, self-monitoring supervisory runtime that observes operational telemetry, detects anomalies using deterministic thresholds, diagnoses probable root causes without premature assumption, generates mutation-free recovery plans, enforces cryptographic human authorization gates for elevated actions, executes low-risk recoveries autonomously, independently verifies outcomes against the physical environment, and resumes operation.

### Tiếng Việt
Cột mốc **MS-1.3.35** thiết lập **Runtime Giám sát Phục hồi Tự trị và Quản trị Con người Thực tế** cho BOWCON V4.0. Nó nâng cấp agent từ một AI thụ động kiểu request/response thành một runtime tự trị có khả năng giám sát liên tục tình trạng hệ thống, phát hiện các bất thường thông qua ngưỡng xác định, chẩn đoán nguyên nhân gốc rễ một cách trung thực, lập kế hoạch phục hồi không gây đột biến, áp dụng cổng phê duyệt con người với token mật mã cho các hành vi rủi ro, thực thi tự trị các biện pháp an toàn, xác minh độc lập kết quả trên môi trường vật lý, và khôi phục hoạt động bình thường.

---

## 2. FUNDAMENTAL INVARIANTS / CÁC TIÊN ĐỀ BẤT BIẾN CỐT LÕI

$$\begin{aligned}
\text{LLM\_PROPOSE} &\neq \text{EXECUTE} \\
\text{CONFIDENCE} &\neq \text{AUTHORIZATION} \\
\text{DETECTION} &\neq \text{DIAGNOSIS} \\
\text{DIAGNOSIS} &\neq \text{AUTHORIZATION} \\
\text{AUTHORIZATION} &\neq \text{SUCCESS} \\
\text{VERIFICATION} &\neq \text{COMMIT} \\
\text{FAILURE} &\neq \text{BRAIN\_DEATH} \\
\mathbf{USER\_STOP} &> \mathbf{AUTONOMOUS\_EXECUTION}
\end{aligned}$$

- **`USER_STOP > AUTONOMOUS_EXECUTION`**: A user-issued `SAFE_STOP` immediately overrides and halts any autonomous execution, retry loop, or recovery plan in progress.
- **`DETECTION != DIAGNOSIS`**: Detecting an anomaly does not constitute a valid diagnosis. Evidence must be analyzed honestly, and uncertainty must be acknowledged via `DIAGNOSIS_INCONCLUSIVE`.
- **`CONFIDENCE != AUTHORIZATION`**: High diagnostic or model confidence (e.g. 0.99) never bypasses human authorization boundaries.

---

## 3. SUPERVISORY OPERATIONAL LIFECYCLE / VÒNG ĐỜI VẬN HÀNH GIÁM SÁT

```text
                         USER
                          │
                  COMMAND / AUTHORIZATION
                          │
                          ▼
                    ┌───────────┐
                    │   BRAIN   │
                    └─────┬─────┘
                          │
                    COGNITIVE PIPELINE
                          │
                          ▼
                 SUPERVISORY RUNTIME
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
       OBSERVE         DETECT           DIAGNOSE
          │               │                │
          └───────────────┼────────────────┘
                          ▼
                    DECISION ENGINE
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
        GOVERNED AUTO          HUMAN GATE
          RECOVERY             REQUIRED
                │                   │
                │              USER CONFIRM
                │                   │
                └─────────┬─────────┘
                          ▼
                    WORLD ACTION
                          │
                          ▼
                    CAPABILITY
                          │
                          ▼
                    REAL HOST
                          │
                          ▼
                INDEPENDENT VERIFIER
                          │
                  ┌───────┴───────┐
                  ▼               ▼
               SUCCESS          FAILURE
                  │               │
                  ▼               ▼
                RESUME         RETRY /
                               ESCALATE /
                               SAFE_STOP
```

---

## 4. 16-STATE AUTHORITATIVE STATE MACHINE / CỖ MÁY TRẠNG THÁI 16 BƯỚC

1. `INITIALIZING`: Subsystem cold boot and configuration loading.
2. `OBSERVING`: Capturing multi-domain runtime and host snapshots.
3. `HEALTHY`: Nominal operational state with zero active anomalies.
4. `ANOMALY_DETECTED`: Deterministic anomaly threshold crossed.
5. `DIAGNOSING`: Evaluating causal evidence and assessing recoverability.
6. `RECOVERY_PLANNING`: Generating mutation-free recovery steps.
7. `POLICY_EVALUATION`: Evaluating PDP constraints, risk levels, and permissions.
8. `WAITING_FOR_HUMAN`: Halting execution awaiting explicit operator approval.
9. `AUTHORIZED`: Cryptographically bound single-use token received.
10. `RECOVERING`: Executing governed recovery steps through capability adapters.
11. `VERIFYING`: Independent low-level OS and subsystem verification.
12. `RECOVERY_SUCCEEDED`: Verified physical outcome matches expectation.
13. `RECOVERY_FAILED`: Step execution or independent verification failed.
14. `ESCALATED`: Retry limit reached; escalating to human operator.
15. `SAFE_STOP`: Global emergency halt active (`USER_STOP > AUTONOMOUS_EXECUTION`).
16. `STOPPED`: Orderly shutdown completed.

---

## 5. MULTI-DOMAIN OBSERVATION / QUAN SÁT ĐA TẦNG THỰC TẾ

The observation engine gathers telemetry from genuine host and runtime systems:
- **Process Health**: Genuine `process.pid`, memory RSS in megabytes, uptime in seconds.
- **Host Health**: Genuine CPU cores (`os.cpus().length`), free RAM (`os.freemem()`), platform, network status.
- **Capability Health**: Total, available, degraded, and unavailable capability counts from `GovernedCapabilityRegistry`.
- **Cognitive Health**: Active provider classification (`local-real`, `ollama`, `deterministic-fallback`), circuit-breaker status, availability.
- **WorldAction Health**: Emergency stop state, active locks, failed actions.

---

## 6. RECOVERY BOUNDARIES & HUMAN GATING / RANH GIỚI PHỤC HỒI & CỔNG CON NGƯỜI

| Recovery Class | Autonomous Execution | Requirements | Examples |
|---|:---:|---|---|
| **`AUTO_SAFE`** | **YES** | Non-destructive, idempotent, verified | Re-probe capability, reconnect Ollama provider, refresh telemetry snapshot, release stale lock. |
| **`AUTO_REVERSIBLE`** | **YES** | Governed rollback declared and verified | Restart governed child process with independent PID verification and rollback handler. |
| **`HUMAN_REQUIRED`** | **NO** | Explicit cryptographic single-use token | File deletion, configuration mutation, security policy update, irreversible actions. |
| **`CRITICAL_BLOCKED`** | **NO** | Strictly blocked by policy | Protected workspace incursions (`C:\BOW\shopofbow`), shell injection, unallowlisted binaries. |

---

## 7. BOUNDED RETRIES & ESCALATION / GIỚI HẠN THỬ LẠI VÀ LEO THANG

- Every recovery plan is assigned an explicit, bounded retry ceiling (`maxAttempts: 3`).
- Infinite retry loops (`while(true) retry`) are forbidden by architecture.
- If attempts exceed the maximum retry count, the supervisor automatically halts retries, logs the escalation record, and transitions to state `ESCALATED`.

---

## 8. SAFE_STOP & OPERATOR RESET / DỪNG AN TOÀN VÀ ĐẶT LẠI

- Any call to `safeStop(reason)` activates `SAFE_STOP` immediately, superseding all running recovery plans and cancelling pending human gate requests.
- Recovery execution, planning, and retries are completely blocked while `SAFE_STOP` is active.
- To resume operations, an explicit non-empty operator authorization token must be supplied to `resetSafeStop(operatorToken)`.

---

## 9. APPEND-ONLY AUDIT LEDGER / NHẬT KÝ KIỂM TOÁN NỐI DÀI

Every supervisory event produces an audit entry with:
- Chained 64-character SHA-256 `previousHash` digests.
- SHA-256 payload hash of scrubbed data.
- Recursive secret redaction: sensitive credentials, private keys, authorization tokens, and passwords are unconditionally replaced with `[REDACTED_SECRET]`.

---

## 10. REALITY GATE VERIFICATION / KẾT QUẢ KIỂM THỬ THỰC TẾ

Test Suite: `tests/test_v4_agent_supervisory_autonomous_recovery.ts`
- **40 Categories (A through AN)**
- **169 Assertions PASSED, 0 FAILED (100%)**
- Full regression: **37 / 37 test suites passed** cleanly.
