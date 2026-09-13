// src/core/policyPhaseExitAudit/policyPhaseExitEvidenceStrength.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Evidence Strength Taxonomy & Classification Engine (Component 885).
// Enforces deterministic ranking of evidence and prohibits CLAIM_ONLY from satisfying criteria.
//
// Core Authority Invariants:
// - CLAIM_ONLY NEVER SATISFIES A MANDATORY EXIT CRITERION
// - EVIDENCE_STRENGTH_MUST_BE_VERIFIABLE
// - FAIL_CLOSED
const STRENGTH_RANKS = Object.freeze({
    DIRECT_RUNTIME_EVIDENCE: 10,
    DIRECT_TEST_EVIDENCE: 9,
    SECURITY_SCAN_EVIDENCE: 8,
    REGRESSION_EVIDENCE: 7,
    PROVENANCE_EVIDENCE: 6,
    AUDIT_LEDGER_EVIDENCE: 5,
    STATIC_CODE_EVIDENCE: 4,
    INTEGRATION_EVIDENCE: 3,
    DERIVED_EVIDENCE: 2,
    CLAIM_ONLY: 1,
});
export class PolicyPhaseExitEvidenceStrengthEngine {
    /**
     * Returns numeric rank of evidence strength (1-10).
     */
    static getRank(strength) {
        return STRENGTH_RANKS[strength] ?? 0;
    }
    /**
     * Checks if actual strength meets or exceeds required strength.
     */
    static isStrengthSufficient(actual, required) {
        if (actual === 'CLAIM_ONLY') {
            return false;
        }
        return PolicyPhaseExitEvidenceStrengthEngine.getRank(actual) >= PolicyPhaseExitEvidenceStrengthEngine.getRank(required);
    }
    /**
     * Strictly enforces that CLAIM_ONLY cannot produce a PASS for any mandatory criterion.
     */
    static isPassEligible(strength) {
        return strength !== 'CLAIM_ONLY' && PolicyPhaseExitEvidenceStrengthEngine.getRank(strength) >= 2;
    }
    /**
     * Compares two evidence strengths and returns the stronger one.
     */
    static max(a, b) {
        return PolicyPhaseExitEvidenceStrengthEngine.getRank(a) >= PolicyPhaseExitEvidenceStrengthEngine.getRank(b) ? a : b;
    }
}
