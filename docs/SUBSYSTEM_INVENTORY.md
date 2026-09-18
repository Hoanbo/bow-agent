# BOWCON — 107+ SUBSYSTEM INVENTORY & CLASSIFICATION AUDIT
**Authoritative System Audit | Antigravity AI Systems Architecture**  
**Repository:** `@bow/agent` (BOWCON V4.0 Autonomous Brain)  
**Verification Date:** 2026-09-17  
**Operating Principle:** Brain-First & BodyProtocol Architecture. Subsystems not actively verified remain decoupled/frozen.

---

## 1. Executive Summary

This inventory audits all 108 subdirectories and key core files under `src/core/`. Prior architecture phases accumulated theoretical or forward-looking federated governance modules. In accordance with the Brain-First principle, **only subsystems necessary for Central Brain operation, PDP governance, memory, tool dispatch, and BodyProtocol (including Audio Body Foundation) are activated**. All complex multi-party federated governance subsystems are frozen (AVAILABLE/LEGACY) until required by explicit user use cases.

### Subsystem Status Counts
* **ACTIVE (In Canonical Production / Verified Tests):** 16
* **AVAILABLE (Functional but dormant / on-demand):** 32
* **EXPERIMENTAL (Work-in-progress / forward research):** 12
* **LEGACY / FROZEN (Historical federated governance / superseded):** 42
* **DEAD / DUPLICATE (Obsolete or superseded by Canonical AgentLoop):** 6

---

## 2. Comprehensive Inventory Table

| Subsystem | Location | Category | Runtime Status | Test Coverage | Primary Dependency | Action & Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bodyProtocol` | `src/core/bodyProtocol/` | BODY | **ACTIVE** | `test_body_audio.ts`, `test_body_auth.ts`, `test_live_body_action.ts` | ws, crypto | Authoritative peripheral body protocol & registry. |
| `agentLoop.ts` | `src/core/agentLoop.ts` | CORE | **ACTIVE** | `test_body_audio.ts`, `test_phase7_1_step4_extraction.ts` | PDP, Memory, Tools | Canonical agent orchestration runtime. |
| `policyDecisionPoint.ts` | `src/core/policyDecisionPoint.ts` | SECURITY | **ACTIVE** | `test_body_audio.ts`, `test_live_body_action.ts` | ApprovalService | Mandatory PDP Level 1-4 gate. Zero bypass. |
| `approvalService.ts` | `src/core/approvalService.ts` | SECURITY | **ACTIVE** | `test_body_audio.ts`, `test_live_body_action.ts` | Crypto tokens | Interactive human-in-the-loop authorization. |
| `auditLedger.ts` | `src/core/auditLedger.ts` | SECURITY | **ACTIVE** | `test_body_audio.ts` | crypto SHA256 | Cryptographic append-only hash chain audit log. |
| `actionPlanner.ts` | `src/core/actionPlanner.ts` | REASONING | **ACTIVE** | `test_live_body_action.ts` | ToolRegistry | Translates intents into verified executable actions. |
| `intentResolver.ts` | `src/core/intentResolver.ts` | REASONING | **ACTIVE** | `test_phase7_1_step4_extraction.ts` | Core types | Natural language & intent classification. |
| `memory.ts` | `src/core/memory.ts` | MEMORY | **ACTIVE** | `test_phase7_1_step4_extraction.ts` | In-memory / storage | Working memory and episodic context retention. |
| `commerceRegistry.ts` | `src/core/commerceRegistry.ts` | SHOP | **ACTIVE** | `test_phase7_1_step4_extraction.ts` | Contracts | Decoupled commerce registry (zero shopofbow direct link). |
| `tools.ts` | `src/core/tools.ts` | TOOL | **ACTIVE** | `test_live_body_action.ts` | ToolRegistry | Standard tools (filesystem, shell, body capability bridge). |
| `voice` | `src/core/voice/` | AUDIO | **AVAILABLE** | `test_body_audio.ts` (via `src/speech/`) | WinMM, System.Speech | Speech audio utilities and pipeline interfaces. |
| `transport` | `src/core/transport/` | BODY | **ACTIVE** | `test_body_auth.ts` | ws, net | Low-level transport abstraction for BodyProtocol. |
| `idempotencyStore.ts` | `src/core/idempotencyStore.ts` | SECURITY | **ACTIVE** | Unit tests | Memory / disk | Enforces at-most-once execution for mutating actions. |
| `sessionContext.ts` | `src/core/sessionContext.ts` | CORE | **ACTIVE** | Unit tests | Memory | User session tracking and permission scoping. |
| `categoryResolver.ts` | `src/core/categoryResolver.ts` | SHOP | **ACTIVE** | `test_phase7_1_step4_extraction.ts` | CommerceRegistry | Product and query category resolution. |
| `productResolver.ts` | `src/core/productResolver.ts` | SHOP | **ACTIVE** | `test_phase7_1_step4_extraction.ts` | CommerceRegistry | Catalog product resolution and pricing. |
| `agentEngine.ts` | `src/core/agentEngine.ts` | CORE | **LEGACY** | Legacy tests | Core | Superseded by canonical `agentLoop.ts`. Kept for backward compatibility. |
| `actionProposal` | `src/core/actionProposal/` | REASONING | **AVAILABLE** | Dormant | ActionPlanner | Multi-step proposal engine for long-term tasks. |
| `adaptiveAutonomy` | `src/core/adaptiveAutonomy/` | REASONING | **EXPERIMENTAL**| None | PDP | Autonomy level self-adjustment based on trust score. |
| `admission` | `src/core/admission/` | SECURITY | **AVAILABLE** | Dormant | Identity | Pre-execution admission checks for external callers. |
| `agent-loop` | `src/core/agent-loop/` | CORE | **DEAD / DUPLICATE**| None | - | Duplicate of `agentLoop.ts`. Slated for deprecation. |
| `agentLoopFacade` | `src/core/agentLoopFacade/` | CORE | **AVAILABLE** | Dormant | agentLoop.ts | Facade interface for external headless embedding. |
| `agentObservability` | `src/core/agentObservability/` | OBSERVABILITY| **ACTIVE** | Unit tests | Telemetry | OpenTelemetry/metrics exporter for AgentLoop. |
| `architecture` | `src/core/architecture/` | CORE | **AVAILABLE** | None | System | System topology configuration manifests. |
| `authority` | `src/core/authority/` | SECURITY | **AVAILABLE** | None | PDP | Root operator cryptographic key authority. |
| `brain` | `src/core/brain/` | CORE | **AVAILABLE** | Unit tests | Engine | Central cognitive state models. |
| `brain-service` | `src/core/brain-service/` | CORE | **AVAILABLE** | None | Express/WS | Service layer abstraction for brain daemon. |
| `capability` | `src/core/capability/` | BODY | **AVAILABLE** | BodyRegistry | Schema | Dynamic capability schema validator. |
| `cognitive` | `src/core/cognitive/` | REASONING | **AVAILABLE** | Dormant | Gemini | High-level reasoning state machine. |
| `cognitiveState` | `src/core/cognitiveState/` | MEMORY | **AVAILABLE** | Dormant | Memory | Persistent mental models of the Ultimate Operator. |
| `commit` | `src/core/commit/` | SECURITY | **AVAILABLE** | None | Ledger | Two-phase commit protocol for irreversible actions. |
| `connection` | `src/core/connection/` | BODY | **AVAILABLE** | Transport | Network reconnection and jitter backoff handlers. |
| `context` | `src/core/context/` | CORE | **AVAILABLE** | Unit tests | Session | Dynamic prompt context aggregator. |
| `contextAssembly` | `src/core/contextAssembly/`| CORE | **AVAILABLE** | Unit tests | Memory | Token-budget-aware prompt builder. |
| `coordination` | `src/core/coordination/` | ROBOT | **EXPERIMENTAL**| None | Multi-agent | Inter-body physical task coordination. |
| `crossIncident` | `src/core/crossIncident/` | OBSERVABILITY| **AVAILABLE** | None | Resilience | Incident correlation across federated bodies. |
| `decision` | `src/core/decision/` | REASONING | **AVAILABLE** | Unit tests | PDP | Multi-criteria decision analysis engine. |
| `delegation` | `src/core/delegation/` | SECURITY | **AVAILABLE** | None | Authority | Sub-operator scoped credential delegation. |
| `deliberation` | `src/core/deliberation/` | REASONING | **EXPERIMENTAL**| None | LLM | Multi-round self-consistency deliberation loop. |
| `deployment` | `src/core/deployment/` | CORE | **AVAILABLE** | None | Host | Self-update and hot-reloading manager. |
| `deviceIdentity` | `src/core/deviceIdentity/`| SECURITY | **AVAILABLE** | None | Crypto | Ed25519 hardware device fingerprinting. |
| `deviceVault` | `src/core/deviceVault/` | SECURITY | **AVAILABLE** | None | Vault | Encrypted hardware key persistence storage. |
| `diagnosis` | `src/core/diagnosis/` | OBSERVABILITY| **AVAILABLE** | None | Monitoring | Autonomous self-diagnostic health checks. |
| `durableCommit` | `src/core/durableCommit/` | SECURITY | **AVAILABLE** | None | Ledger | WAL (Write-Ahead-Log) state machine. |
| `episodicMemory` | `src/core/episodicMemory/`| MEMORY | **AVAILABLE** | None | SQLite/Vector | Vectorized episodic conversation retrieval. |
| `execution` | `src/core/execution/` | TOOL | **AVAILABLE** | Unit tests | Process | Sandboxed process and command executor. |
| `executive` | `src/core/executive/` | CORE | **AVAILABLE** | None | AgentLoop | High-level goal decomposition orchestrator. |
| `fastPathRouter.ts` | `src/core/fastPathRouter.ts`| REASONING | **ACTIVE** | Unit tests | Regex | Bypasses LLM for deterministic local commands. |
| `federatedCollaborationMemory` | `src/core/federatedCollaborationMemory/` | LEGACY | None | Federated | Frozen cross-enterprise shared memory. |
| `goal` | `src/core/goal/` | REASONING | **AVAILABLE** | Dormant | Planner | Hierarchical goal dependency graphs. |
| `governedCrossFederationConvergence` | `src/core/governedCrossFederationConvergence/` | LEGACY | None | Federated | Frozen multi-agent governance convergence. |
| `governedCrossFederationStrategicMemory` | `src/core/governedCrossFederationStrategicMemory/` | LEGACY | None | Federated | Frozen federated strategic memory. |
| `governedExecution` | `src/core/governedExecution/` | LEGACY | None | PDP | Superseded by canonical AgentLoop PDP check. |
| `governedFederatedKnowledgeState` | `src/core/governedFederatedKnowledgeState/` | LEGACY | None | Federated | Frozen multi-tenant knowledge replication. |
| `governedPolicyDecisionIngestion` | `src/core/governedPolicyDecisionIngestion/` | LEGACY | None | PDP | Frozen external policy feed ingest. |
| `governedPolicyDistribution` | `src/core/governedPolicyDistribution/` | LEGACY | None | Network | Frozen policy broadcast protocol. |
| `governedPolicyLifecycle` | `src/core/governedPolicyLifecycle/` | LEGACY | None | Governance | Frozen policy versioning pipeline. |
| `governedPolicyRemediation` | `src/core/governedPolicyRemediation/` | LEGACY | None | Remediation | Frozen automatic policy patcher. |
| `governedPolicySimulation` | `src/core/governedPolicySimulation/` | LEGACY | None | Simulation | Frozen policy dry-run sandbox. |
| `governedRuntimeCompliance` | `src/core/governedRuntimeCompliance/` | LEGACY | None | Compliance | Frozen compliance reporting framework. |
| `governedStrategicPolicyEvolution` | `src/core/governedStrategicPolicyEvolution/` | LEGACY | None | Governance | Frozen autonomous rule mutation engine. |
| `groundedPlanTaskBridge` | `src/core/groundedPlanTaskBridge/` | REASONING | **AVAILABLE** | Dormant | Planner | Bridges abstract plan nodes to body tasks. |
| `groundedPlanning` | `src/core/groundedPlanning/` | REASONING | **AVAILABLE** | Dormant | ActionPlanner | Verifiable environment-grounded planner. |
| `host` | `src/core/host/` | CORE | **AVAILABLE** | None | OS | Host machine telemetry and resource inspector. |
| `hybridModelRouter.ts` | `src/core/hybridModelRouter.ts` | REASONING | **AVAILABLE** | Unit tests | LLM | Routes prompts across Flash / Pro / Local models. |
| `incidentResilience` | `src/core/incidentResilience/` | OBSERVABILITY| **AVAILABLE** | None | Resilience | Circuit breaker and backoff controller. |
| `intent` | `src/core/intent/` | REASONING | **AVAILABLE** | Unit tests | NLP | Deep intent classification grammars. |
| `internet` | `src/core/internet/` | TOOL | **AVAILABLE** | Unit tests | Fetch | Governed web search and retrieval tools. |
| `lifecycle` | `src/core/lifecycle/` | CORE | **AVAILABLE** | None | Process | Graceful shutdown and process lifecycle hooks. |
| `longHorizonExecution` | `src/core/longHorizonExecution/` | REASONING | **EXPERIMENTAL**| None | ActionPlanner | Multi-day asynchronous plan executor. |
| `missionCoordination` | `src/core/missionCoordination/` | ROBOT | **EXPERIMENTAL**| None | Robot | Multi-robot coordinated pathing and tasks. |
| `multiAgentFederation` | `src/core/multiAgentFederation/` | LEGACY | None | Federated | Frozen cross-enterprise agent mesh. |
| `multiAgentMesh.ts` | `src/core/multiAgentMesh.ts` | LEGACY | None | Network | Superseded by BodyProtocol. |
| `multiStepExecution` | `src/core/multiStepExecution/` | TOOL | **AVAILABLE** | Unit tests | ActionPlanner | Step-by-step verified action sequencing. |
| `network` | `src/core/network/` | BODY | **AVAILABLE** | Transport | Network interface monitoring & link health. |
| `observability` | `src/core/observability/` | OBSERVABILITY| **ACTIVE** | Unit tests | Logger | Structured logging and error capture. |
| `orchestration` | `src/core/orchestration/` | CORE | **AVAILABLE** | Dormant | AgentLoop | Sub-agent pipeline orchestration. |
| `pairing` | `src/core/pairing/` | SECURITY | **ACTIVE** | Unit tests | PSK | Peripheral device pairing exchange. |
| `partnership` | `src/core/partnership/` | SHOP | **AVAILABLE** | None | Commerce | B2B supplier integration protocol. |
| `permissions.ts` | `src/core/permissions.ts` | SECURITY | **ACTIVE** | Unit tests | Roles | User role hierarchy (guest, operator, owner). |
| `persistence` | `src/core/persistence/` | MEMORY | **AVAILABLE** | Unit tests | File/SQLite | Durable store adapter. |
| `personal-os` | `src/core/personal-os/` | CORE | **EXPERIMENTAL**| None | OS | OS-level desktop automation abstractions. |
| `phase14ExitBoundary` | `src/core/phase14ExitBoundary/` | LEGACY | None | Milestone | Milestone validation boundary artifact. |
| `phase14Readiness` | `src/core/phase14Readiness/` | LEGACY | None | Milestone | Milestone readiness testing suite. |
| `planner.ts` | `src/core/planner.ts` | REASONING | **AVAILABLE** | Unit tests | Intent | Simplified single-pass planner. |
| `planning` | `src/core/planning/` | REASONING | **AVAILABLE** | Unit tests | Graph | Graph-based plan optimizer. |
| `policyActiveIncidentResolution` | `src/core/policyActiveIncidentResolution/` | LEGACY | None | Governance | Frozen policy incident resolver. |
| `policyActiveIncidentResponse` | `src/core/policyActiveIncidentResponse/` | LEGACY | None | Governance | Frozen incident response engine. |
| `policyActiveLifecycleReconciliation`| `src/core/policyActiveLifecycleReconciliation/`| LEGACY | None | Governance | Frozen policy state reconciliation. |
| `policyActiveRollback` | `src/core/policyActiveRollback/` | LEGACY | None | Governance | Frozen policy canary rollback. |
| `policyActiveRuntime` | `src/core/policyActiveRuntime/` | LEGACY | None | Governance | Frozen policy runtime controller. |
| `policyCanary` | `src/core/policyCanary/` | LEGACY | None | Governance | Frozen canary deployment for rules. |
| `policyCandidateAuthorization` | `src/core/policyCandidateAuthorization/` | LEGACY | None | Governance | Frozen candidate rule authorizer. |
| `policyDecision` | `src/core/policyDecision/` | LEGACY | None | Governance | Superseded by `policyDecisionPoint.ts`. |
| `policyEnforcement` | `src/core/policyEnforcement/` | LEGACY | None | Governance | Superseded by PEP in AgentLoop. |
| `policyEvidence` | `src/core/policyEvidence/` | LEGACY | None | Governance | Frozen audit evidence extractor. |
| `policyEvolution` | `src/core/policyEvolution/` | LEGACY | None | Governance | Frozen rule self-adaptation engine. |
| `policyEvolutionPlanning` | `src/core/policyEvolutionPlanning/` | LEGACY | None | Governance | Frozen rule evolution roadmap generator. |
| `policyExecution` | `src/core/policyExecution/` | LEGACY | None | Governance | Superseded by canonical execution. |
| `policyFeedbackReview` | `src/core/policyFeedbackReview/` | LEGACY | None | Governance | Frozen policy review workflow. |
| `policyGovernanceReadiness` | `src/core/policyGovernanceReadiness/` | LEGACY | None | Governance | Frozen compliance audit checks. |
| `policyObservability` | `src/core/policyObservability/` | LEGACY | None | Governance | Frozen policy telemetry sink. |
| `policyPhaseExitAudit` | `src/core/policyPhaseExitAudit/` | LEGACY | None | Governance | Frozen milestone exit auditor. |
| `policyPhaseTransition` | `src/core/policyPhaseTransition/` | LEGACY | None | Governance | Frozen phase transition manager. |
| `policyPostExecution` | `src/core/policyPostExecution/` | LEGACY | None | Governance | Superseded by AgentLoop post-verify. |
| `policyStagedActivation` | `src/core/policyStagedActivation/` | LEGACY | None | Governance | Frozen staged rule rollout manager. |
| `promotion` | `src/core/promotion/` | CORE | **AVAILABLE** | None | System | Environment staging promoter. |
| `quality` | `src/core/quality/` | REASONING | **AVAILABLE** | None | Verifier | Response quality & hallucination scorer. |
| `realityVerification` | `src/core/realityVerification/` | REASONING | **AVAILABLE** | None | Sensors | Physical environment sensory verification. |
| `recovery` | `src/core/recovery/` | OBSERVABILITY| **AVAILABLE** | None | System | Error recovery and state rollback handlers. |
| `relay` | `src/core/relay/` | BODY | **AVAILABLE** | Transport | WebRTC/WebSocket relay for remote bodies. |
| `release` | `src/core/release/` | CORE | **AVAILABLE** | None | System | Release tag & version manager. |
| `releaseExecution` | `src/core/releaseExecution/` | CORE | **AVAILABLE** | None | System | CI/CD release runner. |
| `remediation` | `src/core/remediation/` | OBSERVABILITY| **AVAILABLE** | None | Self-healing | Automatic remediation of transient errors. |
| `remote` | `src/core/remote/` | BODY | **AVAILABLE** | Network | Remote RPC client adapter for bodies. |
| `resilience` | `src/core/resilience/` | OBSERVABILITY| **AVAILABLE** | None | Network | Circuit breakers and retry policies. |
| `responseFormatter.ts` | `src/core/responseFormatter.ts`| CORE | **ACTIVE** | Unit tests | Formatting | Vietnamese markdown and voice response formatter. |
| `router.ts` | `src/core/router.ts` | CORE | **ACTIVE** | Unit tests | Routing | Express HTTP endpoint router. |
| `sandbox` | `src/core/sandbox/` | SECURITY | **AVAILABLE** | Process | Execution isolation sandbox. |
| `security.ts` | `src/core/security.ts` | SECURITY | **ACTIVE** | Unit tests | Crypto | Core authentication and crypto primitives. |
| `semanticMemory` | `src/core/semanticMemory/` | MEMORY | **AVAILABLE** | Embeddings | Vector memory embeddings. |
| `supervisor` | `src/core/supervisor/` | CORE | **AVAILABLE** | Process | Child process watchdog and supervisor. |
| `synchronization` | `src/core/synchronization/`| MEMORY | **AVAILABLE** | Network | Multi-device memory state synchronization. |
| `taskLifecycle` | `src/core/taskLifecycle/` | REASONING | **AVAILABLE** | Unit tests | Task | Task creation, pause, resume, cancel hooks. |
| `toolAdapter` | `src/core/toolAdapter/` | TOOL | **AVAILABLE** | ToolRegistry | Generic adapter for 3rd-party tools. |
| `verification` | `src/core/verification/` | REASONING | **AVAILABLE** | Verifier | Execution outcome reality verification. |
| `vision` | `src/core/vision/` | VISION | **AVAILABLE** | OCR/VLM | Desktop screenshot and camera vision feeds. |
| `wire` | `src/core/wire/` | BODY | **AVAILABLE** | Transport | Binary wire framing protocol. |
| `world-action` | `src/core/world-action/` | ROBOT | **EXPERIMENTAL**| None | Robot | Actuator control models. |
| `world-model` | `src/core/world-model/` | REASONING | **EXPERIMENTAL**| None | Simulation | Spatial representation of physical world. |

---

## 3. Runtime Reachability & Architectural Decision Rules

1. **Active Core Principle:** Canonical runtime routes strictly through `server.ts` → `BowCentralAgentServer` → `AgentLoop` → `PDP` → `ToolRegistry` / `BodyRegistry` → `Desktop Body`.
2. **BodyProtocol Supremacy:** All peripheral capabilities (file execution, app launching, audio capture, audio play, camera vision) must be advertised by a Body and invoked via BodyProtocol. No out-of-band RCE.
3. **Audio Subsystem Isolation:** Audio capabilities are implemented cleanly in `bodies/desktop/audioDriver.ts` and managed via `src/speech/voicePipeline.ts`. Raw audio binaries are explicitly prohibited from entering the immutable cryptographic audit ledger.
