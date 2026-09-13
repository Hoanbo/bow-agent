// src/core/policyActiveIncidentResolution/policyActiveIncidentResolutionTypes.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Canonical Contracts & DTOs (Component 841).
// Defines immutable branded types, explicit resolution states, containment assessments,
// recovery authorizations, handoffs, verifications, and closure contracts.
//
// Core Authority Invariants:
// - INCIDENT != INCIDENT_RESOLUTION
// - INCIDENT_RESOLUTION != CONTAINMENT_CLEARANCE
// - CONTAINMENT_CLEARANCE != RECOVERY_AUTHORIZATION
// - RECOVERY_AUTHORIZATION != RECOVERY_EXECUTION
// - RECOVERY_EXECUTION != RECOVERY_VERIFICATION
// - RECOVERY_VERIFICATION != INCIDENT_CLOSURE
// - INCIDENT_CLOSURE != INCIDENT_DELETION
// - CONTAINMENT != POLICY_MUTATION
// - INCIDENT_RESPONSE != POLICY_AUTHORITY
// - INCIDENT_RESOLUTION != POLICY_AUTHORITY
// - RECOVERY_AUTHORIZATION != AUTONOMOUS_AUTHORIZATION
// - PDP != POLICY_AUTHORITY
// - PEP != POLICY_AUTHORITY
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - ZERO AUTONOMOUS INCIDENT CLOSURE
// - ZERO AUTONOMOUS CONTAINMENT CLEARANCE
// - ZERO AUTONOMOUS SAFETY-BOUNDARY DEACTIVATION
// - ZERO DIRECT TOOL EXECUTION
// - ZERO DIRECT POLICY MUTATION
// - FAIL_CLOSED
export function createIncidentResolutionRequestId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_RESOLUTION_REQUEST_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createContainmentAssessmentId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_CONTAINMENT_ASSESSMENT_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createContainmentClearanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_CONTAINMENT_CLEARANCE_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createRecoveryAuthorizationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_RECOVERY_AUTHORIZATION_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createRecoveryHandoffId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_RECOVERY_HANDOFF_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createRecoveryVerificationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_RECOVERY_VERIFICATION_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createResolutionConfirmationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_RESOLUTION_CONFIRMATION_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createIncidentClosureId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_INCIDENT_CLOSURE_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createResolutionProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_RESOLUTION_PROVENANCE_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
