# BOWCON V4.0 — AUTHORITATIVE ARCHITECTURE CONTRACT

**System Identity:** BOWCON V4.0  
**Status:** CANONICAL ARCHITECTURAL SPECIFICATION  
**Scope:** `@bow/agent` Core Runtime, Policy Decision Point, Memory Systems, Embodied Interfaces, Gateways, Tooling, and Governance  
**Standard Compliance:** ISO/IEC 42001 (AI Management System), ISO/IEC 23894 (AI Risk Management), NIST AI RMF, Level 4 Controlled-ODD Autonomy  

---

## 1. SYSTEM IDENTITY

**BOWCON V4.0** is an autonomous AI co-founder, computer-capable agent, and embodied robotic brain.

### Purpose
An autonomous AI agent platform capable of understanding natural language instructions in Vietnamese and English, reasoning over contextual state, selecting and routing across local and cloud intelligence models, executing privileged actions through governed tools, operating desktop computers under strict authorization boundaries, interacting with physical environments through an embodied microcontroller, maintaining layered episodic and semantic memory, learning from explicit user feedback, and safely improving its own operational capabilities without human-in-the-loop bypasses.

---

## 2. BRAIN / BODY SEPARATION

The non-negotiable architectural invariant of BOWCON is the strict physical and logical decoupling of the **Brain** from the **Body**.

```
+-------------------------------------------------------------------------+
|                              BOWCON BRAIN                               |
|                  Node.js ESM Runtime (@bow/agent)                       |
|                                                                         |
|  - Multi-Channel Ingestion     - Policy Decision Point (PDP)            |
|  - Working / Episodic Memory   - Approval & One-Time Execution Tokens   |
|  - Hybrid Model Router (LLM)   - Cryptographic Audit Ledger             |
|  - Bounded Action Planner      - Isolated Tool & Dynamic Skill Runner   |
|  - Multi-Agent Mesh            - Desktop Automation Driver              |
+-------------------------------------------------------------------------+
                                     |
               +---------------------+---------------------+
               | (WebSocket / TLS)                         | (OS Native API)
               v                                           v
+-----------------------------+             +-----------------------------+
|   EMBODIED CONTROLLER       |             |   BOWCON DESKTOP BRIDGE     |
|   (ESP32-S3 Realtime I/O)   |             |   (bow-remote-agent)        |
|                             |             |                             |
| - Servo Actuator PWM        |             | - Native Screen Capture     |
| - IMU & Sensor Ingestion    |             | - Focused Window Typing     |
| - I2S DAC / Speaker Output  |             | - Coordinate Clicking       |
| - I2S Mic / Audio Streaming |             | - Process Management        |
| - OLED Emotion Rendering    |             | - Hardware Health & Temps   |
| - Hardware Interlock / E-Stop|            | - Level 0-5 RBAC Guards     |
+-----------------------------+             +-----------------------------+
```

### 2.1 Ownership Boundaries
1. **BOWCON Brain (`@bow/agent`):**
   - Owns all reasoning, intention recognition, dialogue state, memory recall, tool governance, planning, and safety policies.
   - The primary reasoning system **must always** remain the Brain running on host compute or cloud.
2. **Embodied Controller (ESP32-S3):**
   - The ESP32-S3 microcontroller is an **embodied realtime I/O endpoint**.
   - It is responsible for low-latency motor PWM, sensor polling, audio stream transmission, OLED frame rendering, battery monitoring, and firmware-level safety cutoffs.
   - **The ESP32-S3 must NEVER become the primary LLM runtime.**
3. **BOWCON Desktop Bridge (`bow-remote-agent`):**
   - OS-level service executing permitted UI, file, and process operations under explicit capability tokens.
4. **Web & External Clients:**
   - User interfaces (e.g., Shop of BOW, Telegram) act as ingress/egress viewports. They never bypass the Brain's central governance plane.

---

## 3. CORE AGENT LIFECYCLE (THE 16-STAGE LOOP)

Every interaction within BOWCON must traverse a deterministic, auditable 16-stage pipeline:

```
[1. USER / SENSOR INPUT]
          ↓
[2. IDENTITY & CHANNEL RESOLUTION]
          ↓
[3. INTENT CLASSIFICATION]
          ↓
[4. CONTEXT RESOLUTION]
          ↓
[5. MEMORY RETRIEVAL]
          ↓
[6. BOUNDED PLANNING]
          ↓
[7. MODEL ROUTING]
          ↓
[8. POLICY DECISION POINT (PDP)]
          ↓
[9. APPROVAL IF HIGH_IMPACT]
          ↓
[10. TOOL / SKILL EXECUTION]
          ↓
[11. OBSERVATION CAPTURE]
          ↓
[12. RESULT VERIFICATION]
          ↓
[13. MEMORY & FEEDBACK UPDATE]
          ↓
[14. CRYPTOGRAPHIC AUDIT RECORDING]
          ↓
[15. RESPONSE GENERATION]
          ↓
[16. CLIENT DELIVERY & ACTUATION]
```

### Stage Definitions
1. **Input:** Ingestion of text, audio frame, camera frame, or webhook payload.
2. **Identity & Channel:** Determination of `userId`, `role`, `channel` (`WEB`, `ROBOT`, `DESKTOP`, `SYSTEM`), and initial permission envelope.
3. **Intent:** Fast-path deterministic detection or semantic intent classification.
4. **Context:** Correlation ID generation/propagation, active session resolution.
5. **Memory Retrieval:** Querying relevant episodic facts, boss habits, learned rules, and task history.
6. **Planning:** Formulation of an execution DAG with bounded iterations and cost budget.
7. **Model Routing:** Evaluation of provider health (Cloud Gemini, Local Ollama, Deterministic Fallback) and mode constraints.
8. **Policy Decision Point (PDP):** Evaluation of proposed actions against Default-Deny policy rules.
9. **Approval Verification:** Verification of valid, unexpired, single-use execution tokens for `HIGH_IMPACT` actions.
10. **Tool Execution:** Dispatching tool in an isolated execution sandbox with strict timeouts.
11. **Observation:** Capturing raw outputs, stdout, return codes, and error buffers.
12. **Verification:** Validating that execution satisfied the post-condition without violating state invariants.
13. **Memory Update:** Committing learned facts, preferences, or rule updates through atomic storage.
14. **Audit:** Hashing input arguments and result, appending to the cryptographic audit chain.
15. **Response:** Synthesizing persona-aligned, sanitized human or machine response.
16. **Delivery:** Streaming audio, transmitting WebSocket command, or dispatching webhook response.

---

## 4. TRUST BOUNDARIES & CLASSIFICATION

BOWCON divides the computing universe into three explicit trust zones:

```
+-------------------------------------------------------------------------+
|                              TRUSTED ZONE                               |
|  - Core Agent Runtime Engine                                            |
|  - Policy Decision Point (PDP) & Action Registry                        |
|  - Cryptographic Approval Service & Token Store                         |
|  - Append-Only Tamper-Evident Audit Ledger                              |
|  - Verified Local Configuration (.env, hardware keys)                   |
+-------------------------------------------------------------------------+
                                    ▲
                                    │ (Authoritative Governance Boundary)
                                    ▼
+-------------------------------------------------------------------------+
|                         PARTIALLY TRUSTED ZONE                          |
|  - Cloud LLM Inference (Gemini)                                         |
|  - Local SLM Inference (Ollama / Qwen)                                  |
|  - Dynamically Generated Action Plans & Tool Calls                      |
|  - Verified Subagent Reports                                            |
|  - Cached Idempotent Results                                            |
+-------------------------------------------------------------------------+
                                    ▲
                                    │ (Strict Validation & Sanitization)
                                    ▼
+-------------------------------------------------------------------------+
|                             UNTRUSTED ZONE                              |
|  - User Messages (Web, Telegram, Speech)                                |
|  - External Webhook Payloads & Web Scraping Content                     |
|  - Screen OCR & Window Text Extracted from Desktop                      |
|  - Unsigned Dynamic Skill JavaScript/TypeScript Source                  |
|  - Physical Sensor Telemetry & Camera Frames                            |
|  - Tool Results from Remote Systems                                     |
+-------------------------------------------------------------------------+
```

### Non-Negotiable Trust Principle
**LLM output is ALWAYS considered PARTIALLY TRUSTED.**  
An LLM request to execute a tool, write to memory, move a servo, or launch a desktop application is treated as an *untrusted proposal*. It must pass through the authoritative Trusted Zone (PDP) before executing any side-effects.

---

## 5. MODEL ROUTING CONTRACT

The system must converge on a **single authoritative ModelRouter** abstraction.

### 5.1 Operating Modes
- `AUTO`: Dynamic selection based on query complexity, privacy sensitivity, and real-time provider health.
- `LOCAL_PREFERRED`: Route to Local Ollama/SLM first; fallback to Cloud only upon explicit user consent or local failure.
- `LOCAL_ONLY`: Air-gapped / offline operation. Never transmits data across external networks.
- `CLOUD_PREFERRED`: High-capacity reasoning using Gemini Cloud with instant local failover.
- `DETERMINISTIC_ONLY`: Bypasses all neural inference; relies strictly on rule-based intent engines.

### 5.2 Failure & Circuit Breaker Invariants
The ModelRouter must actively detect and observe:
- Request timeouts (default: 5000ms).
- HTTP status codes: `429` (Rate Limited), `500`, `502`, `503` (Overloaded), `404` (Model Missing).
- Network disconnections and connection drops.
- Malformed JSON responses and schema-violating tool calls.
- Context window overflow.

**Silent Fallback Prohibition:**  
Fallback must be explicit and observable. The system must record:
- Provider used (`cloud_gemini` vs `local_slm_rx580` vs `deterministic_engine`).
- Reason for selection.
- Fallback event trigger reason.
- Round-trip latency in milliseconds.
- Token consumption metrics.

---

## 6. LAYERED MEMORY CONTRACT

Memory is segregated into 7 distinct cognitive tiers with strict admission and retention policies:

| Layer | Tier Name | Persistence | Scope | Admission Criteria |
|---|---|---|---|---|
| **L0** | Current Turn Context | Ephemeral (Call stack) | Request | Current raw input, active tokens |
| **L1** | Session Working Memory | In-memory with TTL | Session | Multi-turn dialogue history for active session |
| **L2** | Episodic Memory | Durable JSON / DB | User / Boss | Notable events, interactions, timestamps, summaries |
| **L3** | Semantic Memory | Vector Index / Store | Global / Tenant | Searchable domain knowledge, policies, catalogs |
| **L4** | Boss / User Profile | Durable JSON / DB | User / Boss | Explicit personal preferences, verified habits |
| **L5** | Learned Rules | Durable JSON / DB | Global / Tenant | Explicit corrections, negative feedback rules |
| **L6** | System & Spatial Memory | Durable JSON / DB | System / Room | Robot coordinate frames, physical landmark nodes |

### Memory Isolation & Admission Rules
1. **Multi-User Isolation:** Global conversation buffers (such as module-level history arrays) are strictly prohibited. Dialogue history must be scoped by `sessionId` and `userId`.
2. **Admission Threshold:** Casual chatter ("Hôm nay trời đẹp") must not pollute L4 profile storage. Only durable preferences, habitual patterns, and project metadata are admitted to L4/L5.
3. **Atomic Writes:** All filesystem memory commits must use write-rename atomic transactions (`.tmp` file write followed by `fs.renameSync`) with file locks to eliminate corruption on crash.
4. **Provenance & Confidence:** Every admitted memory record must contain: `id`, `source`, `confidenceScore` (0.0–1.0), `importanceLevel` (1–5), `timestamp`, and `retentionPolicy`.

---

## 7. TOOL GOVERNANCE CONTRACT

Every tool registered in `ToolRegistry` must conform to the formal tool governance schema:

```typescript
export interface GovernedToolDefinition {
  name: string;
  domain: 'shop' | 'desktop' | 'robot' | 'memory' | 'dynamic_code' | 'system';
  description: string;
  parameters: Record<string, any>;
  outputSchema?: Record<string, any>;
  classification: 'OBSERVE' | 'RECOMMEND' | 'REVERSIBLE' | 'HIGH_IMPACT' | 'FORBIDDEN';
  riskLevel: 0 | 1 | 2 | 3 | 4 | 5;
  requiresApproval: boolean;
  timeoutMs: number;
  idempotent: boolean;
  owner: string;
  version: string;
  execute: (args: any, context: ToolExecutionContext) => Promise<any>;
}
```

### Action Classification Hierarchy
- **`OBSERVE` (Risk Level 0):** Read-only inspection. No state mutations. (e.g., `desktop_capture_screenshot`, `get_sales_report`).
- **`RECOMMEND` (Risk Level 0-1):** Inference generation without state modification. (e.g., `inspect_order_dispute`).
- **`REVERSIBLE` (Risk Level 1-2):** State-changing actions with trivial rollback or minimal impact, permitted for authenticated owners/agents. (e.g., `desktop_launch_app`, `boss_remember_fact`, `robot_aim_head`).
- **`HIGH_IMPACT` (Risk Level 3-4):** Irreversible or high-consequence operations. Strictly requires an unexpired, single-use execution token issued by human approval. (e.g., `fulfill_order_handover`, `desktop_reply_message`, `desktop_execute_code`, `manage_shop_vouchers`).
- **`FORBIDDEN` (Risk Level 5):** Banned actions. Never permitted under any circumstance. (e.g., `transfer_funds`, `delete_database`, `bypass_robot_interlocks`).

---

## 8. POLICY DECISION POINT (PDP) CONTRACT

The PDP acts as the sole gatekeeper for all side-effect executions.

### PDP Governance Invariants
1. **Default Deny:** Any tool not explicitly registered with an allowlist rule is denied.
2. **Kill Switch Pre-Check:** If the Global Kill Switch or the tool's Domain Kill Switch is engaged, the action is immediately blocked with `KILL_SWITCH_ACTIVE`.
3. **Actor Context Enforcement:** Roles (`owner`, `admin`, `customer`, `desktop_agent`, `anonymous`) must match the minimum required permission level.
4. **One-Time Token Verification:** If the classification is `HIGH_IMPACT`, execution is rejected unless accompanied by a valid `executionToken` matching the tool name and argument hash.
5. **No Direct Model Execution:** LLM reasoning cannot bypass the PDP. All agent tools must execute through `ToolRegistry.executeTool()`.

---

## 9. APPROVAL LIFECYCLE CONTRACT

```
Agent Proposes Action
        ↓
PDP Flags HIGH_IMPACT
        ↓
ApprovalService.requestApproval()
        ↓
Ticket Created (Status: PENDING, Expiry: 15m)
        ↓
Human Reviewer Inspects Arguments & Risk
        ↓
        ├───────────────────────────────┐
        ▼                               ▼
     DENY / REVOKE                   APPROVE
        ↓                               ↓
Status: REJECTED            Status: APPROVED
Audit Event Recorded        Single-Use Token Issued (UUIDv4)
Agent Notified              Token Bound to: toolName + argsHash
                                        ↓
                            Agent Calls Tool With Token
                                        ↓
                            PDP Validates & Consumes Token
                                        ↓
                            Token Burned (Single-Use Guarantee)
                                        ↓
                            Action Executes
```

---

## 10. AUDIT LEDGER CONTRACT

All tool executions, approvals, denials, and kill switch activations must produce an immutable, append-only record in `data/audit_ledger.jsonl`.

### Audit Event Schema
```typescript
export interface AuditEvent {
  sequence: number;
  timestamp: string;
  actor: { userId: string; role: string; channel: string };
  domain: string;
  toolName: string;
  classification: string;
  argumentsHash: string; // SHA-256 of canonical JSON
  policyDecision: 'PERMIT' | 'DENY';
  approvalId?: string;
  executionStatus: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  resultHash?: string;
  prevHash: string;      // SHA-256 of preceding audit event
  hash: string;          // SHA-256 of current event payload + prevHash
}
```
Tampering with any historical audit entry breaks the cryptographic hash-chain, triggering an immediate security alarm.

---

## 11. SELF-IMPROVEMENT CONTRACT

BOWCON contains architectural primitives to synthesize new capabilities and debug its own failures.

### Controlled Self-Improvement Pipeline
```
[OBSERVE FAILURE]
       ↓
[IDENTIFY ROOT CAUSE]
       ↓
[PROPOSE PATCH / SKILL]
       ↓
[STATIC CODE SCAN] (Reject process, fs, net, require)
       ↓
[SANDBOX TEST RUN] (Resource limits, hard timeout)
       ↓
[REGRESSION TEST SUITE] (Verify zero broken existing invariants)
       ↓
[SECURITY GATE EVALUATION]
       ↓
[HUMAN APPROVAL REQUIRED]
       ↓
[ATOMIC VERSIONED DEPLOYMENT]
       ↓
[AUTOMATIC ROLLBACK ON TELEMETRY ANOMALY]
```
**Zero Autonomous Host Mutation:**  
The agent must **never** overwrite its own host application binaries, system files, or production source code without sandboxed verification, regression testing, and explicit human confirmation.

---

## 12. DYNAMIC SKILL & SANDBOX CONTRACT

1. **Untrusted Artifact Status:** All dynamically generated code snippets and skills are classified as `UNTRUSTED`.
2. **Execution Boundary:**
   - `node:vm` **must not** be treated as a secure sandboxing boundary in production.
   - Dynamic skills must be executed via an isolated out-of-process runner (disposable container, WebAssembly sandbox, or restricted child process with stripped privileges, no filesystem access, no network access, and memory/CPU quotas).
3. **Artifact Integrity:** Every approved skill artifact must be digitally signed (`HMAC-SHA256`). Unsigned or tampered skill files must be automatically quarantined.

---

## 13. COMPUTER CONTROL & DESKTOP AUTOMATION CONTRACT

Desktop operations must adhere to a 6-tier permission hierarchy:

| Level | Classification | Operations | Requirements |
|---|---|---|---|
| **Level 0** | Read-Only | Screen capture, OCR, window enumeration | Token auth |
| **Level 1** | Safe UI | Coordinate clicking, focused keystrokes | Window handle verification |
| **Level 2** | State Mutation | File creation in designated scratch directory | Path confinement |
| **Level 3** | Process Execution | Launching approved application allowlist | Executable allowlist check |
| **Level 4** | Privileged System | Modifying system settings, running scripts | Human approval token |
| **Level 5** | Destructive | File deletion, system formatting, registry edits | Strictly FORBIDDEN |

### Window Handle Lock Invariant
Simulating keystrokes using blind global hooks (such as raw `SendKeys`) is prohibited. The Desktop Bridge must verify:
1. Active process name and process ID (PID).
2. Foreground window handle (`HWND`) title match.
3. Post-action screenshot confirmation to verify the intended visual response.

---

## 14. MULTI-AGENT MESH CONTRACT

The Multi-Agent Mesh allows the primary BOWCON Orchestrator to delegate specialized tasks to subagents:
- `TechScoutAgent`: Tech news curation, supplier scanning, repository watching.
- `CoderDevOpsAgent`: Code synthesis, syntax linting, isolated sandbox test execution.
- `ShopOperationsAgent`: Inventory audit, order backlog monitoring, SLA tracking.
- `HardwareVisionAgent`: Battery diagnostics, camera stream telemetry, thermal monitoring.

### Delegation Protocol Invariants
- **Orchestrator Primacy:** Subagents report strictly to BOWCON Brain. Subagents cannot directly authorize `HIGH_IMPACT` actions.
- **Task Envelopes:** Every delegated task must declare: `taskId`, `role`, `goal`, `timeoutMs`, `retryBudget` (max 2), and `resultSchema`.
- **Bounded Resource Budgets:** Subagents have strict time and token quotas. Runaway recursive agent-spawning is prohibited.

---

## 15. EMBODIED ROBOT CONTRACT

The physical robot controller communicates with the Brain over WebSockets.

### ESP32-S3 Firmware Responsibility
- **Realtime Actuation:** Pan/Tilt servo PWM calculation, motor velocity control.
- **Sensory Ingestion:** ADC battery voltage, I2C thermal probe, ultrasonic/ToF distance sensors.
- **Audio Interface:** I2S microphone PCM streaming to Brain; I2S DAC playback of incoming audio chunks.
- **Firmware Safety Interlocks:**
  - Hardware E-Stop listening on dedicated interrupt pin.
  - Heartbeat watchdog: If no heartbeat packet is received from Brain within 3000ms, immediately cut power to servo/motor rails.
  - Thermal shutdown: If sensor reports temperature > 60°C, cut actuator power.

### Brain Responsibility
- Scene understanding from video frames.
- Speech recognition and audio stream intent decoding.
- High-level navigation goals ("Đi tới bàn làm việc") converted into coordinate target vectors.
- OLED emotional state transitions (`neutral`, `happy`, `thinking`, `surprised`, `listening`, `error`).

---

## 16. REALITY LEVEL CONTRACT

To guarantee absolute engineering honesty and eliminate hallucinated capability reports, every subsystem is graded under a 3-tier Reality Scale:

### 1. `MOCK` (Simulation Only)
- The subsystem returns hardcoded, synthetic, or purely heuristic responses.
- External hardware, APIs, or binaries are not actually invoked.
- *Examples in current code:* Physical face tracking (`physicalVisionService.ts`), Whisper STT transcription (`sttEngine.ts`).

### 2. `PARTIAL` (Incomplete Real Infrastructure)
- Real architectural plumbing, routing, and schemas exist, but one or more critical production capabilities rely on stubs, fallbacks, or in-memory state.
- *Examples in current code:* Gemini Client (real cloud API, but global unisolated history), Telegram Gateway (real message processing, but in-memory simulation without Bot API polling).

### 3. `REAL` (Production-Ready Operational)
- Live external APIs, hardware interfaces, OS primitives, and database engines are fully operational without mock bypasses.
- *Examples in current code:* Central Server HTTP/WS gateway, Webhook HMAC-SHA256 verifier, PowerShell multi-monitor screen capture, Policy Decision Point and Audit Ledger.

### Definition of Done for a Milestone
A subsystem cannot be marked **COMPLETE** while it remains at `MOCK` or `PARTIAL`. Completion requires:
$$\text{COMPLETE} = \text{REAL} + \text{AUTOMATED TESTS} + \text{SECURITY HARDENING} + \text{REGRESSION PASS} + \text{GATE AUDIT}$$

---

## 17. MILESTONE GOVERNANCE & PROMOTION GATES

Every future capability advancement must progress through sequential, verifiable promotion gates:

```
[MOCK] → [PARTIAL] → [REAL] → [TEST (100% Pass)] → [SECURITY REVIEW] → [REGRESSION CHECK] → [MILESTONE GATE PASS]
```
No milestone may be approved if:
1. Any required gate contains a failing or skipped assertion.
2. Unaddressed security vulnerabilities exist in the new surface.
3. Any protected system was modified without authorization.
4. Test suites rely on `.skip`, `.only`, or test-bypassing mocks.

---

## 18. PROTECTED SYSTEMS DECLARATION

The following systems are classified as **PROTECTED & FROZEN**:
- **Host Application:** `C:\BOW\shopofbow` (Strictly read-only; no code modifications permitted).
- **Financial & Business Modules:**
  - Payment gateway processing.
  - Wallet balance mutations and transaction logs.
  - Order state transition tables.
  - Supabase database migrations and schemas.
- **Canonical Git History:**
  - `git reset --hard`, `git clean -fd`, force pushing, and history rewrites are strictly forbidden.

---

## 19. VERSIONING POLICY

1. **Canonical Package:** `@bow/agent`
2. **Canonical Version:** `4.0.0`
3. **Version Invariant:**
   - The version **must remain BOWCON V4.0**.
   - Do not introduce V5.0.
   - Do not increment public versions to 4.1 or 4.2 prematurely.
   - All feature enhancements, security hardening, and embodied integrations represent internal development milestones under the BOWCON V4.0 umbrella.

---

## 20. VERIFIED TECHNICAL DEBT & RISK REGISTER

The following items are acknowledged as technical debt to be addressed in subsequent milestones:

1. **TD-01 (Router Fragmentation):** Dual coexistence of `src/core/hybridModelRouter.ts` and `src/llm/hybridLlmRouter.ts`.
2. **TD-02 (Memory Bleed):** Global mutable array `conversationHistory` in `src/gemini/geminiClient.ts` lacks session scoping.
3. **TD-03 (Unclassified Tools in PDP):** `desktop_send_keys` and `desktop_mouse_action` are omitted from `ACTION_CLASSIFICATIONS`, causing automated test failures under strict PDP.
4. **TD-04 (Sandbox Security):** `isolatedRunner.ts` relies on `node:vm`, which is not an airtight security boundary against malicious untrusted code.
5. **TD-05 (Mocked Audio Pipeline):** `ttsEngine.ts` and `sttEngine.ts` do not execute real local Piper/Whisper binaries.
6. **TD-06 (Non-Atomic Storage):** `bossMemoryHub.ts` and `bossFeedbackLearner.ts` use raw `fs.writeFileSync` without write-rename atomic guards.
7. **TD-07 (Open Telegram Gate):** `telegramGateway.ts` defaults to open authorization if `BOSS_TELEGRAM_CHAT_ID` is unset.
8. **TD-08 (Blind Keystroke Injection):** `chatReplyService.ts` executes `WScript.Shell.SendKeys` without confirming foreground window handle (`HWND`).

---

*End of BOWCON V4.0 Architecture Contract.*
