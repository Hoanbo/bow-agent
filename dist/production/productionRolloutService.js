// src/services/agent/production/productionRolloutService.ts
// BOW AGENT V3.3 — PHASE 7.0: PROGRESSIVE ROLLOUT CONTROLLER
//
// Governs traffic percentage across progressive rollout stages (OFF -> CANARY -> 10% -> 25% -> 50% -> 75% -> 100%).
//
// HARD CONTRACTS:
//   - Zero Auto-Promotion: Stage promotion strictly requires Admin explicit confirmation.
//   - Safety Gates: Blocks promotion if Health Score <= 40, Circuit is OPEN, or Critical Incident is open.
//   - Deterministic Bucketing: Stable hash modulo 100 ensures consistent user experience.
import { assertAdminAuthorized } from '../knowledge/knowledgeActionService.js';
const STAGE_PERCENTAGES = {
    OFF: 0,
    CANARY: 5,
    '10': 10,
    '25': 25,
    '50': 50,
    '75': 75,
    '100': 100,
};
const STAGE_ORDER = ['OFF', 'CANARY', '10', '25', '50', '75', '100'];
let currentRolloutState = {
    currentStage: '100', // Default to 100% in production certified environment
    trafficPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system-init',
    isBlocked: false,
};
// ---------------------------------------------------------------------------
// 1. STATE ACCESS & DETERMINISTIC BUCKETING
// ---------------------------------------------------------------------------
export function getRolloutState() {
    return { ...currentRolloutState };
}
export function shouldRouteToV3(identifier) {
    if (currentRolloutState.currentStage === 'OFF' || currentRolloutState.isBlocked) {
        return false;
    }
    if (currentRolloutState.currentStage === '100') {
        return true;
    }
    // Hash identifier into [0, 99]
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
        hash = (hash << 5) - hash + identifier.charCodeAt(i);
        hash |= 0;
    }
    const bucket = Math.abs(hash) % 100;
    return bucket < currentRolloutState.trafficPercentage;
}
export function updateRolloutStage(options) {
    assertAdminAuthorized(options.adminUserId);
    if (!STAGE_ORDER.includes(options.targetStage)) {
        return { success: false, error: `Invalid stage: ${options.targetStage}`, state: getRolloutState() };
    }
    const currentIdx = STAGE_ORDER.indexOf(currentRolloutState.currentStage);
    const targetIdx = STAGE_ORDER.indexOf(options.targetStage);
    // If promoting (moving forward in pipeline), enforce safety gates
    if (targetIdx > currentIdx) {
        if (options.hasInvariantBreach) {
            currentRolloutState.isBlocked = true;
            currentRolloutState.blockReason = 'Hard invariant breach detected';
            return { success: false, error: 'Promotion blocked: Hard invariant breach', state: getRolloutState() };
        }
        if (options.healthScore !== undefined && options.healthScore <= 40) {
            currentRolloutState.isBlocked = true;
            currentRolloutState.blockReason = `Health score degraded (${options.healthScore} <= 40)`;
            return { success: false, error: 'Promotion blocked: Health score <= 40', state: getRolloutState() };
        }
        if (options.circuitOpen) {
            currentRolloutState.isBlocked = true;
            currentRolloutState.blockReason = 'Circuit breaker is OPEN';
            return { success: false, error: 'Promotion blocked: Circuit breaker is OPEN', state: getRolloutState() };
        }
        if (options.hasCriticalIncident) {
            currentRolloutState.isBlocked = true;
            currentRolloutState.blockReason = 'Critical production incident is unresolved';
            return { success: false, error: 'Promotion blocked: Critical incident open', state: getRolloutState() };
        }
    }
    currentRolloutState = {
        currentStage: options.targetStage,
        trafficPercentage: STAGE_PERCENTAGES[options.targetStage],
        updatedAt: new Date().toISOString(),
        updatedBy: options.adminUserId,
        isBlocked: false,
        blockReason: undefined,
    };
    return { success: true, state: getRolloutState() };
}
export function blockRollout(reason) {
    currentRolloutState.isBlocked = true;
    currentRolloutState.blockReason = reason;
}
export function unblockRollout(adminUserId) {
    assertAdminAuthorized(adminUserId);
    currentRolloutState.isBlocked = false;
    currentRolloutState.blockReason = undefined;
}
export function resetRolloutState() {
    currentRolloutState = {
        currentStage: '100',
        trafficPercentage: 100,
        updatedAt: new Date().toISOString(),
        updatedBy: 'system-reset',
        isBlocked: false,
    };
}
