import type { EvidenceStrength } from './policyPhaseExitAuditTypes.js';
export declare class PolicyPhaseExitEvidenceStrengthEngine {
    /**
     * Returns numeric rank of evidence strength (1-10).
     */
    static getRank(strength: EvidenceStrength): number;
    /**
     * Checks if actual strength meets or exceeds required strength.
     */
    static isStrengthSufficient(actual: EvidenceStrength, required: EvidenceStrength): boolean;
    /**
     * Strictly enforces that CLAIM_ONLY cannot produce a PASS for any mandatory criterion.
     */
    static isPassEligible(strength: EvidenceStrength): boolean;
    /**
     * Compares two evidence strengths and returns the stronger one.
     */
    static max(a: EvidenceStrength, b: EvidenceStrength): EvidenceStrength;
}
