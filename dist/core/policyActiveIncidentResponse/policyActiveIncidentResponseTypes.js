// src/core/policyActiveIncidentResponse/policyActiveIncidentResponseTypes.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Canonical Contracts & DTOs (Component 830).
// Defines immutable branded types, explicit incident states, degradation categories,
// and safety boundary contracts for governed active policy incident governance.
//
// Core Authority Invariants:
// - INCIDENT_DETECTION != POLICY_AUTHORITY
// - DEGRADATION_DETECTION != POLICY_MUTATION
// - EMERGENCY_SAFETY_BOUNDARY != POLICY_AUTHORITY
// - EMERGENCY_SAFETY_BOUNDARY != POLICY_MUTATION
// - INCIDENT_RESPONSE != AUTONOMOUS_ROLLBACK
// - INCIDENT_RESPONSE != AUTONOMOUS_RECOVERY
// - INCIDENT_RESPONSE != AUTONOMOUS_REPAIR
// - PDP != POLICY_AUTHORITY
// - PEP != POLICY_AUTHORITY
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - ZERO AUTONOMOUS REPAIR
// - ZERO DIRECT TOOL EXECUTION
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
export function createActiveIncidentId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_INCIDENT_ID: raw incident id must be a non-empty string');
    }
    return raw.trim();
}
export function createIncidentDetectionId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_DETECTION_ID: raw detection id must be a non-empty string');
    }
    return raw.trim();
}
export function createDegradationEventId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_DEGRADATION_EVENT_ID: raw degradation event id must be a non-empty string');
    }
    return raw.trim();
}
export function createSafetyBoundaryActivationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_SAFETY_BOUNDARY_ACTIVATION_ID: raw activation id must be a non-empty string');
    }
    return raw.trim();
}
export function createIncidentEscalationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_INCIDENT_ESCALATION_ID: raw escalation id must be a non-empty string');
    }
    return raw.trim();
}
export function createIncidentResolutionId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_INCIDENT_RESOLUTION_ID: raw resolution id must be a non-empty string');
    }
    return raw.trim();
}
export function createIncidentProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_INCIDENT_PROVENANCE_ID: raw provenance id must be a non-empty string');
    }
    return raw.trim();
}
