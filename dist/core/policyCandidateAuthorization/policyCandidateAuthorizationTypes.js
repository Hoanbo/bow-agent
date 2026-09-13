// src/core/policyCandidateAuthorization/policyCandidateAuthorizationTypes.ts
// BOWCON V4.0 — MS-1.3.69: GOVERNED CANDIDATE AUTHORIZATION & ACTIVATION READINESS LAYER
//
// Canonical type definitions, branded identifiers, and immutable DTO contracts for
// governed candidate authorization, independent revalidation, explicit human review gates,
// activation readiness evaluation, durable isolated decision persistence, and cryptographic provenance.
//
// Authority Invariants:
// - CANDIDATE_DRAFT != CANDIDATE_VALIDATION
// - CANDIDATE_VALIDATION != HUMAN_AUTHORIZATION
// - HUMAN_AUTHORIZATION != ACTIVATION_READINESS
// - ACTIVATION_READINESS != POLICY_MUTATION
// - AUTHORIZE != ACTIVE_POLICY
// - READY_FOR_ACTIVATION != ACTIVATED
// - NO AUTONOMOUS AUTHORIZATION (HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION)
// - NO AUTONOMOUS ACTIVATION
// - NO AUTONOMOUS PROMOTION
// - NO AUTONOMOUS ROLLBACK
// - NO DIRECT POLICY MUTATION
// - NO DIRECT TOOL EXECUTION
// - USER_STOP > EVERYTHING
export function createCandidateAuthorizationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_CANDIDATE_AUTHORIZATION_ID: raw authorization id must be a non-empty string');
    }
    return raw;
}
export function createAuthorizationDecisionId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_AUTHORIZATION_DECISION_ID: raw decision id must be a non-empty string');
    }
    return raw;
}
export function createActivationReadinessId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ACTIVATION_READINESS_ID: raw readiness id must be a non-empty string');
    }
    return raw;
}
export function createAuthorizationProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_AUTHORIZATION_PROVENANCE_ID: raw provenance id must be a non-empty string');
    }
    return raw;
}
export function createAuthorizationRequestId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_AUTHORIZATION_REQUEST_ID: raw request id must be a non-empty string');
    }
    return raw;
}
