// src/core/capability/capabilityPermission.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Permission level governance, authorization bounds, and human confirmation triggers.
//
// INVARIANTS:
// CAPABILITY != AUTHORIZATION
// CONFIDENCE != AUTHORIZATION
// A high confidence score (e.g. 0.99) NEVER grants automatic permission.
export function mapRiskToPermission(risk) {
    switch (risk) {
        case 'OBSERVE':
            return 'OBSERVE';
        case 'LOW':
            return 'LOW_RISK';
        case 'REVERSIBLE':
            return 'REVERSIBLE';
        case 'ELEVATED':
            return 'ELEVATED';
        case 'HIGH':
            return 'HIGH_IMPACT';
        case 'CRITICAL':
            return 'CRITICAL';
    }
}
export function requiresAuthorizationToken(level) {
    return level !== 'OBSERVE' && level !== 'LOW_RISK';
}
export function requiresExplicitConfirmation(level) {
    return level === 'ELEVATED' || level === 'HIGH_IMPACT' || level === 'CRITICAL';
}
