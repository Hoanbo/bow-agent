// src/index.ts
// BOW AGENT V3.3 — AUTONOMOUS CENTRAL BRAIN RUNTIME PUBLIC API
// 1. Contracts & Provider Interfaces
export * from './contracts/index.js';
// 2. Core Agent Engine & Architecture
export * from './core/types.js';
export * from './core/agentEngine.js';
export * from './core/engine.js';
export * from './core/router.js';
export * from './core/planner.js';
export * from './core/security.js';
export * from './core/memory.js';
export * from './core/intentResolver.js';
export * from './core/actionPlanner.js';
export * from './core/actionValidator.js';
export * from './core/permissions.js';
export * from './core/responseFormatter.js';
export * from './core/sessionContext.js';
export * from './core/tools.js';
export * from './core/productResolver.js';
export * from './core/categoryResolver.js';
export * from './core/fastPathRouter.js';
// 3. Extensible Tools, Plugins & Desktop Vision
export * from './tools/registry.js';
export * from './tools/shopTools.js';
export * from './tools/desktopTools.js';
export * from './desktop/screenVisionService.js';
export * from './desktop/chatReplyService.js';
export * from './desktop/codeSandboxService.js';
// 4. Hybrid Edge-Cloud LLM & Offline Inference
export * from './llm/localLlmProvider.js';
export * from './llm/hybridLlmRouter.js';
// 5. Vietnamese Voice Processing Hub (Local Piper & Whisper)
export * from './speech/ttsEngine.js';
export * from './speech/sttEngine.js';
export * from './speech/fullDuplexAudioHub.js';
// 6. Embodied Physical AI, Smart Home & Watchdog Hub
export * from './embodied/physicalVisionService.js';
export * from './embodied/smartHomeService.js';
export * from './embodied/watchdogDaemon.js';
// 7. Multi-Channel Inbound Adapters
export * from './adapters/webAdapter.js';
export * from './adapters/robotAdapter.js';
export * from './adapters/desktopAdapter.js';
// 6. Knowledge Governance & Operations
export * from './knowledge/knowledgeBase.js';
export * from './knowledge/gapDetector.js';
export * from './knowledge/negativePolicy.js';
export * from './knowledge/intelligence.js';
export * from './knowledge/actionCenter.js';
export * from './knowledge/knowledgeActionService.js';
export * from './knowledge/knowledgeAlertService.js';
export * from './knowledge/knowledgeAnomalyService.js';
export * from './knowledge/knowledgeDriftService.js';
export * from './knowledge/knowledgeGapAggregator.js';
export * from './knowledge/knowledgeGapDetector.js';
export * from './knowledge/knowledgeGovernanceService.js';
export * from './knowledge/knowledgeIntelligenceService.js';
export * from './knowledge/knowledgeQaService.js';
export * from './knowledge/knowledgeReviewService.js';
export * from './knowledge/negativePolicyService.js';
// 7. Monitoring & Analytics
export * from './monitoring/analyticsTypes.js';
export * from './monitoring/agentAnalytics.js';
export * from './monitoring/agentEvents.js';
export * from './monitoring/analyticsSanitizer.js';
export * from './monitoring/demandAggregator.js';
// 8. Production Operations & Reliability
export * from './production/productionCapacityService.js';
export * from './production/productionCircuitBreaker.js';
export * from './production/productionFallbackService.js';
export * from './production/productionHealthService.js';
export * from './production/productionIncidentService.js';
export * from './production/productionRollbackService.js';
export * from './production/productionRolloutService.js';
export * from './production/productionSloService.js';
export * from './production/productionTelemetryService.js';
// 9. Gemini Integration
export * from './gemini/config.js';
export * from './gemini/geminiClient.js';
export * from './gemini/geminiPrompt.js';
export * from './gemini/geminiTools.js';
// 10. Runtime Server, Gateway & Config
export * from './config.js';
// export * from './server.js'; // (Server-only Node.js module)
// export * from './gateway.js'; // (Server-only Node.js module)
// 11. BOW Con V4.0 — Embodied Memory, Nightly Hunter & Boss Companion
export * from './embodied/bossMemoryHub.js';
export * from './embodied/bossFeedbackLearner.js';
export * from './embodied/nightlyHunterDaemon.js';
export * from './embodied/morningBriefingService.js';
// 12. BOW Con V4.0 — Phase 2: Dynamic Skills, Sandbox & Hybrid Dual-Brain
export * from './skills/dynamicSkillManager.js';
export * from './desktop/sandboxRunner.js';
export * from './core/hybridModelRouter.js';
// 13. BOW Con V4.0 — Phase 3: Multi-Agent Mesh, Embodied Reflexes & Telegram Gateway
export * from './core/multiAgentMesh.js';
export * from './embodied/soundLocalization.js';
export * from './embodied/oledEmpathyEngine.js';
export * from './gateway/telegramGateway.js';
// 14. BOWCON V4.0 — International Level 4.0 Autonomy Governance & Policy Decision Point (PDP)
export * from './core/policyDecisionPoint.js';
// 15. BOWCON V4.0 — Embodied Robot Physical Safety Controller & Hardware Interlocks
export * from './embodied/robotSafetyController.js';
// 16. BOWCON V4.0 — Milestone 1.2: Core Agent Loop
export * from './core/agentLoop.js';
// 17. BOWCON V4.0 — Milestone 1.3.2: Durable Memory Persistence & Runtime Schema Validation
export * from './core/persistence/durableJsonStore.js';
export * from './embodied/schemas/bossMemorySchemas.js';
// 18. BOWCON V4.0 — Milestone 1.3.3: Multi-User Durable Memory Partitioning
export * from './core/persistence/userPartitionResolver.js';
// 19. BOWCON V4.0 — Milestone 1.3.4: Multi-Tenant Approval & Idempotency Durable Storage
export * from './core/persistence/governanceSchemas.js';
// 20. BOWCON V4.0 — Milestone 1.3.5 & 1.3.6: Agent Voice Runtime & Conversational TTS
export * from './core/voice/voiceErrors.js';
export * from './core/voice/voiceConfig.js';
export * from './core/voice/voiceCapabilities.js';
export * from './core/voice/voicePersonality.js';
export * from './core/voice/speechSegmenter.js';
export * from './core/voice/speechNumberNormalizer.js';
export * from './core/voice/pronunciationNormalizer.js';
export * from './core/voice/voiceProsody.js';
export * from './core/voice/audioAssembler.js';
export * from './core/voice/speechTextProcessor.js';
export * from './core/voice/providers/ttsProvider.js';
export * from './core/voice/providers/mockTtsProvider.js';
export * from './core/voice/providers/openAiTtsProvider.js';
export * from './core/voice/providers/elevenLabsProvider.js';
export * from './core/voice/voiceService.js';
// 21. BOWCON V4.0 — Milestone 1.3.7: Agent Conversation Context & Intelligent Response Memory
export * from './core/context/conversationContext.js';
export * from './core/context/contextStore.js';
export * from './core/context/contextClassifier.js';
export * from './core/context/topicTracker.js';
export * from './core/context/referenceResolver.js';
export * from './core/context/contextRanker.js';
export * from './core/context/contextCompactor.js';
export * from './core/context/contextManager.js';
// 22. BOWCON V4.0 — Milestone 1.3.8: Intent Understanding & Semantic Action Planning
export * from './core/intent/entityTypes.js';
export * from './core/intent/clarification.js';
export * from './core/intent/intentTypes.js';
export * from './core/intent/entityExtractor.js';
export * from './core/intent/referenceResolver.js';
export * from './core/intent/actionClassifier.js';
export * from './core/intent/semanticValidator.js';
export * from './core/intent/intentParser.js';
export * from './core/intent/intentService.js';
// 23. BOWCON V4.0 — Milestone 1.3.9: Decision & Context-Aware Planning
export * from './core/planning/index.js';
// 24. BOWCON V4.0 — Milestone 1.3.10: Decision Reasoning & Action Selection
export * from './core/decision/index.js';
// 25. BOWCON V4.0 — Milestone 1.3.11: Action Orchestration & Governed Execution Bridge
export * from './core/orchestration/index.js';
// 26. BOWCON V4.0 — Milestone 1.3.12: Governed Tool Execution Runtime & Safe Capability Registry
export * from './core/execution/index.js';
// 27. BOWCON V4.0 — Milestone 1.3.13: Agent State & Lifecycle Management Foundation
export * from './core/lifecycle/index.js';
// 28. BOWCON V4.0 — Milestone 1.3.14: Execution Verification & Postcondition Engine
export * from './core/verification/index.js';
// 29. BOWCON V4.0 — Milestone 1.3.15: Durable Commit & State Consistency Engine
export * from './core/commit/index.js';
// 30. BOWCON V4.0 — Milestone 1.3.16: Brain Recovery & Crash Consistency Engine
export * from './core/recovery/index.js';
// 31. BOWCON V4.0 — Milestone 1.3.17: Brain Coordination & Continuity Foundation
export * from './core/coordination/index.js';
// 32. BOWCON V4.0 — Milestone 1.3.18: Brain Event & State Synchronization Foundation
export * from './core/synchronization/index.js';
// 33. BOWCON V4.0 — Milestone 1.3.19: Brain Message Transport & Remote Connectivity Foundation
export * from './core/transport/index.js';
// 34. BOWCON V4.0 — Milestone 1.3.20: Secure Remote Gateway & Protocol Foundation
export * from './core/remote/index.js';
// 35. BOWCON V4.0 — Milestone 1.3.21: Real Network Adapter & Connection Runtime Foundation
export * from './core/network/index.js';
// 36. BOWCON V4.0 — Milestone 1.3.22: Real Bidirectional Secure Connection & Session Runtime
export * from './core/connection/index.js';
// 37. BOWCON V4.0 — Milestone 1.3.23: Device Pairing & Trust Runtime Foundation
export * from './core/pairing/index.js';
// 38. BOWCON V4.0 — Milestone 1.3.24: Persistent Device Identity & Passwordless Recognition Runtime
export * from './core/deviceIdentity/index.js';
// 39. BOWCON V4.0 — Milestone 1.3.25: Secure Device Credential Vault & Durable Trust Persistence Runtime
export * from './core/deviceVault/index.js';
// 40. BOWCON V4.0 — Milestone 1.3.26: Zero-Trust Always-On Brain Connectivity & Secure Internet Admission Runtime
export * from './core/admission/index.js';
// 41. BOWCON V4.0 — Milestone 1.3.27: Secure Always-On Brain Relay & Remote Session Runtime
export * from './core/relay/index.js';
// 42. BOWCON V4.0 — Milestone 1.3.28: Secure Real Wire Transport & Relay Gateway Runtime
export * from './core/wire/index.js';
// 43. BOWCON V4.0 — Milestone 1.3.29: Production Secure Internet Edge & TLS Relay Runtime
export * from './core/internet/index.js';
// 44. BOWCON V4.0 — Milestone 1.3.30: Real BOWCON Brain Runtime Foundation
export * from './core/brain/index.js';
// 45. BOWCON V4.0 — Milestone 1.3.31: Real BOWCON Brain Service & Continuous Runtime
export * from './core/brain-service/index.js';
