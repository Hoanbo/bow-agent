// src/core/policyFeedbackReview/policyFeedbackReviewTypes.ts
// BOWCON V4.0 — MS-1.3.67: GOVERNED FEEDBACK REVIEW, POLICY EVOLUTION INTAKE & HUMAN REVIEW QUEUE LAYER
//
// Canonical type definitions and DTO contracts for governed feedback review,
// independent proposal revalidation, durable human review queue, explicit human review gates,
// bounded policy evolution intake requests, cryptographic review provenance, and audit correlation.
//
// Authority Invariants:
// - FEEDBACK_PROPOSAL != FEEDBACK_REVIEW
// - FEEDBACK_REVIEW != POLICY_EVOLUTION_INTAKE
// - POLICY_EVOLUTION_INTAKE != POLICY_MUTATION
// - HUMAN_ACCEPT != POLICY_ACTIVATION
// - AI_RECOMMENDATION != HUMAN_APPROVAL
// - ZERO_AUTONOMOUS_POLICY_MUTATION: No autonomous mutation, candidate creation, promotion, or rollback
// - USER_STOP > EVERYTHING
export function createFeedbackReviewId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_FEEDBACK_REVIEW_ID: raw feedback review id must be a non-empty string');
    }
    return raw;
}
export function createFeedbackReviewRequestId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_FEEDBACK_REVIEW_REQUEST_ID: raw request id must be a non-empty string');
    }
    return raw;
}
export function createHumanReviewId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_HUMAN_REVIEW_ID: raw human review id must be a non-empty string');
    }
    return raw;
}
export function createPolicyEvolutionIntakeId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_EVOLUTION_INTAKE_ID: raw intake id must be a non-empty string');
    }
    return raw;
}
export function createReviewDecisionId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_REVIEW_DECISION_ID: raw decision id must be a non-empty string');
    }
    return raw;
}
export function createReviewProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_REVIEW_PROVENANCE_ID: raw provenance id must be a non-empty string');
    }
    return raw;
}
