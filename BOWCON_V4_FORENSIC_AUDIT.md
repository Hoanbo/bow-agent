# BOWCON V4.0 — FORENSIC ARCHITECTURAL & SECURITY AUDIT REPORT

**Canonical Repository:** `C:\BOW\bow-agent` (Local workspace: `C:\Users\MSI_dualXeon\Desktop\BOW\bow-agent`)  
**Host Application:** `C:\BOW\shopofbow` (Status: FROZEN / STABLE)  
**Package:** `@bow/agent` (Version: `4.0.0`)  
**Audit Date:** September 6, 2026  
**Auditor:** Principal AI Systems & Robotics Software Architect  
**Audit Standard:** ISO/IEC 42001 (AI Management System), ISO/IEC 23894 (AI Risk Management), NIST AI RMF, Level 4 Autonomous Agent Safety Charter  

---

## EXECUTIVE SUMMARY

A comprehensive, read-only forensic inspection was conducted on the entire codebase of `@bow/agent` across its 105+ source files, 16 test suites, configuration, runtime topologies, security boundaries, and embodied interfaces.

The repository represents an advanced, ambitious evolution toward an autonomous AI co-founder, desktop agent, and embodied robotic brain. However, a rigorous code-level inspection reveals critical gaps between documented architectural claims and actual implementation:
1. **Test Suite Baseline Divergence:** While past reports claimed a static baseline of `252/252 PASS`, running the full test suite (`npm run test:all`) exposes failures in `tests/test_multichannel_v3_3.ts` (2 failures in desktop keyboard/mouse controls due to Policy Decision Point classification omissions) and `tests/test_v3_6_combined.ts` (12 failures due to `BOW_ENABLE_DYNAMIC_CODE=false` in production config).
2. **Mock / Stub Implementations:** Physical vision (`physicalVisionService.ts`), speech-to-text (`sttEngine.ts`), text-to-speech audio synthesis (`ttsEngine.ts`), and Telegram gateway (`telegramGateway.ts`) rely partially or entirely on in-memory mock responses or synthetic data.
3. **Security & Isolation Risks:** Dynamic code execution previously used `node:vm` (which is explicitly documented by Node.js as not a security boundary) and `AsyncFunction`; global mutable conversation history in `geminiClient.ts` causes cross-session context bleeding; JSON files lack atomic file write guards and schema validation.
4. **Architectural Duplication:** Two independent hybrid router implementations coexist (`src/core/hybridModelRouter.ts` and `src/llm/hybridLlmRouter.ts`), causing fragmented model failover policies.

---

## 1. CURRENT ARCHITECTURE & COMPONENT TOPOLOGY

### 1.1 High-Level Architecture
BOWCON operates under a strict **Brain vs. Body** decoupling:
- **BOWCON Central Brain (`@bow/agent`):** Node.js ESM runtime responsible for multi-channel intent resolution, hybrid LLM routing (Gemini Cloud + Ollama Local SLM + Deterministic Fallback), Policy Decision Point (PDP) governance, approval ticketing, idempotency tracking, append-only cryptographic audit logging, episodic memory, and multi-agent coordination.
- **Embodied Controller (ESP32-S3 / Remote Host):** Realtime I/O microcontroller handling servos, microphone, speaker, OLED display, battery telemetry, and camera streaming via WebSockets.
- **Desktop Agent (`bow-remote-agent`):** Windows OS automation bridge (PowerShell, screen capture, application launcher).

### 1.2 Runtime & Server Topology
- **Server:** `BowCentralAgentServer` (`src/server.ts`) listening on HTTP/WS port 4000 (`BOW_AGENT_PORT`).
- **REST Surface:**
  - Health & Telemetry: `GET /health`
  - Agent Inference: `POST /api/agent/query`
  - Audio Hub: `POST /api/speech/tts`, `POST /api/speech/stt`
  - Webhooks: `POST /api/events/shop` (HMAC-SHA256 verified)
  - Governance L4: `GET/POST /api/v1/governance/approvals/*`, `GET /api/v1/governance/audit`, `GET/POST /api/v1/governance/kill-switch`, `GET /api/v1/governance/slo`
- **WebSocket Gateway Surface:**
  - `/ws/web`: Web clients & Shop of BOW frontend.
  - `/ws/robot`: ESP32-S3 bi-directional JSON command & telemetry channel.
  - `/ws/desktop`: Remote desktop automation agent channel.
  - `/ws/audio-stream`: Full-duplex audio stream with barge-in interrupt events.

### 1.3 Dependency Topology
- **Package Manifest (`package.json`):**
  - Name: `@bow/agent` | Version: `4.0.0` | Type: `module`
  - Dependencies: `@google/generative-ai` (^0.24.1), `dotenv` (^17.4.2), `ws` (^8.21.3)
  - Dev Dependencies: `typescript` (5.6.2), `tsx` (4.19.0), `@types/node` (^22.20.1), `@types/ws` (^8.18.1)
  - **Zero Forbidden Dependencies:** Completely decoupled from React, Vite, DOM/browser globals, and `@supabase/supabase-js`. 100% compliant with standalone isolation constraints.

---

## 2. TOOL TOPOLOGY & INVENTORY

The central `ToolRegistry` manages **32 static tools** plus dynamically registered skills:

| Domain | Tool Name | Description | Current PDP Classification | Risk Level |
|---|---|---|---|---|
| **Desktop / OS** | `desktop_launch_app` | Launch desktop application via PowerShell | REVERSIBLE | Level 3 (Process Exec) |
| **Desktop / OS** | `desktop_send_keys` | Simulate keystrokes via WScript.Shell | *UNCLASSIFIED (defaults to HIGH_IMPACT)* | Level 1 (Safe UI) / High |
| **Desktop / OS** | `desktop_mouse_action` | Simulate mouse clicks / coordinates | *UNCLASSIFIED (defaults to HIGH_IMPACT)* | Level 1 (Safe UI) / High |
| **Desktop / OS** | `desktop_capture_screenshot` | Multi-monitor screen capture | OBSERVE | Level 0 (Read-only) |
| **Desktop / OS** | `inspect_screen_notifications` | Screen OCR & notification inspection | OBSERVE | Level 0 (Read-only) |
| **Desktop / OS** | `desktop_reply_message` | Auto-reply to chat apps | HIGH_IMPACT | Level 1/4 (Outbound msg) |
| **Desktop / OS** | `desktop_execute_code` | Dynamic JS code execution | HIGH_IMPACT | Level 4 (Code Exec) |
| **Embodied / IoT**| `desktop_smarthome_control` | Control lights, AC, smart appliances | REVERSIBLE | Level 2 (State Change) |
| **Embodied / Robot**| `robot_track_sound_source`| Aim head toward estimated audio DOA | REVERSIBLE | Level 1 (Actuation) |
| **Memory / Boss** | `boss_remember_fact` | Commit user preference / habit | REVERSIBLE | Level 2 (Storage) |
| **Memory / Boss** | `boss_recall_memory` | Retrieve boss profile & projects | OBSERVE | Level 0 (Read-only) |
| **Memory / Boss** | `get_morning_briefing` | Fetch morning digest | OBSERVE | Level 0 (Read-only) |
| **Memory / Boss** | `teach_boss_rule` | Teach new rule / policy | REVERSIBLE | Level 2 (Rule Policy) |
| **Dynamic Skills**| `create_dynamic_skill` | Synthesize new executable skill | HIGH_IMPACT | Level 4 (Privileged) |
| **Dynamic Skills**| `execute_dynamic_skill` | Execute dynamic skill | HIGH_IMPACT | Level 4 (Privileged) |
| **Dynamic Skills**| `list_dynamic_skills` | List registered skills | OBSERVE | Level 0 (Read-only) |
| **Brain / Mode** | `switch_ai_brain_mode` | Switch auto/cloud/local modes | REVERSIBLE | Level 2 (Router Config) |
| **Multi-Agent** | `delegate_subagent_task` | Delegate task to subagent mesh | HIGH_IMPACT | Level 3 (Delegation) |
| **VIP Gateway** | `send_telegram_briefing_to_boss` | Dispatch briefing to Telegram | REVERSIBLE | Level 1 (Outbound msg) |
| **Shop E-Commerce**| `search_products` | Catalog search | OBSERVE | Level 0 (Read-only) |
| **Shop E-Commerce**| `get_my_orders` | Customer order lookup | OBSERVE | Level 0 (Read-only) |
| **Shop E-Commerce**| `get_my_wallet_balance`| Wallet balance check | OBSERVE | Level 0 (Read-only) |
| **Shop E-Commerce**| `get_deposit_instructions`| Bank transfer details | OBSERVE | Level 0 (Read-only) |
| **Shop E-Commerce**| `check_warranty_policy`| Warranty terms lookup | OBSERVE | Level 0 (Read-only) |
| **Shop E-Commerce**| `get_active_coupons` | Active discount coupons | OBSERVE | Level 0 (Read-only) |
| **Shop Admin** | `get_sales_report` | Executive revenue report | OBSERVE | Level 0 (Read-only) |
| **Shop Admin** | `get_inventory_health` | Stock levels & SKU status | OBSERVE | Level 0 (Read-only) |
| **Shop Admin** | `manage_shop_vouchers` | Issue new promo voucher | HIGH_IMPACT | Level 4 (Financial impact)|
| **Shop Admin** | `inspect_order_dispute`| Order issue recommendation | RECOMMEND | Level 0 (Inference) |
| **Shop Admin** | `get_pending_fulfillment_queue`| Unfulfilled queue audit | OBSERVE | Level 0 (Read-only) |
| **Shop Admin** | `fulfill_order_handover`| One-click credential handover | HIGH_IMPACT | Level 4 (Credential hand)|
| **Shop Admin** | `get_profit_margin_report`| Net profit calculations | OBSERVE | Level 0 (Read-only) |

---

## 3. MEMORY TOPOLOGY & PERSISTENCE

### 3.1 Architecture
The system maintains 4 distinct memory stores:
1. **Boss Profile & Habits (`src/embodied/bossMemoryHub.ts`):**
   - File: `data/bossMemory.json`
   - Content: Founder personal details ("Ngài Hoàn"), habits, active projects, health notes, relationships.
   - Admission Rules: Basic regex extraction (`extractFactFromText`).
2. **Learned Rules (`src/embodied/bossFeedbackLearner.ts`):**
   - File: `data/customBossRules.json`
   - Content: Explicit rules taught by the Boss (`rule_addressing_sếp`, `rule_proactive_care`).
3. **Session Working Memory (`src/core/memory.ts` & `src/core/sessionContext.ts`):**
   - In-memory volatile multi-turn history.
4. **Audit Ledger (`src/core/auditLedger.ts`):**
   - File: `data/audit_ledger.jsonl`
   - Content: Append-only SHA-256 cryptographic hash-chain of every tool execution and PDP decision.

### 3.2 Vulnerabilities & Technical Debt in Memory
- **No Atomic File Writes:** Writes to `bossMemory.json` and `customBossRules.json` use raw `fs.writeFileSync`. A process crash or power interruption during write corrupts the JSON file.
- **No Schema Validation:** Loaded files use raw `JSON.parse` without Zod or runtime validation.
- **Single-User Lock-in:** The memory hub hardcodes a single global profile. There is no multi-user tenant separation, session fencing, or access control.
- **Cross-Session Memory Bleed:** In `src/gemini/geminiClient.ts`, `let conversationHistory: ConversationTurn[] = []` is a global module variable. All requests across different sessions share the exact same conversational buffer unless manually reset.
- **No Spatial Memory:** There is no concept of room coordinates, object locations, or 3D spatial mapping.

---

## 4. MODEL ROUTING TOPOLOGY

### 4.1 Two Parallel Router Implementations
The codebase currently contains two distinct, conflicting router implementations:
1. **`src/core/hybridModelRouter.ts` (`HybridModelRouter`):**
   - Focus: Dual-Brain mode selection (`auto`, `cloud_preferred`, `local_preferred`, `local_only`, `deterministic_only`).
   - Connects to: `http://localhost:11434` (Ollama) with fallback to `processAgentMessageV2` (Deterministic Engine).
   - Used in: Phase 2 self-tool tests and core CLI engine.
2. **`src/llm/hybridLlmRouter.ts` (`HybridLlmRouter`):**
   - Focus: Edge-Cloud Smart Failover with `ProviderHealthMonitor` and `CircuitBreaker`.
   - Connects to: `localLlmProvider.ts` (`qwen2.5:1.5b` on Vulkan/Ollama) and `geminiClient.ts`.
   - Used in: `server.ts` `/health` endpoint and Milestone 1 speech tests.

### 4.2 Routing Weaknesses
- Dual router divergence: State, health metrics, and mode switches in one router do not synchronize with the other.
- No unified token/latency/cost tracking.
- Context overflow handling is not implemented.

---

## 5. GATEWAY TOPOLOGY & EXTERNAL INTEGRATIONS

1. **HTTP/WebSocket Gateway (`src/server.ts`):**
   - Fully operational. Features rate limiting, origin checks, correlation IDs, and channels for WEB, ROBOT, DESKTOP, AUDIO-STREAM.
2. **Shop Webhook Ingestion (`src/security/webhookVerifier.ts`):**
   - Production-hardened with HMAC-SHA256 signatures, timestamp window validation (default 300s), and cryptographic nonce replay prevention.
3. **Telegram Gateway (`src/gateway/telegramGateway.ts`):**
   - **Simulated / Mock Only:** Does not use the official Telegram Bot API (no `telegraf`, no long-polling, no webhook handler).
   - **Security Bypass:** `isAuthorized` contains `return chatId === this.allowedChatId || !this.isConfigured;`. If `BOSS_TELEGRAM_CHAT_ID` is unset, **any incoming chatId is treated as authorized**.
4. **Desktop Automation (`src/desktop/chatReplyService.ts`):**
   - Uses unverified PowerShell `WScript.Shell.SendKeys` without confirming window handle focus. Risk of typing text into arbitrary active applications.

---

## 6. ROBOT & EMBODIED TOPOLOGY (ESP32-S3 BOUNDARY)

1. **Safety Controller (`src/embodied/robotSafetyController.ts`):**
   - Implements Pan clamping `[-90°, +90°]`, Tilt clamping `[-20°, +30°]`.
   - Heartbeat watchdog (< 3000ms triggers motor cutoff).
   - Thermal interlock (> 60°C shuts down actuator power).
   - Emergency Stop (E-Stop) software trigger.
2. **Full-Duplex Audio Hub (`src/speech/fullDuplexAudioHub.ts`):**
   - Conversational state machine (`IDLE`, `LISTENING`, `THINKING`, `SPEAKING`, `INTERRUPTED`).
   - Dispatches `bargeIn` events when user speech is detected during playback.
3. **Speech Synthesis & Recognition Stubs:**
   - `ttsEngine.ts`: Generates SSML markup, but returns `audioBase64: undefined` (does not invoke Edge-TTS or Piper binaries).
   - `sttEngine.ts`: Returns mocked text string without invoking `localWhisperUrl` or `fasterWhisperUrl`. VAD always returns `speechEnded: true`.
4. **Physical Vision Stub (`src/embodied/physicalVisionService.ts`):**
   - Pure hardcoded mock (`mode === 'boss_simulation'` returns static coordinates and confidence 0.98). No OpenCV or camera stream inference.
5. **Missing Robotics Layers:**
   - No Autonomous Navigation (no wheel odometry, IMU sensor fusion, ToF obstacle detection, SLAM, or path planning).
   - No hardware-level GPIO relay E-stop.

---

## 7. SECURITY & GOVERNANCE TOPOLOGY

### 7.1 Implemented Strengths
- **Central Policy Decision Point (`src/core/policyDecisionPoint.ts`):** Default-deny architectural enforcement.
- **One-Time Execution Tokens (`src/core/approvalService.ts`):** High-impact actions require approval tokens with single-use consumption guarantee.
- **Atomic Idempotency Ledger (`src/core/idempotencyStore.ts`):** Caches execution results by idempotency key and detects payload tampering.
- **Append-Only Tamper-Evident Audit Ledger (`src/core/auditLedger.ts`):** SHA-256 hash-chained JSONL records.
- **Kill Switches:** Global and per-domain switches (`shop`, `desktop`, `robot`, `dynamic_code`).

### 7.2 Security Gaps & Vulnerabilities
- **Sandbox Security Boundary:** `sandboxRunner.ts` and `isolatedRunner.ts` use Node.js `node:vm`. `node:vm` is vulnerable to prototype chain escaping (`this.constructor.constructor('return process')()`). True sandboxing requires a separate OS process, worker thread with memory quotas, or WebAssembly sandbox.
- **Prompt Injection Defense:** Relies solely on 8 regex patterns in `src/core/security.ts`. Lacks structural XML tagging, untrusted data isolation, or LLM-based boundary verification.
- **Tool Classification Omission:** `desktop_send_keys` and `desktop_mouse_action` are missing from `ACTION_CLASSIFICATIONS`, causing unintended test failures and authorization blocks.

---

## 8. TEST TOPOLOGY & SUITE BASELINE ANALYSIS

### 8.1 Discovered Test Suites (16 Suites Total)

| Test File | Total Tests/Assertions | Current Result | Primary Focus |
|---|---|---|---|
| `test_phase7_1_step4_extraction.ts` | 63 | **63/63 PASS** | Standalone package boundaries, zero forbidden imports |
| `test_multichannel_v3_3.ts` | 63 | **61/63 (2 FAIL)** | Multi-channel router, server, desktop adapter (`send_keys`, `mouse_action` blocked by PDP) |
| `test_executive_v3_4.ts` | 47 | **47/47 PASS** | Executive prompts, RBAC for analytics, proactive events |
| `test_screen_vision_v3_5.ts` | 38 | **38/38 PASS** | Fast-path router, screen OCR, notification briefing |
| `test_v3_6_combined.ts` | 38 | **26/38 (12 FAIL)**| Code interpreter sandbox (fails because `BOW_ENABLE_DYNAMIC_CODE=false`) |
| `test_v4_milestone1_local_speech.ts` | 34 | **34/34 PASS** | Local speech stubs, SLM provider, failover |
| `test_v4_milestone2_full_duplex.ts` | 19 | **19/19 PASS** | Conversational state machine, barge-in detection |
| `test_v4_milestone3_embodied.ts` | 37 | **37/37 PASS** | Embodied vision stubs, smart home, watchdog |
| `test_shop_admin_copilot.ts` | 43 | **43/43 PASS** | Admin queue, handover, profit calculations |
| `test_bow_con_phase1_memory.ts` | 43 | **43/43 PASS** | Boss memory hub, feedback learning, nightly hunter |
| `test_bow_con_phase2_self_tool.ts` | 34 | **34/34 PASS** | Sandbox syntax validation, self-tool synthesis |
| `test_bow_con_phase3_multiagent.ts`| 38 | **38/38 PASS** | Multi-agent mesh delegation, sound localization |
| `test_bow_con_level4_governance.ts` | 33 | **33/33 PASS** | Charter compliance, PDP default-deny, approvals, kill switches |
| `test_l4_security_hardening.ts` | 36 | **36/36 PASS** | Webhook replay, rate limiting, audit chain, circuit breaker |
| `test_l4_unified_governance_integration.ts`| 36 | **36/36 PASS** | ToolRegistry PDP enforcement, REST governance APIs |
| `test_duration_resolver_10r19.ts` | 18 | **18/18 PASS** | Duration string parsing invariants |

### 8.2 Origin of the "252/252" Claim
The historical number 252 was a snapshot sum of selected earlier suites (`test_phase7_1_step4_extraction` [63] + `test_multichannel_v3_3` [63] + `test_executive_v3_4` [47] + `test_screen_vision_v3_5` [38] + `test_v4_milestone1_local_speech` [34] + partial = ~252).  
With the recent additions of Level 4 Governance suites, the total test suite now contains **over 550 assertions**.

---

## 9. CONCLUDING FORENSIC EVALUATION

### 9.1 Current Architecture
A hybrid modular agent architecture combining legacy deterministic e-commerce heuristics with modern LLM tool calling, multi-channel gateways, Level 4 ISO-compliant governance boundaries (PDP, approvals, audit ledger), and embodied robot adapters.

### 9.2 What is Actually Implemented (Real & Verified)
1. **Zero Forbidden Imports & Clean Packaging:** Completely decoupled from ShopOfBow UI and Supabase.
2. **Central Policy Decision Point & Governance:** Single PDP evaluating all tool executions with Default Deny, one-time approval tokens, idempotency store, and append-only hash-chained audit logging.
3. **Server & Gateway Infrastructure:** HTTP REST and WebSocket servers supporting `/ws/web`, `/ws/robot`, `/ws/desktop`, and `/ws/audio-stream`.
4. **Hardened Webhook Ingestion:** HMAC-SHA256 signature verification with timestamp expiration and nonce replay defense.
5. **Robot Physical Safety Controller:** Pan/tilt angular limits, heartbeat watchdog (<3000ms), thermal cutoff (>60°C), and software E-stop.
6. **Full-Duplex State Machine:** Conversational turn-taking with barge-in interrupt events.
7. **Screen Capture Service:** Native PowerShell multi-monitor screen capture.
8. **Shop Admin & E-commerce Heuristics:** Invariant-compliant pricing, sales reports, inventory health, and dispute resolution.

### 9.3 What is Partially Implemented
1. **Dynamic Skills & Sandbox:** Core registry and signing logic exists, but execution relies on `node:vm` and is disabled in production (`BOW_ENABLE_DYNAMIC_CODE=false`).
2. **Boss Memory & Feedback:** Stores profile and rules in JSON files, but lacks atomic writes, schema validation, and multi-tenant isolation.
3. **Multi-Agent Mesh:** Orchestrator exists, but delegates via synchronous in-process method calls rather than isolated worker processes with queues and retry budgets.
4. **Hybrid Model Routing:** Two separate routers exist (`core/hybridModelRouter` and `llm/hybridLlmRouter`) with overlapping responsibilities.

### 9.4 What is Missing
1. **Real Audio Pipeline:** Real Piper TTS / Edge-TTS audio byte synthesis and real Whisper STT integration (currently stubs).
2. **Real Physical Vision:** Real camera frame ingestion and neural inference (currently hardcoded simulation).
3. **Autonomous Navigation (V2):** Wheel odometry, IMU fusion, ToF sensors, mapping, and path planning.
4. **Spatial Memory (V3):** Persistent room, object, and spatial coordinate knowledge graph.
5. **Production Isolated Code Runner:** Out-of-process containerized or WebAssembly-based sandbox.
6. **Real Telegram Integration:** Real Telegram Bot polling / webhook ingestion.

### 9.5 What is Unsafe
1. **Global Conversation History in `geminiClient.ts`:** `let conversationHistory` leaks multi-turn dialogue across sessions and users.
2. **Unverified Window Keystroke Injection:** `chatReplyService.ts` issues `WScript.Shell.SendKeys` without confirming the active window handle.
3. **Telegram Gateway Open-by-Default:** `telegramGateway.ts` permits any `chatId` if `BOSS_TELEGRAM_CHAT_ID` is not configured.
4. **In-Process Dynamic Code Execution:** Running dynamic scripts inside the main Node.js process using `node:vm`.
5. **Non-Atomic JSON File Writes:** `bossMemory.json` and `customBossRules.json` can be corrupted on sudden power loss.

### 9.6 What Should Be Refactored
1. **Consolidate Hybrid Model Routers:** Merge `src/core/hybridModelRouter.ts` and `src/llm/hybridLlmRouter.ts` into a single authoritative `ModelRouter`.
2. **Decouple Legacy Monolith:** Extract helper routines from `src/core/agentEngine.ts` (2266 lines) into modular domain handlers.
3. **Fix Action Classifications in PDP:** Add `desktop_send_keys` and `desktop_mouse_action` to `ACTION_CLASSIFICATIONS` so desktop automation operates according to policy without breaking tests.
4. **Session-Scoped Memory:** Refactor `geminiClient.ts` to scope dialogue histories strictly to `sessionId` / `userId`.

### 9.7 What Should NOT Be Touched
1. **`C:\BOW\shopofbow`:** STABLE / FROZEN host application. No modifications.
2. **Protected Shop Systems:** Payment, wallet balances, order state transitions, database migrations.
3. **Established E-Commerce Contracts:** Pricing invariants, duration resolvers (`test_duration_resolver_10r19.ts`), warranty policies.
4. **Git History:** No force pushes, resets, or destructive history rewrites.

### 9.8 Proposed V4 Evolution Roadmap
- **Phase 1 (Architecture Contract):** Formalize contracts in `docs/BOWCON_V4_ARCHITECTURE.md`.
- **Phase 2 (Core Agent Loop):** Refactor central agent loop to enforce Intent → Memory → Plan → PDP → Execute → Verify → Update.
- **Phase 3 (Model Router):** Unify router into production-grade engine with circuit breaker, health probes, and observable fallbacks.
- **Phase 4 & 5 (Memory & Boss Memory):** Implement atomic writes, schema validation, session isolation, and layered memory.
- **Phase 6 (Feedback Learning):** Add rule priority, confidence scoring, and conflict resolution.
- **Phase 7 & 8 (Dynamic Skills & Sandbox):** Implement safe out-of-process isolation runner.
- **Phase 9 (Self-Improvement Loop):** Build test-verified, rollback-capable patch pipeline.
- **Phase 10 (Computer Control):** Implement window handle-locked desktop automation with 5 permission levels.
- **Phase 11 (Multi-Agent Mesh):** Implement task protocols, timeouts, retries, and report synthesis.
- **Phase 12 (Tool Governance):** Complete tool governance audit and metadata schemas.
- **Phase 13 & 14 (Security & Prompt Injection):** Structured trust boundaries and indirect injection defenses.
- **Phase 15 (Observability):** Structured OpenTelemetry-compatible traces, spans, and metrics.
- **Phase 16 & 17 (Audio & Vision):** Implement real local Piper/Whisper endpoints and camera frame processing.
- **Phase 18 & 19 (Robot Embodiment & Safety):** Protocol specification for ESP32-S3 over WebSockets with hardware E-stop.
- **Phase 20 & 21 (Navigation & Spatial Memory):** Architecture specifications for odometry and 3D spatial knowledge.
- **Phase 22–29 (Reliability, Testing, Certification):** Complete V4 certification test suite with 100% pass rate.

### 9.9 Priority Order
1. **P0 (Immediate):** Fix PDP classification omissions (`desktop_send_keys`, `desktop_mouse_action`) to restore test suite green baseline.
2. **P0 (Immediate):** Eliminate cross-session history bleed in `geminiClient.ts` and close open Telegram gate vulnerability.
3. **P1 (Core Foundation):** Complete Phase 1 Architecture Contract (`docs/BOWCON_V4_ARCHITECTURE.md`).
4. **P1 (Core Foundation):** Unify hybrid model routers and implement atomic memory persistence.
5. **P2 (Hardening):** Multi-agent mesh hardening, tool governance schemas, prompt injection defense.
6. **P3 (Embodied Evolution):** Real speech/vision pipeline, ESP32-S3 protocol, autonomous navigation foundations.

### 9.10 Estimated Risk
- **Technical Risk:** Medium-Low (Codebase is cleanly written, highly modular TypeScript with zero breaking dependencies).
- **Security Risk:** High until memory bleeding, open-by-default gateways, and `node:vm` sandbox usage are mitigated.
- **Operational Risk:** Minimal to `ShopOfBow` as long as isolation boundaries are respected.
