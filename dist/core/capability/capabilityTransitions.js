// src/core/capability/capabilityTransitions.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Capability State Transition Matrix and invariant validation.
export const VALID_CAPABILITY_TRANSITIONS = {
    AVAILABLE: ['DEGRADED', 'UNAVAILABLE', 'REQUIRES_AUTHORIZATION', 'REQUIRES_APPROVAL', 'DISABLED', 'FAILED'],
    DEGRADED: ['AVAILABLE', 'UNAVAILABLE', 'FAILED', 'DISABLED'],
    UNAVAILABLE: ['AVAILABLE', 'DEGRADED', 'FAILED', 'UNSUPPORTED'],
    REQUIRES_AUTHORIZATION: ['AVAILABLE', 'DEGRADED', 'FAILED', 'DISABLED'],
    REQUIRES_APPROVAL: ['AVAILABLE', 'DEGRADED', 'FAILED', 'DISABLED'],
    UNSUPPORTED: ['AVAILABLE'],
    DISABLED: ['AVAILABLE', 'UNAVAILABLE'],
    FAILED: ['AVAILABLE', 'DEGRADED', 'UNAVAILABLE'],
};
export function isValidCapabilityTransition(from, to) {
    if (from === to)
        return true;
    const allowed = VALID_CAPABILITY_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}
export function assertValidCapabilityTransition(from, to, capabilityId) {
    if (!isValidCapabilityTransition(from, to)) {
        throw new Error(`INVALID_CAPABILITY_TRANSITION: Capability ${capabilityId ?? 'unknown'} cannot transition from "${from}" to "${to}".`);
    }
}
