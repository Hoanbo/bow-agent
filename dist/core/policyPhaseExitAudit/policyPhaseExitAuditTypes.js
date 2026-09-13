// src/core/policyPhaseExitAudit/policyPhaseExitAuditTypes.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Canonical Contracts & Branded Types (Component 884).
// Defines branded identifiers, evidence strength taxonomy, criterion status models,
// readiness states, and immutable audit assessment report envelopes.
//
// Core Authority Invariants:
// - EVIDENCE != READINESS
// - READINESS != AUTHORIZATION
// - AUTHORIZATION != COMMIT
// - AUDIT != POLICY_AUTHORITY
// - AUDIT != POLICY_MUTATION
// - READINESS_ASSESSMENT != PHASE_EXIT
// - PHASE_EXIT != PHASE_1_4_ENTRY
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS PHASE EXIT
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
export function createPhaseExitAuditId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_AUDIT_ID: raw audit id must be a non-empty string');
    }
    return raw.trim();
}
export function createAuditEvidenceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_AUDIT_EVIDENCE_ID: raw evidence id must be a non-empty string');
    }
    return raw.trim();
}
export function createAuditCriterionId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_AUDIT_CRITERION_ID: raw criterion id must be a non-empty string');
    }
    return raw.trim();
}
export function createAuditReportId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_AUDIT_REPORT_ID: raw report id must be a non-empty string');
    }
    return raw.trim();
}
export function createAuditProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_AUDIT_PROVENANCE_ID: raw provenance id must be a non-empty string');
    }
    return raw.trim();
}
