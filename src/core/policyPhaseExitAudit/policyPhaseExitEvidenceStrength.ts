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

import type { EvidenceStrength } from './policyPhaseExitAuditTypes.js';

const STRENGTH_RANKS: Readonly<Record<EvidenceStrength, number>> = Object.freeze({
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
  public static getRank(strength: EvidenceStrength): number {
    return STRENGTH_RANKS[strength] ?? 0;
  }

  /**
   * Checks if actual strength meets or exceeds required strength.
   */
  public static isStrengthSufficient(actual: EvidenceStrength, required: EvidenceStrength): boolean {
    if (actual === 'CLAIM_ONLY') {
      return false;
    }
    return PolicyPhaseExitEvidenceStrengthEngine.getRank(actual) >= PolicyPhaseExitEvidenceStrengthEngine.getRank(required);
  }

  /**
   * Strictly enforces that CLAIM_ONLY cannot produce a PASS for any mandatory criterion.
   */
  public static isPassEligible(strength: EvidenceStrength): boolean {
    return strength !== 'CLAIM_ONLY' && PolicyPhaseExitEvidenceStrengthEngine.getRank(strength) >= 2;
  }

  /**
   * Compares two evidence strengths and returns the stronger one.
   */
  public static max(a: EvidenceStrength, b: EvidenceStrength): EvidenceStrength {
    return PolicyPhaseExitEvidenceStrengthEngine.getRank(a) >= PolicyPhaseExitEvidenceStrengthEngine.getRank(b) ? a : b;
  }
}
