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
// 46. BOWCON V4.0 — Milestone 1.3.32: Real BOWCON Cognitive Provider & Local Intelligence Runtime
export * from './core/cognitive/index.js';
// 47. BOWCON V4.0 — Milestone 1.3.33: Real BOWCON World Action & Governed Execution Runtime
export * from './core/world-action/index.js';
// 48. BOWCON V4.0 — Milestone 1.3.34: Real BOWCON Capability & Environment Interaction Runtime
export * from './core/capability/index.js';
// 49. BOWCON V4.0 — Milestone 1.3.35: Real BOWCON Supervisory Autonomous Recovery & Human Governance Runtime
export * from './core/supervisor/index.js';
// 50. BOWCON V4.0 — Milestone 1.3.36: Real BOWCON Continuous Agent Operating Loop & Controlled Autonomy Runtime
export * from './core/agent-loop/index.js';
// 51. BOWCON V4.0 — Milestone 1.3.37: Real BOWCON Executive Task & Long-Horizon Goal Orchestration Runtime
export * from './core/executive/index.js';
// 52. BOWCON V4.0 — Milestone 1.3.38: Master Human Authority & Unified Executive Governance Runtime
export * from './core/authority/index.js';
// 53. BOWCON V4.0 — Milestone 1.3.39: Master Owner Cognitive Partnership & Persistent Personal Intelligence Runtime
export * from './core/partnership/index.js';
// 54. BOWCON V4.0 — Milestone 1.3.40: Master Owner Personal Operating System & Proactive Cognitive Agency Runtime
export * from './core/personal-os/index.js';
// 55. BOWCON V4.0 — Milestone 1.3.41: Master Architecture Identity, Host Abstraction & Capability-Aware Core
export * from './core/architecture/index.js';
export * from './core/host/index.js';
// 56. BOWCON V4.0 — Milestone 1.3.42: Master Owner World Model, Self-Awareness & Capability-Grounded Reasoning Runtime
export * from './core/world-model/index.js';
// 57. BOWCON V4.0 — Milestone 1.3.43: Master Owner Cognitive Resilience, Adaptive Host Orchestration & Self-Reflective Episodic Synthesis
export * from './core/resilience/index.js';
// 58. BOWCON V4.0 — Milestone 1.3.45: Master Owner Delegation Governance, Multi-Agent Federation & Authority Lease Architecture
export * from './core/delegation/index.js';
export { createReconciliationId } from './core/incidentResilience/index.js';
export { createReconciliationId as createPolicyReconciliationId } from './core/policyPostExecution/index.js';
export { HARD_FORBIDDEN_ACTIONS } from './core/policyDecision/index.js';
export { HARD_FORBIDDEN_ACTIONS as POLICY_EVOLUTION_HARD_FORBIDDEN_ACTIONS } from './core/policyEvolutionPlanning/index.js';
// 59. BOWCON V4.0 — Milestone 1.3.47: Governed Autonomous Project Sandbox & Controlled Worktree Isolation
export * from './core/sandbox/index.js';
// 60. BOWCON V4.0 — Milestone 1.3.48: Controlled Change Promotion & Governed Project Integration
export * from './core/promotion/index.js';
// 61. BOWCON V4.0 — Milestone 1.3.49: Governed Project Build, Test & Continuous Quality Gate Pipeline
// 61. BOWCON V4.0 — Mốc 1.3.49: Đường ống Dựng Dự án, Kiểm thử & Cổng Chất lượng Liên tục Có quản trị
export * from './core/quality/index.js';
// 62. BOWCON V4.0 — Milestone 1.3.50: Governed Continuous Integration & Milestone Release Verification Pipeline
// 62. BOWCON V4.0 — Mốc 1.3.50: Đường ống Tích hợp Liên tục & Xác minh Phát hành Mốc Có quản trị
export * from './core/release/index.js';
// 63. BOWCON V4.0 — Milestone 1.3.51: Governed Release Execution & Authorized Deployment Boundary
// 63. BOWCON V4.0 — Mốc 1.3.51: Ranh giới Thực thi Phát hành Có quản trị & Triển khai Được ủy quyền
export * from './core/releaseExecution/index.js';
// 64. BOWCON V4.0 — Milestone 1.3.52: Governed Production Deployment & Canary Verification Pipeline
// 64. BOWCON V4.0 — Mốc 1.3.52: Đường ống Triển khai Sản xuất & Xác minh Canary Có quản trị
export * from './core/deployment/index.js';
// 65. BOWCON V4.0 — Milestone 1.3.53: Governed Post-Deployment Autonomous Verification, Drift Detection & Observability Telemetry Mesh
// 65. BOWCON V4.0 — Mốc 1.3.53: Lưới Đo từ xa Quan sát, Xác minh Tự động & Phát hiện Sai lệch Sau Triển khai Có quản trị
export * from './core/observability/index.js';
// 66. BOWCON V4.0 — Milestone 1.3.54: Governed Autonomous Self-Diagnosis, Incident Classification & Supervisor Decision-Support Synthesis
// 66. BOWCON V4.0 — Mốc 1.3.54: Tự Chẩn đoán Có quản trị, Phân loại Sự cố & Tổng hợp Hỗ trợ Quyết định Giám sát viên
export * from './core/diagnosis/index.js';
// 67. BOWCON V4.0 — Milestone 1.3.55: Governed Incident Remediation, Authorized Recovery Execution & Closed-Loop Post-Mitigation Verification Pipeline
// 67. BOWCON V4.0 — Mốc 1.3.55: Đường ống Khắc phục Sự cố Có quản trị, Thực thi Phục hồi Được ủy quyền & Xác minh Sau Giảm thiểu Vòng lặp Kín
export * from './core/remediation/index.js';
// 68. BOWCON V4.0 — Milestone 1.3.56: Governed Post-Remediation Resilience, Recovery Outcome Analysis & Incident Lifecycle Closure Pipeline
// 68. BOWCON V4.0 — Mốc 1.3.56: Đường ống Khả năng Phục hồi Sau Khắc phục, Phân tích Kết quả Phục hồi & Đóng Vòng đời Sự cố Có quản trị
export * from './core/incidentResilience/index.js';
// 69. BOWCON V4.0 — Milestone 1.3.57: Governed Cross-Incident Intelligence, Historical Pattern Correlation & Operational Resilience Memory
// 69. BOWCON V4.0 — Mốc 1.3.57: Tình báo Liên Sự cố Có quản trị, Tương quan Mẫu Lịch sử & Bộ nhớ Phục hồi Vận hành
export * from './core/crossIncident/index.js';
// 70. BOWCON V4.0 — Milestone 1.3.58: Governed Operational Policy Evolution, Guardrail Calibration & Counterfactual Resilience Verification Pipeline
// 70. BOWCON V4.0 — Mốc 1.3.58: Đường ống Tiến hóa Chính sách Vận hành Có quản trị, Hiệu chuẩn Biên giới Bảo vệ & Xác minh Khả năng Phục hồi Phản thực tế
export * from './core/policyEvolution/index.js';
// 71. BOWCON V4.0 — Milestone 1.3.59: Governed Runtime Policy Enforcement Point (PEP), Dynamic PDP Synchronization & Live Guardrail Execution Pipeline
// 71. BOWCON V4.0 — Mốc 1.3.59: Điểm Thực thi Chính sách Thời gian chạy Có quản trị (PEP), Đồng bộ hóa PDP Động & Đường ống Thực thi Rào chắn Trực tiếp
export * from './core/policyEnforcement/index.js';
// 72. BOWCON V4.0 — Milestone 1.3.60: Governed Real-Time Policy Canary Verification & Multi-Ring Rollout Pipeline
// 72. BOWCON V4.0 — Mốc 1.3.60: Đường ống Kiểm chứng Canary Chính sách Thời gian thực & Triển khai Đa vòng Có quản trị
export * from './core/policyCanary/index.js';
// 73. BOWCON V4.0 — Milestone 1.3.62: Governed Policy Operational Observability, Governance Evidence & Runtime Integrity Audit Layer
// 73. BOWCON V4.0 — Mốc 1.3.62: Lớp Quan sát Vận hành Chính sách Có quản trị, Bằng chứng Quản trị & Kiểm toán Toàn vẹn Thời gian chạy
export * from './core/policyObservability/index.js';
// 74. BOWCON V4.0 — Milestone 1.3.63: Governed Policy Evidence Query, Audit Correlation & Integrity Verification Layer
// 74. BOWCON V4.0 — Mốc 1.3.63: Lớp Truy vấn Bằng chứng Chính sách Có quản trị, Tương quan Kiểm toán & Xác minh Toàn vẹn
export * from './core/policyEvidence/index.js';
// 75. BOWCON V4.0 — Milestone 1.3.64: Governed Policy Decision & Controlled Remediation Layer
// 75. BOWCON V4.0 — Mốc 1.3.64: Lớp Quyết định Chính sách Có quản trị & Khắc phục Có kiểm soát
export * from './core/policyDecision/index.js';
// 76. BOWCON V4.0 — Milestone 1.3.65: Governed Remediation Execution & Outcome Verification Layer
// 76. BOWCON V4.0 — Mốc 1.3.65: Lớp Thực thi Khắc phục Có quản trị & Xác minh Kết quả
export * from './core/policyExecution/index.js';
// 77. BOWCON V4.0 — Milestone 1.3.66: Governed Post-Execution Reconciliation, Impact Analysis & Policy Feedback Proposal Layer
// 77. BOWCON V4.0 — Mốc 1.3.66: Lớp Điều hòa Sau Thực thi Có quản trị, Phân tích Tác động & Đề xuất Phản hồi Chính sách
export * from './core/policyPostExecution/index.js';
// 78. BOWCON V4.0 — Milestone 1.3.67: Governed Feedback Review, Policy Evolution Intake & Human Review Queue Layer
// 78. BOWCON V4.0 — Mốc 1.3.67: Lớp Đánh giá Phản hồi Có quản trị, Nạp Tiến hóa Chính sách & Hàng đợi Đánh giá Con người
export * from './core/policyFeedbackReview/index.js';
// 79. BOWCON V4.0 — Milestone 1.3.68: Governed Policy Evolution Planning & Candidate Synthesis Layer
// 79. BOWCON V4.0 — Mốc 1.3.68: Lớp Lập kế hoạch Tiến hóa Chính sách Có quản trị & Tổng hợp Ứng viên
export * from './core/policyEvolutionPlanning/index.js';
// 80. BOWCON V4.0 — Milestone 1.3.69: Governed Candidate Authorization & Activation Readiness Layer
// 80. BOWCON V4.0 — Mốc 1.3.69: Lớp Ủy quyền Ứng viên Có quản trị & Sẵn sàng Kích hoạt
export * from './core/policyCandidateAuthorization/index.js';
// 81. BOWCON V4.0 — Milestone 1.3.70: Governed Staged Policy Activation Layer
// 81. BOWCON V4.0 — Mốc 1.3.70: Lớp Kích hoạt Chính sách Theo giai đoạn Có quản trị
export * from './core/policyStagedActivation/index.js';
// 82. BOWCON V4.0 — Milestone 1.3.71: Governed Active Policy Runtime Synchronization & Enforcement Bridge
// 82. BOWCON V4.0 — Mốc 1.3.71: Cầu nối Đồng bộ & Thực thi Thời gian chạy Chính sách Hoạt động Có quản trị
export * from './core/policyActiveRuntime/index.js';
// 83. BOWCON V4.0 — Milestone 1.3.72: Governed Active Policy Rollback, Sunset & Recovery Boundary
// 83. BOWCON V4.0 — Mốc 1.3.72: Ranh giới Quay lui, Hết hạn & Khôi phục Chính sách Hoạt động Có quản trị
export * as policyActiveRollback from './core/policyActiveRollback/index.js';
export { createActiveRollbackRequestId, createRollbackTargetId, createRollbackEvaluationId, createSunsetRequestId, createSunsetEvaluationId, createRecoveryRequestId, createRecoveryEvaluationId, createRollbackCommitId, createSunsetCommitId, createRecoveryCommitId, createRollbackProvenanceId, ROLLBACK_HARD_FORBIDDEN_ACTIONS, PolicyActiveRollbackStore, PolicyRollbackTargetResolver, PolicyRollbackRevalidationEngine, PolicySunsetEvaluationEngine, PolicyRecoveryEvaluationEngine, PolicyGovernedRollbackBoundary, PolicyRollbackStateTransitionEngine, PolicyActiveRollbackProvenanceEngine, PolicyActiveRollbackAuditEngine, PolicyActiveRollbackRuntime, POLICY_ACTIVE_ROLLBACK_AUDIT_DOMAIN, } from './core/policyActiveRollback/index.js';
// 84. BOWCON V4.0 — Mốc 1.3.73: Điều hòa Vòng đời & Xác minh Tính nhất quán Chính sách Hoạt động Có quản trị
export * as policyActiveLifecycleReconciliation from './core/policyActiveLifecycleReconciliation/index.js';
export { createLifecycleReconciliationId, createLifecycleConsistencyCheckId, createLifecycleDriftId, createRuntimeConsistencyId, createLifecycleVerificationId, createReconciliationProvenanceId, PolicyActiveLifecycleStateResolver, PolicyActiveLifecycleVersionConsistencyEngine, PolicyActiveLifecycleRuntimeDriftDetector, PolicyActiveLifecycleRollbackConsistencyEngine, PolicyActiveLifecycleProvenanceConsistencyEngine, PolicyActiveLifecycleTenantConsistencyEngine, PolicyActiveLifecycleConsistencyEngine, PolicyActiveLifecycleReconciliationAuditEngine, PolicyActiveLifecycleReconciliationRuntime, POLICY_ACTIVE_LIFECYCLE_RECONCILIATION_AUDIT_DOMAIN, } from './core/policyActiveLifecycleReconciliation/index.js';
// 85. BOWCON V4.0 — Mốc 1.3.74: Phản ứng Sự cố Chính sách Hoạt động, Phát hiện Suy thoái & Ranh giới An toàn Khẩn cấp Có quản trị
export * as policyActiveIncidentResponse from './core/policyActiveIncidentResponse/index.js';
export { createActiveIncidentId, createIncidentDetectionId, createDegradationEventId, createSafetyBoundaryActivationId, createIncidentEscalationId, createIncidentResolutionId, createIncidentProvenanceId, PolicyActiveIncidentSignalResolver, PolicyActivePolicyDegradationDetector, PolicyActiveIncidentClassifier, PolicyEmergencySafetyBoundary, PolicyIncidentEscalationEngine, PolicyActiveIncidentStore, PolicyActiveIncidentProvenanceEngine, PolicyActiveIncidentAuditEngine, PolicyActiveIncidentResponseRuntime, POLICY_ACTIVE_INCIDENT_RESPONSE_AUDIT_DOMAIN, } from './core/policyActiveIncidentResponse/index.js';
// 86. BOWCON V4.0 — Mốc 1.3.75: Giải quyết Sự cố Chính sách Hoạt động, Xóa bỏ Phong tỏa & Ranh giới Ủy quyền Phục hồi Có quản trị
export * as policyActiveIncidentResolution from './core/policyActiveIncidentResolution/index.js';
export { createIncidentResolutionRequestId, createContainmentAssessmentId, createContainmentClearanceId, createRecoveryAuthorizationId, createRecoveryHandoffId, createRecoveryVerificationId, createResolutionConfirmationId, createIncidentClosureId, createResolutionProvenanceId, PolicyIncidentResolutionRevalidationEngine, PolicyContainmentAssessmentEngine, PolicyContainmentClearanceBoundary, PolicyRecoveryAuthorizationEngine, PolicyIncidentRecoveryHandoffEngine, PolicyIncidentRecoveryVerificationEngine, PolicyIncidentResolutionEngine, PolicyIncidentClosureBoundary, PolicyActiveIncidentResolutionStore, PolicyActiveIncidentResolutionProvenanceEngine, PolicyActiveIncidentResolutionAuditEngine, PolicyActiveIncidentResolutionRuntime, POLICY_ACTIVE_INCIDENT_RESOLUTION_AUDIT_DOMAIN, } from './core/policyActiveIncidentResolution/index.js';
// 87. BOWCON V4.0 — Mốc 1.3.76: Đánh giá Mức độ Sẵn sàng & Cổng Thoát Giai đoạn Có Điều kiện
export * as policyGovernanceReadiness from './core/policyGovernanceReadiness/index.js';
export { createAssessmentId, createCriterionId, createEvidenceId, createReadinessReportId, createReadinessProvenanceId, CANONICAL_READINESS_CRITERIA, getCriterionById, PolicyGovernanceReadinessRepositoryInspector, PolicyGovernanceReadinessIntegrationInspector, PolicyGovernanceReadinessSecurityInspector, PolicyGovernanceReadinessAuthorityInspector, PolicyGovernanceReadinessTenantInspector, PolicyGovernanceReadinessProvenanceInspector, PolicyGovernanceReadinessAuditInspector, PolicyGovernanceReadinessEvidenceEngine, PolicyGovernanceReadinessAssessmentEngine, PolicyGovernanceReadinessReportStore, PolicyGovernanceReadinessAuditEngine, PolicyGovernanceReadinessRuntime, POLICY_GOVERNANCE_READINESS_AUDIT_DOMAIN, PHASE_EXIT_DECLARATION_VALUE, } from './core/policyGovernanceReadiness/index.js';
// 88. BOWCON V4.0 — Mốc 1.3.77: Ranh giới Ủy quyền Thoát Giai đoạn, Chuyển tiếp & Điểm Vào Giai đoạn 1.4
export * as policyPhaseTransition from './core/policyPhaseTransition/index.js';
export { createPhaseExitCandidateId, createPhaseExitAuthorizationId, createPhaseExitCommitId, createPhase14EntryReadinessId, createPhase14EntryAuthorizationId, createPhase14EntryCommitId, createPhaseTransitionProvenanceId, CANONICAL_PHASE_1_4_PREREQUISITES, PolicyPhaseExitReadinessResolver, PolicyPhaseExitCriteriaRevalidator, PolicyPhaseExitReviewEngine, PolicyPhaseExitAuthorizationBoundary, PolicyPhaseExitTransitionEngine, PolicyPhase14EntryReadinessEngine, PolicyPhase14EntryAuthorizationBoundary, PolicyPhase14EntryTransitionEngine, PolicyPhaseTransitionStore, PolicyPhaseTransitionProvenanceEngine, PolicyPhaseTransitionAuditEngine, PolicyPhaseTransitionRuntime, POLICY_PHASE_TRANSITION_AUDIT_DOMAIN, } from './core/policyPhaseTransition/index.js';
// 89. BOWCON V4.0 — Milestone 1.3.78: Independent Phase 1.3 Exit Evidence Audit & Governance Readiness Certification
export { PolicyPhaseExitEvidenceStrengthEngine, PolicyPhaseExitEvidenceCollector, PolicyPhaseExitMilestoneInspector, PolicyPhaseExitIntegrationInspector, PolicyPhaseExitRuntimeInspector, PolicyPhaseExitSecurityInspector, PolicyPhaseExitAuthorityBoundaryInspector, PolicyPhaseExitTenantIsolationInspector, PolicyPhaseExitProvenanceInspector, PolicyPhaseExitAntiCircularityEngine, PolicyPhaseExitIndependentAssessmentEngine, PolicyPhaseExitAuditReportStore, PolicyPhaseExitAuditProvenanceEngine, PolicyPhaseExitAuditEngine, PolicyPhaseExitAuditRuntime, CANONICAL_AUDIT_CRITERIA, POLICY_PHASE_EXIT_EVIDENCE_AUDIT_DOMAIN, AUDIT_PROVENANCE_GENESIS_ANCHOR, createPhaseExitAuditId, createAuditEvidenceId, createAuditCriterionId, createAuditReportId, createAuditProvenanceId, } from './core/policyPhaseExitAudit/index.js';
// 87. BOWCON V4.0 — Milestone 1.4.01: Agent Task Lifecycle & State Engine
export * from './core/taskLifecycle/index.js';
// 88. BOWCON V4.0 — Milestone 1.4.03: Context Assembly & Dynamic Compaction
export * from './core/contextAssembly/index.js';
// 89. BOWCON V4.0 — Milestone 1.4.05: Governed Action Proposal & PDP / PEP Bridge
export * from './core/actionProposal/index.js';
// 90. BOWCON V4.0 — Milestone 1.4.06: Production Tool Adapter Plane
export * from './core/toolAdapter/index.js';
// 91. BOWCON V4.0 — Milestone 1.4.07: Empirical Reality Verification Engine
export * from './core/realityVerification/index.js';
// 92. BOWCON V4.0 — Milestone 1.4.08: Durable Commit Engine
export * from './core/durableCommit/index.js';
// 93. BOWCON V4.0 — Milestone 1.4.09: Episodic Memory & Synthesis
export * from './core/episodicMemory/index.js';
// 94. BOWCON V4.0 — Milestone 1.4.10: Production Agent Loop Façade
export { AGENT_LOOP_FACADE_VERSION, AGENT_LOOP_FACADE_AUDIT_DOMAIN, MAX_LOOP_ITERATIONS, MAX_STEP_ATTEMPTS, MAX_CONSECUTIVE_DENIALS, MAX_TASK_EXECUTION_TIME_MS, AGENT_LOOP_BOUNDS, AgentLoopError, AgentLoopAbortedError, AgentLoopValidationError, AgentLoopSecurityViolationError, AgentLoopConcurrencyError, AgentLoopBudgetExceededError, AgentLoopAuthorizationError, AgentLoopExecutionError, AgentLoopExecutionGate, globalAgentLoopExecutionGate, AgentLoopStateCoordinator, AgentLoopRetryGovernor, AgentLoopSubsystemComposer, ProductionAgentLoopFacade, globalProductionAgentLoopFacade, } from './core/agentLoopFacade/index.js';
// 95. BOWCON V4.0 — Milestone 1.4.11: Agent Task Observability & Distributed Tracing
export { OBSERVABILITY_BOUNDS, AgentObservabilityError, AgentObservabilityAbortedError, AgentObservabilityValidationError, AgentObservabilityConcurrencyError, AgentObservabilitySecurityError, AgentExecutionSpanGate, AgentTraceCollector, AgentTaskTelemetryEmitter, AgentSLOBudgetTracker, AgentObservabilityRuntime, } from './core/agentObservability/index.js';
// 96. BOWCON V4.0 — Milestone 1.4.12: End-to-End Agent Reality Validation & Governed Readiness Assessment
export { PHASE14_CRITERIA_DEFINITIONS, Phase14ReadinessError, Phase14ReadinessAbortedError, Phase14ValidationError, Phase14SecurityError, Phase14ConcurrencyError, Phase14ExecutionGate, ChaosFaultInjector, Phase14ExitCriteriaEvaluator, Phase14ReadinessAssessor, Phase14ReadinessRuntime, } from './core/phase14Readiness/index.js';
// 97. BOWCON V4.0 — Milestone 1.4.13: Phase 1.4 Exit Boundary & Independent Governance Audit
export { CANONICAL_EXIT_CRITERIA_METADATA, Phase14ExitBoundaryError, Phase14AuditAbortedError, Phase14ValidationError as Phase14ExitValidationError, Phase14SecurityError as Phase14ExitSecurityError, Phase14ProvenanceMismatchError, Phase14ContradictionError, Phase14ExitBoundaryGate, IndependentEvidenceCollector, Phase14EvidenceReconciler, Phase14GovernanceAuditEngine, Phase14ExitCertificateRuntime, } from './core/phase14ExitBoundary/index.js';
// 98. BOWCON V4.0 — Milestone 1.5.02: Persistent Cognitive State Engine & Working Registers
export * from './core/cognitiveState/index.js';
// 99. BOWCON V4.0 — Milestone 1.5.03: Local Embedding Engine & Native Dense Vector Semantic Memory
export * from './core/semanticMemory/index.js';
// 100. BOWCON V4.0 — Milestone 1.5.04: Native Goal Formation & Priority Graph Engine
export * from './core/goal/index.js';
// 101. BOWCON V4.0 — Milestone 1.5.05: Native Neuro-Symbolic Deliberation Engine
export * from './core/deliberation/index.js';
// 102. BOWCON V4.0 — Milestone 1.5.06: Native Brain Integration & Screen Vision Localization
export * from './core/vision/index.js';
// 103. BOWCON V4.0 — Milestone 1.5.07: Native Grounded Action Plan Synthesis & Governed Proposal Engine
export * from './core/groundedPlanning/index.js';
// 104. BOWCON V4.0 — Milestone 1.5.08: Native Grounded Plan Execution Preparation & Human Confirmation Gate
export * from './core/groundedPlanTaskBridge/index.js';
// 105. BOWCON V4.0 — Milestone 1.5.09: Native Governed Execution Worker & Lease-Bound Actuation Engine
export { GOVERNED_EXECUTION_SCHEMA_VERSION, DEFAULT_EXECUTION_LEASE_TTL_MS, MAX_EXECUTION_PAYLOAD_BYTES, GovernedExecutionError, ExecutionValidationError, ExecutionAuthorizationError, ExecutionLeaseError, ExecutionTenantIsolationError, ExecutionSessionIsolationError, ExecutionConcurrencyError, ExecutionUserStopError, ExecutionAdapterError, ExecutionPersistenceError, computeLeaseSignatureHash, computeAuthorizationHash, computeRequestHash, computeExecutionResultProvenanceHash, computeExecutionSessionDocumentHash, ExecutionRequestValidator, DANGEROUS_KEYS, PROHIBITED_COT_MARKERS, SUSPICIOUS_INJECTION_PATTERNS, ExecutionAuthorizationVerifier, ExecutionLeaseManager, ExecutionBoundaryGate, SafeInspectionAdapter, DeterministicActuationAdapter, ExecutionResultFailureManager, ExecutionAuditBridge, ExecutionPersistenceRecoveryEngine, GovernedExecutionWorker, } from './core/governedExecution/index.js';
// 106. BOWCON V4.0 — Milestone 1.5.10: Native Governed Multi-Step Execution Orchestration & Continuous Environmental Replanning Engine
export { MAX_EXECUTION_STEPS, MAX_REPLANNING_GENERATIONS, MAX_REPLANS_PER_SESSION, MULTI_STEP_EXECUTION_SCHEMA_VERSION, MultiStepExecutionError, MultiStepExecutionValidationError, MultiStepExecutionAuthorizationError, MultiStepExecutionLeaseError, MultiStepExecutionDependencyError, MultiStepExecutionEnvironmentError, MultiStepExecutionReplanningError, MultiStepExecutionGenerationError, MultiStepExecutionTenantIsolationError, MultiStepExecutionSessionIsolationError, MultiStepExecutionConcurrencyError, MultiStepExecutionUserStopError, MultiStepExecutionPersistenceError, computeGenerationProvenanceHash, computeEnvironmentSnapshotProvenanceHash, computeStepCheckpointProvenanceHash, computeReplanningRequestProvenanceHash, computeMultiStepSessionProvenanceHash, computeMultiStepResultProvenanceHash, computeSessionDocumentProvenanceHash, MultiStepExecutionValidator, ExecutionStepScheduler, ExecutionEnvironmentMonitor, GovernedReplanningEngine, ExecutionGenerationManager, MultiStepExecutionSecurityBoundary, MultiStepExecutionPersistenceRecoveryEngine, GovernedExecutionOrchestrator, } from './core/multiStepExecution/index.js';
// ============================================================================
// 107. MILESTONE 1.5.11: NATIVE GOVERNED LONG-HORIZON AUTONOMOUS ORCHESTRATION ENGINE
// ============================================================================
export { LONG_HORIZON_SCHEMA_VERSION, MAX_LONG_HORIZON_GENERATIONS, MAX_LONG_HORIZON_STEPS, MAX_REPLANNING_ATTEMPTS, MAX_EXECUTION_ATTEMPTS_PER_STEP, MAX_CONSECUTIVE_FAILURES, MAX_STAGNATION_CYCLES, MAX_OBJECTIVE_EXTENSIONS, MAX_PENDING_APPROVALS, MAX_WALL_CLOCK_MS, LongHorizonExecutionError, LongHorizonValidationError, LongHorizonAuthorizationError, LongHorizonBudgetExhaustedError, LongHorizonStagnationError, LongHorizonGenerationError, LongHorizonTenantIsolationError, LongHorizonSessionIsolationError, LongHorizonUserStopError, LongHorizonConcurrencyError, LongHorizonPersistenceError, LongHorizonContinuityError, computeObjectiveProvenanceHash, computeLongHorizonGenerationProvenanceHash, computeLongHorizonProgressProvenanceHash, computeLongHorizonSessionProvenanceHash, computeLongHorizonDocumentProvenanceHash, computeLongHorizonResultProvenanceHash, LongHorizonExecutionValidator, ObjectiveProgressEvaluator, LongHorizonBudgetManager, LongHorizonContinuityManager, LongHorizonAutonomySecurityBoundary, LongHorizonAuditBridge, LongHorizonPersistenceRecoveryEngine, GovernedLongHorizonOrchestrator, } from './core/longHorizonExecution/index.js';
// 68. BOWCON V4.0 — Milestone 1.5.12: Native Governed Adaptive Autonomy, Recovery & Supervised Continuous Operation Engine
export { ADAPTIVE_AUTONOMY_SCHEMA_VERSION, MAX_OPERATIONAL_CYCLES, MAX_RECOVERY_ATTEMPTS, MAX_ADAPTATION_ATTEMPTS, MAX_CONTINUITY_GENERATIONS, MAX_SESSION_DURATION_MS, MAX_CONSECUTIVE_FAILURES as ADAPTIVE_MAX_CONSECUTIVE_FAILURES, MAX_CONSECUTIVE_DEGRADATIONS, AdaptiveAutonomyError, AdaptiveAutonomyValidationError, AdaptiveAutonomyAuthorizationError, AdaptiveAutonomyTenantIsolationError, AdaptiveAutonomySessionIsolationError, AdaptiveAutonomyLeaseError, AdaptiveAutonomyBudgetError, AdaptiveAutonomyRecoveryError, AdaptiveAutonomyAdaptationError, AdaptiveAutonomyConcurrencyError, AdaptiveAutonomyUserStopError, AdaptiveAutonomyEmergencyStopError, AdaptiveAutonomyPersistenceError, AdaptiveAutonomyProvenanceError, AdaptiveAutonomyGovernanceError, computeAuthorizationEnvelopeProvenanceHash, computeHealthEvaluationHash, computeRecoveryAttemptHash, computeAdaptationDecisionHash, computeContinuitySnapshotHash, computeAdaptiveSessionProvenanceHash, AdaptiveAutonomyValidator, SupervisionBudgetManager, OperationalHealthEvaluator, GovernedRecoveryManager, AdaptiveStrategyManager, ContinuityIntegrityManager, AdaptiveAutonomySecurityBoundary, AdaptiveAutonomyAuditPersistenceBridge, GovernedAdaptiveAutonomyOrchestrator, } from './core/adaptiveAutonomy/index.js';
// 69. BOWCON V4.0 — Milestone 1.5.13: Native Governed Mission Coordination, Multi-Objective Prioritization & Supervised Continuation Engine
export { MISSION_COORDINATION_SCHEMA_VERSION, MAX_OBJECTIVES_PER_MISSION, MAX_ACTIVE_OBJECTIVE_SESSIONS, MAX_COORDINATION_CYCLES as MISSION_MAX_COORDINATION_CYCLES, MAX_REASSESSMENTS, MAX_MISSION_DURATION_MS, MAX_OBJECTIVE_RETRIES, MAX_CONSECUTIVE_MISSION_FAILURES, MAX_OBJECTIVE_DEPENDENCY_DEPTH, MAX_STARVATION_CYCLES, MissionCoordinationError, MissionCoordinationValidationError, MissionCoordinationAuthorizationError, MissionCoordinationTenantIsolationError, MissionCoordinationSessionIsolationError, MissionCoordinationScopeViolationError, MissionCoordinationLeaseError, MissionCoordinationBudgetError, MissionCoordinationDependencyError, MissionCoordinationConflictError, MissionCoordinationPriorityError, MissionCoordinationConcurrencyError, MissionCoordinationUserStopError, MissionCoordinationEmergencyStopError, MissionCoordinationPersistenceError, MissionCoordinationProvenanceError, MissionCoordinationGovernanceError, computeMissionAuthorizationHash, computeObjectiveBindingHash, computeObjectiveSelectionHash, computeCoordinationCycleHash, computeMissionSnapshotHash, computeMissionProvenanceHash, computeMissionResultHash, computeMissionAuditHash, MissionCoordinationValidator, MissionObjectiveScheduler, MissionPriorityEngine, MissionConflictResolver, MissionContinuityManager, MissionGovernanceSecurityBoundary, MissionAuditPersistenceBridge, GovernedMissionCoordinator, } from './core/missionCoordination/index.js';
// ============================================================================
// MS-1.5.14: NATIVE GOVERNED MULTI-AGENT FEDERATION, DELEGATION & COLLABORATIVE COORDINATION ENGINE
// ============================================================================
export { MULTI_AGENT_FEDERATION_SCHEMA_VERSION, MAX_AGENTS_PER_FEDERATION, MAX_ACTIVE_FEDERATIONS, MAX_DELEGATION_DEPTH, MAX_DELEGATIONS_PER_FEDERATION, MAX_CAPABILITIES_PER_AGENT, MAX_DELEGATION_REASSESSMENTS, MAX_FEDERATION_COORDINATION_CYCLES, MAX_AGENT_RETRIES, MAX_CONSECUTIVE_FEDERATION_FAILURES, MAX_FEDERATION_DURATION_MS, MAX_MEMBERSHIP_CHANGES_PER_CYCLE, MultiAgentFederationError, MultiAgentFederationValidationError, MultiAgentFederationAuthorizationError, MultiAgentFederationTenantIsolationError, MultiAgentFederationSessionIsolationError, MultiAgentFederationScopeViolationError, MultiAgentFederationLeaseError, MultiAgentFederationBudgetError, MultiAgentFederationDelegationError, MultiAgentFederationConflictError, MultiAgentFederationTrustError, MultiAgentFederationConcurrencyError, MultiAgentFederationUserStopError, MultiAgentFederationEmergencyStopError, MultiAgentFederationPersistenceError, MultiAgentFederationProvenanceError, MultiAgentFederationContinuityError, computeAgentProvenanceHash, computeAgentCapabilityHash, computeDelegationBindingHash, computeDelegationChainHash, computeFederationSnapshotHash, computeFederationResultHash, computeFederationAuditHash, MultiAgentIdentityRegistry, AgentCapabilityRegistry, FederationSecurityBoundary, DelegationConflictResolver, AgentTrustGovernanceEngine, GovernedDelegationEngine, FederationContinuityPersistenceBridge, GovernedAgentFederation, } from './core/multiAgentFederation/index.js';
// ============================================================================
// MS-1.5.19: GOVERNED STRATEGIC POLICY EVOLUTION, ADVISORY MEDIATION & DELIBERATION GATEWAY
// ============================================================================
export { MAX_POLICY_PROPOSALS_PER_TENANT, MAX_ACTIVE_DELIBERATION_SESSIONS, MAX_EVIDENCE_RECORDS_PER_PROPOSAL, MAX_HISTORICAL_PRECEDENTS_PER_PROPOSAL, MAX_SIMULATION_SCENARIOS_PER_ROUND, MAX_SIMULATION_DEPTH, MAX_IMPACT_ANALYSIS_DIMENSIONS, MAX_DELIBERATION_DOSSIER_SIZE_BYTES, MAX_DELIBERATION_SESSION_DURATION_MS, MAX_CONCURRENT_SIMULATIONS, MAX_AUDIT_LOG_RECORDS_PER_SESSION, GOVERNED_STRATEGIC_POLICY_EVOLUTION_INVARIANTS, TERMINAL_POLICY_EVOLUTION_STATES, StrategicPolicyEvolutionBaseError, PolicyMutationViolationError, InvalidProposalLifecycleTransitionError, StrategicPolicyEvolutionOCCConflictError, StrategicPolicySecurityCheckpointError, ConstitutionalInvariantViolationError, UnauthorizedHumanDecisionError, SimulationCeilingExceededError, TenantIsolationViolationError, StrategicPolicyPersistenceError, computePolicyEvolutionProposalHash, computeAdvisoryMediationRecordHash, computePolicyImpactAnalysisHash, computeCounterfactualSimulationHash, computeConstitutionalInvariantEvaluationHash, computeDeliberationDossierHash, computeHumanDecisionRecordHash, computeStrategicPolicyAuditHash, StrategicAdvisoryMediationRegistry, StrategicPolicyEvolutionDeliberationEngine, StrategicPolicyImpactAnalysisEngine, CounterfactualPolicySimulationEngine, ConstitutionalPolicyInvariantEvaluationEngine, HumanDeliberationGateway, PolicyMutationFirewall, StrategicPolicyDeliberationContinuityPersistenceBridge, } from './core/governedStrategicPolicyEvolution/index.js';
// ============================================================================
// MS-1.5.20: GOVERNED POLICY DECISION INGESTION, CANONICAL RATIFICATION & ATOMIC STAGED DEPLOYMENT
// ============================================================================
export { MAX_HANDOFFS_IN_FLIGHT, MAX_CANONICAL_RULES, MAX_SHADOW_EVAL_TRACES, MAX_CANARY_COHORTS, MAX_HANDOFF_TTL_MS, MAX_MUTEX_WAIT_MS, MAX_ROLLBACK_LINEAGE_DEPTH, CANARY_RINGS, TERMINAL_INGESTION_STATES, GOVERNED_POLICY_DECISION_INGESTION_INVARIANTS, GovernedPolicyDecisionIngestionBaseError, PolicyHandoffSchemaValidationError, PolicyHandoffReplayError, HumanDecisionVerificationError, CriticalAffirmationVerificationError, AuthoritativePolicyRatificationError, PolicyCompilationError, PolicyVersionOCCConflictError, PolicyStagedDeploymentError, PolicyRollbackError, PolicyTenantIsolationError as PolicyIngestionTenantIsolationError, PolicyCircuitBreakerTrippedError, PolicyIngestionInterlockActiveError, computeHandoffIntakeHash, computeHumanDecisionTokenHash, computeRatificationRecordHash, computeCanonicalPolicyHash, computeShadowEvaluationReportHash, computePolicyDeploymentRecordHash, computeRollbackRecordHash, computeIngestionAuditHash, PdpPolicyHandoffIntakeGateway, HumanDecisionTokenVerificationEngine, AuthoritativePolicyRatificationEngine, CanonicalStrategicPolicyCompiler, StrategicPolicyVersionStore, StrategicPolicyShadowEvaluationEngine, StrategicPolicyStagedDeploymentController, StrategicPolicyRollbackController, CriticalAuditLedger, GovernedPolicyDecisionIngestionCoordinator, } from './core/governedPolicyDecisionIngestion/index.js';
// ============================================================================
// MS-1.5.21: GOVERNED POLICY LIFECYCLE & OPERATIONAL CONTROL ENGINE
// ============================================================================
export { GOVERNED_POLICY_LIFECYCLE_INVARIANTS, HEALTH_THRESHOLD_DEGRADED, HEALTH_THRESHOLD_CRITICAL, HEALTH_THRESHOLD_RESTORED, MAX_DECISION_LATENCY_OVERHEAD_MS, MAX_LINEAGE_DEPTH, MAX_ACTIVE_INCIDENTS_PER_DOMAIN, MAX_TOKEN_TTL_MS, GENESIS_PREV_HASH, ALL_LIFECYCLE_STATES, TERMINAL_LIFECYCLE_STATES, ACTIVE_OPERATIONAL_STATES, PAUSED_OPERATIONAL_STATES, GovernedPolicyLifecycleBaseError, InvalidLifecycleTransitionError, UnauthorizedLifecycleMutationError, AntiAgentIdentityRejectedError, SecondaryAuthorityRejectedError, PolicyLifecycleOCCConflictError, PolicyLifecycleTenantIsolationError, PolicyLifecycleTerminalStateError, PolicyLifecycleInterlockActiveError, PolicyHealthThresholdError, PolicyIncidentManagementError, PolicyLineageIntegrityError, PolicyOperationalEvidenceError, PolicyLifecycleAuditIntegrityError, canonicalJsonStringify, deepFreeze, computeLifecycleRecordHash, computeHealthReportHash, computeIncidentRecordHash, computeLineageNodeHash, computeEvidenceDossierHash, computeLifecycleAuditHash, PolicyLifecycleStateManager, PolicyHealthObservationEngine, PolicyOperationalIncidentManager, PolicyLifecycleLineageGraph, PolicyOperationalEvidenceDossierEngine, GovernedOperationalControlGateway, PolicyLifecycleInterlockCoordinator, PolicyLifecycleAuditLedger, GovernedPolicyLifecycleCoordinator, } from './core/governedPolicyLifecycle/index.js';
// 123. BOWCON V4.0 — Milestone 1.5.22: Governed Runtime Policy Compliance, Continuous Operational Assurance & Adaptive Safety Control
export { 
// Constants
ASSURANCE_THRESHOLD_COMPLIANT, ASSURANCE_THRESHOLD_DEGRADED, WEIGHT_COMPLIANCE_RATIO, WEIGHT_VIOLATION_PENALTY, WEIGHT_DRIFT_MAGNITUDE, WEIGHT_OBSERVATION_FRESHNESS, FRESHNESS_DECAY_HALF_LIFE_SEC, MAX_SLIDING_WINDOW_OBSERVATIONS, MAX_SLIDING_WINDOW_DURATION_SEC, MAX_CLOCK_SKEW_TOLERANCE_MS, MAX_AUDIT_BATCH_SIZE, GENESIS_PREV_HASH as RUNTIME_COMPLIANCE_GENESIS_PREV_HASH, SEVERITY_WEIGHT_TABLE, MAX_SEVERITY_WEIGHT, GOVERNED_RUNTIME_COMPLIANCE_INVARIANTS, 
// Hash functions
canonicalJsonStringify as canonicalJsonStringifyCompliance, computeSha256 as computeSha256Compliance, computeObservationHash, computeEvaluationHash, computeAssuranceHash, computeDossierFingerprint, computeAuditEventHash as computeRuntimeComplianceAuditEventHash, 
// Typed Errors
RuntimeComplianceError, ObservationSanitizationError, PolicyVersionBindingMismatchError, PolicySnapshotUnavailableError, TemporalClockSkewError, ObservationSequenceError, ObservationReplayError, DeterministicEvaluationError, AssuranceScoringError, PolicyViolationDetectedError, AdaptiveSafetyControlError, AutomatedReactivationForbiddenError, TenantAccessForbiddenError as RuntimeComplianceTenantAccessForbiddenError, RuntimeComplianceAuditLedgerError, EmergencyStopActiveError as RuntimeComplianceEmergencyStopActiveError, SecondaryAuthorityRejectedError as RuntimeComplianceSecondaryAuthorityRejectedError, 
// Components & Classes
RuntimeBehaviorObservationCollector, ActivePolicySnapshotBindingResolver, DeterministicPolicyComplianceEvaluator, ContinuousOperationalAssuranceScorer, PolicyViolationDriftClassifier, GovernedAdaptiveSafetyController, RuntimeComplianceEvidenceDossierEngine, RuntimeComplianceAuditLedger, GovernedRuntimeComplianceModuleIndex, } from './core/governedRuntimeCompliance/index.js';
// ============================================================================
// 10. Governed Policy Remediation, Incident Root-Cause Diagnosis & Adaptive Operational Resilience Engine (MS-1.5.23)
// ============================================================================
export { asRemediationId, asRootCauseDiagnosisId, asCircuitBreakerStateId, asRemediationDossierId, asRemediationAuditRecordId, asHandoffId as asRemediationHandoffId, ALL_ROOT_CAUSE_CATEGORIES, DEFAULT_CIRCUIT_BREAKER_PARAMS, 
// Invariants & Constants
GOVERNED_POLICY_REMEDIATION_INVARIANTS, GENESIS_REMEDIATION_HASH, 
// Typed Errors
GovernedPolicyRemediationBaseError, RemediationAuthorityViolationError, CrossTenantAccessForbiddenError as RemediationCrossTenantAccessForbiddenError, CircuitBreakerOpenError, CircuitBreakerLockoutError, DuplicateRemediationHandoffError, ExpiredRemediationHandoffError, DeterministicDiagnosisError, RemediationEvidenceError, RemediationAuditLedgerError, EmergencyStopActiveError as RemediationEmergencyStopActiveError, SecondaryAuthorityRejectedError as RemediationSecondaryAuthorityRejectedError, UntrustedInputSanitizationError, 
// Hashes & Helpers
canonicalJsonSerialize, computeSha256 as computeRemediationSha256, computeCorrelationHash, computeDiagnosisHash, computeBlastRadiusHash, computeCandidateRemediationHash, computeEvidenceDossierFingerprint, computeAuditEventHash as computeRemediationAuditEventHash, 
// Components & Classes
IncidentComplianceEvidenceCorrelator, DeterministicPolicyRootCauseEngine, PolicyBlastRadiusRiskAnalyzer, GovernedRemediationStrategySynthesizer, OperationalCircuitBreakerAntiThrashingController, ClosedLoopDeliberationHandoffBridge, PolicyRemediationEvidenceDossierEngine, PolicyRemediationAuditLedger, GovernedPolicyRemediationModuleIndex, } from './core/governedPolicyRemediation/index.js';
// ============================================================================
// 11. Governed Policy Simulation, Counterfactual Verification & Pre-Ratification Shadow Evaluation Engine (MS-1.5.24)
// ============================================================================
export { asSimulationSessionId, asCounterfactualEvaluationId, asShadowRunId, asSimulationDossierId, asSimulationAuditRecordId, asSimulationHandoffId, 
// Invariants & Constants
GENESIS_SIMULATION_HASH, MAX_HANDOFF_TTL_MS as MAX_SIMULATION_HANDOFF_TTL_MS, DEFAULT_SIMULATION_DOSSIER_TTL_MS, DEFAULT_FALSE_REJECTION_THRESHOLD, GOVERNED_POLICY_SIMULATION_INVARIANTS, 
// Typed Errors
GovernedPolicySimulationBaseError, SimulationAuthorityViolationError, SimulationCrossTenantAccessForbiddenError, SimulationDeadlockDetectedError, SimulationReplayCorpusCorruptedError, SimulationEmergencyStopActiveError, SimulationSecondaryAuthorityRejectedError, SimulationAuditLedgerIntegrityError, SimulationHandoffExpiredError, DuplicateSimulationHandoffError, SimulationUntrustedInputSanitizationError, SimulationLockTimeoutError, 
// Hashes & Helpers
computeReplayCorpusHash, computeCandidatePolicyHash as computeSimulationCandidatePolicyHash, computeProjectionHash, computeInvariantCheckHash, computeStressHash, computeSimulationDossierFingerprint, computeAuditEventHash as computeSimulationAuditEventHash, sanitizeUntrustedText as sanitizeSimulationUntrustedText, 
// Components & Classes
HistoricalExecutionReplayEngine, CounterfactualAssuranceProjector, CrossDomainPolicyInvariantChecker, SyntheticPolicyStressHarness, ShadowDualEvaluationBridge, SimulationEvidenceDossierEngine, PreRatificationSimulationAdvisoryBridge, PolicySimulationAuditLedger, GovernedPolicySimulationModuleIndex, } from './core/governedPolicySimulation/index.js';
// ============================================================================
// 86. BOWCON V4.0 — Milestone 1.5.25: Governed Cross-Federation Policy Distribution, Node Attestation & Distributed Enforcement Synchronization Engine
// Components 1218-1227
// ============================================================================
export * from './core/governedPolicyDistribution/index.js';
