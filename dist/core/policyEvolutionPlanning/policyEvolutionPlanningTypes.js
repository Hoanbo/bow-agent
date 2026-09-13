// src/core/policyEvolutionPlanning/policyEvolutionPlanningTypes.ts
// BOWCON V4.0 — MS-1.3.68: GOVERNED POLICY EVOLUTION PLANNING & CANDIDATE SYNTHESIS LAYER
//
// Canonical type definitions and DTO contracts for governed policy evolution planning,
// deterministic candidate synthesis, independent candidate validation, safety constraints,
// human review boundary requirements, append-only provenance, and audit correlation.
//
// Authority Invariants:
// - EVOLUTION_INTAKE != EVOLUTION_PLAN
// - EVOLUTION_PLAN != CANDIDATE_DRAFT
// - CANDIDATE_DRAFT != ACTIVE_POLICY
// - POLICY_EVOLUTION_PLANNING != POLICY_MUTATION
// - ZERO_AUTONOMOUS_POLICY_MUTATION: No autonomous mutation, activation, promotion, or rollback
// - USER_STOP > EVERYTHING
export function createEvolutionPlanId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_EVOLUTION_PLAN_ID: raw plan id must be a non-empty string');
    }
    return raw;
}
export function createCandidateSynthesisId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_CANDIDATE_SYNTHESIS_ID: raw synthesis id must be a non-empty string');
    }
    return raw;
}
export function createCandidateDraftId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_CANDIDATE_DRAFT_ID: raw draft id must be a non-empty string');
    }
    return raw;
}
export function createEvolutionConstraintId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_EVOLUTION_CONSTRAINT_ID: raw constraint id must be a non-empty string');
    }
    return raw;
}
export function createEvolutionPlanningProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_PLANNING_PROVENANCE_ID: raw provenance id must be a non-empty string');
    }
    return raw;
}
