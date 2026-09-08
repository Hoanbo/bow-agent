// src/core/world-action/worldActionTypes.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Canonical data contracts, type envelopes, and interfaces for the governed
// physical host execution layer.
//
// INVARIANTS:
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// INTENT != AUTHORIZATION
// PLAN != AUTHORIZATION
// PREVIEW != EXECUTION
// REQUEST != AUTHORIZATION
// AUTHORIZATION != TOOL_EXECUTION
// TOOL_EXECUTION != VERIFICATION
// VERIFICATION != COMMIT
// PREVIOUS_APPROVAL != CURRENT_APPROVAL
import crypto from 'node:crypto';
export const WORLD_ACTION_RISK_PRECEDENCE = {
    OBSERVE: 1,
    LOW: 2,
    REVERSIBLE: 3,
    ELEVATED: 4,
    HIGH: 5,
    CRITICAL: 6,
};
// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------
export function hashParameters(params) {
    const sorted = JSON.stringify(params, Object.keys(params || {}).sort());
    return crypto.createHash('sha256').update(sorted).digest('hex');
}
export function generateWorldActionId() {
    const ts = Date.now().toString(36);
    const rnd = crypto.randomBytes(6).toString('hex');
    return `act_${ts}_${rnd}`;
}
export function generateTokenId() {
    const ts = Date.now().toString(36);
    const rnd = crypto.randomBytes(6).toString('hex');
    return `tok_${ts}_${rnd}`;
}
export function generateExecutionId() {
    const ts = Date.now().toString(36);
    const rnd = crypto.randomBytes(6).toString('hex');
    return `exec_${ts}_${rnd}`;
}
