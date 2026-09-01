// src/index.ts
// BOW AGENT V3.3 — STANDALONE AGENT ENGINE PUBLIC API

// 1. Contracts & Provider Interfaces
export * from './contracts/index.js';

// 2. Core Agent Engine & Types
export * from './core/types.js';
export * from './core/agentEngine.js';
export * from './core/intentResolver.js';
export * from './core/actionPlanner.js';
export * from './core/actionValidator.js';
export * from './core/permissions.js';
export * from './core/responseFormatter.js';
export * from './core/sessionContext.js';
export * from './core/tools.js';
export * from './core/productResolver.js';
export * from './core/categoryResolver.js';

// 3. Monitoring & Analytics
export * from './monitoring/analyticsTypes.js';
export * from './monitoring/agentAnalytics.js';
export * from './monitoring/agentEvents.js';
export * from './monitoring/analyticsSanitizer.js';
export * from './monitoring/demandAggregator.js';

// 4. Knowledge Operations & Intelligence
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

// 5. Production Operations & Reliability
export * from './production/productionCapacityService.js';
export * from './production/productionCircuitBreaker.js';
export * from './production/productionFallbackService.js';
export * from './production/productionHealthService.js';
export * from './production/productionIncidentService.js';
export * from './production/productionRollbackService.js';
export * from './production/productionRolloutService.js';
export * from './production/productionSloService.js';
export * from './production/productionTelemetryService.js';

// 6. Gemini Integration
export * from './gemini/config.js';
export * from './gemini/geminiClient.js';
export * from './gemini/geminiPrompt.js';
export * from './gemini/geminiTools.js';
