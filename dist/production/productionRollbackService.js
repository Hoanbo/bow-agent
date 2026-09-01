// src/services/agent/production/productionRollbackService.ts
// BOW AGENT V3.3 — PHASE 7.0: PRODUCTION ROLLBACK ENGINE
//
// Deterministic, audited rollback mechanisms that instantly demote rollout stages
// without impacting orders, payments, wallet transactions, or production knowledge.
//
// HARD CONTRACTS:
//   - Idempotent & Deterministic: Rollbacks execute reliably under any system load.
//   - Zero Invariant Impact: Zero effect on orders, transactions, pricing, or FAQs.
import { getRolloutState, updateRolloutStage } from './productionRolloutService.js';
import { assertAdminAuthorized } from '../knowledge/knowledgeActionService.js';
let rollbackHistory = [];
export function executeRollback(options) {
    assertAdminAuthorized(options.adminUserId);
    const currentState = getRolloutState();
    const targetStage = options.targetStage || 'OFF';
    const record = {
        rollbackId: `rb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        reason: options.reason,
        triggeredBy: options.adminUserId,
        stageBefore: currentState.currentStage,
        stageAfter: targetStage,
        metricsSnapshot: options.metricsSnapshot || {},
        timestamp: new Date().toISOString(),
    };
    // Demote rollout stage
    updateRolloutStage({
        adminUserId: options.adminUserId,
        targetStage,
    });
    rollbackHistory.unshift(record);
    if (rollbackHistory.length > 50) {
        rollbackHistory = rollbackHistory.slice(0, 50);
    }
    return { success: true, record };
}
export function getRollbackHistory() {
    return [...rollbackHistory];
}
export function clearRollbackHistory() {
    rollbackHistory = [];
}
