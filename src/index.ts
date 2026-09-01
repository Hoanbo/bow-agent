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

// 3. Extensible Tools & Plugins
export * from './tools/registry.js';
export * from './tools/shopTools.js';
export * from './tools/desktopTools.js';

// 4. Vietnamese Voice Processing Hub
export * from './speech/ttsEngine.js';
export * from './speech/sttEngine.js';

// 5. Multi-Channel Inbound Adapters
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
export * from './server.js';
export * from './gateway.js';
