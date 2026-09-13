// src/core/policyGovernanceReadiness/policyGovernanceReadinessTypes.ts
// BOWCON V4.0 — MS-1.3.76: GOVERNED POLICY GOVERNANCE PLANE END-TO-END VALIDATION,
// EVIDENCE-BASED READINESS ASSESSMENT & CONDITIONAL PHASE EXIT GATE
//
// Canonical Contracts & DTOs (Component 855).
// Defines branded types, readiness criteria structures, evidence records,
// multi-dimensional assessment reports, and non-authoritative phase exit declarations.
//
// Core Authority Invariants:
// - READINESS_ASSESSMENT != POLICY_AUTHORITY
// - READINESS_ASSESSMENT != POLICY_MUTATION
// - READINESS_ASSESSMENT != PHASE_COMPLETION_AUTHORITY
// - READINESS_ASSESSMENT != AUTONOMOUS_REMEDIATION
// - READINESS_ASSESSMENT != AUTONOMOUS_PHASE_EXIT
// - PHASE_EXIT_DECLARATION === 'HUMAN_AUTHORITY_REQUIRED' (ALWAYS)
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - ZERO DIRECT TOOL EXECUTION
// - FAIL_CLOSED
export function createAssessmentId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ASSESSMENT_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createCriterionId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_CRITERION_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createEvidenceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_EVIDENCE_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createReadinessReportId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_READINESS_REPORT_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export function createReadinessProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_READINESS_PROVENANCE_ID: raw id must be a non-empty string');
    }
    return raw.trim();
}
export const PHASE_EXIT_DECLARATION_VALUE = 'HUMAN_AUTHORITY_REQUIRED';
