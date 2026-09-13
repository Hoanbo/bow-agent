// src/core/policyPhaseExitAudit/policyPhaseExitProvenanceInspector.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Cryptographic Provenance Chain Inspector (Component 893).
// Independently tests SHA-256 hash chaining, parent-child linking, and tamper detection.
// Strictly read-only; alters ZERO state.
//
// Core Authority Invariants:
// - PROVENANCE_IS_APPEND_ONLY
// - FAIL_CLOSED_ON_TAMPERING
// - USER_STOP > EVERYTHING

import { PolicyPhaseTransitionProvenanceEngine } from '../policyPhaseTransition/policyPhaseTransitionProvenanceEngine.js';

export interface ProvenanceAuditFinding {
  readonly chainName: string;
  readonly hashAlgorithm: string;
  readonly chainingVerified: boolean;
  readonly tamperDetectionVerified: boolean;
  readonly clean: boolean;
  readonly error?: string;
}

export class PolicyPhaseExitProvenanceInspector {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Provenance inspector suspended by USER_STOP supremacy');
    }
  }

  /**
   * Independently tests provenance engine cryptographic chaining and tamper detection.
   */
  public testProvenanceIntegrity(): ProvenanceAuditFinding {
    this.assertUserStopInactive();

    const engine = new PolicyPhaseTransitionProvenanceEngine();
    const tenantId = 'tenant_audit_prov_test';

    // Append 2 links
    const link1 = engine.recordTransitionEvent({
      tenantId,
      transitionType: 'PHASE_1_3_EXIT',
      targetPhase: 'PHASE_1_3_EXIT_PENDING_REVIEW',
      entityId: 'test_cand_01',
      payload: { test: true },
    });

    const link2 = engine.recordTransitionEvent({
      tenantId,
      transitionType: 'PHASE_1_3_EXIT',
      targetPhase: 'PHASE_1_3_EXIT_COMMITTED',
      entityId: 'test_commit_01',
      payload: { test: true },
    });

    // Check chaining
    const chainingVerified = link2.previousHash === link1.sha256;

    // Verify pristine chain
    const pristineRes = engine.verifyChain(tenantId);
    if (!pristineRes.valid) {
      return Object.freeze({
        chainName: 'PhaseTransitionProvenanceChain',
        hashAlgorithm: 'SHA-256',
        chainingVerified,
        tamperDetectionVerified: false,
        clean: false,
        error: `Pristine chain failed verification: ${pristineRes.error}`,
      });
    }

    // Mutate in-memory chain to test tamper detection
    (engine as any).chains.get(tenantId)[0] = { ...link1, sha256: 'tampered_sha256_mock' };
    const tamperedRes = engine.verifyChain(tenantId);
    const tamperDetectionVerified = !tamperedRes.valid && (tamperedRes.error?.includes('PROVENANCE_TAMPER_DETECTED') ?? false);

    const clean = chainingVerified && tamperDetectionVerified;

    return Object.freeze({
      chainName: 'PhaseTransitionProvenanceChain',
      hashAlgorithm: 'SHA-256',
      chainingVerified,
      tamperDetectionVerified,
      clean,
      error: clean ? undefined : 'Provenance chaining or tamper detection check failed',
    });
  }
}
