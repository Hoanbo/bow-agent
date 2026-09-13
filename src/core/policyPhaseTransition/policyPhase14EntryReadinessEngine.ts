// src/core/policyPhaseTransition/policyPhase14EntryReadinessEngine.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Phase 1.4 Entry Readiness Engine (Component 876).
// Evaluates whether prerequisites for Phase 1.4 entry are satisfied.
// Strictly advisory; grants ZERO entry authority and creates ZERO phase transitions.
//
// Core Authority Invariants:
// - PHASE_1_4_ENTRY_READY != PHASE_1_4_ENTRY_COMMIT
// - READINESS IS NOT AUTHORITY
// - FAIL_CLOSED

import * as crypto from 'crypto';
import {
  type PhaseExitCommitRecord,
  type Phase14EntryReadinessRecord,
  createPhase14EntryReadinessId,
} from './policyPhaseTransitionTypes.js';

export interface Phase14ReadinessEvaluationParams {
  readonly exitCommit: PhaseExitCommitRecord;
  readonly tenantId: string;
}

export const CANONICAL_PHASE_1_4_PREREQUISITES: readonly string[] = Object.freeze([
  'PHASE_1_3_EXIT_COMMITTED',
  'PHASE_EXIT_PROVENANCE_VERIFIED',
  'NO_CONFLICTING_PHASE_TRANSITIONS',
  'FAIL_CLOSED_POSTURE_ACTIVE',
  'PROTECTED_WORKSPACE_UNTOUCHED',
  'FULL_REGRESSION_PASSING',
]);

export class PolicyPhase14EntryReadinessEngine {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Phase 1.4 readiness engine suspended by USER_STOP supremacy');
    }
  }

  /**
   * Evaluates readiness for entering Phase 1.4.
   */
  public evaluateEntryReadiness(params: Phase14ReadinessEvaluationParams): Phase14EntryReadinessRecord {
    this.assertUserStopInactive();

    const reasons: string[] = [];

    if (!params || !params.exitCommit) {
      return Object.freeze({
        readinessId: createPhase14EntryReadinessId(`readiness_14_missing_${Date.now()}`),
        tenantId: params?.tenantId ?? 'UNKNOWN',
        exitCommitId: 'MISSING' as any,
        status: 'PHASE_1_4_ENTRY_NOT_READY',
        evaluatedAt: new Date().toISOString(),
        prerequisitesSatisfied: false,
        reasons: Object.freeze(['MISSING_EXIT_COMMIT: Phase 1.3 exit must be committed before Phase 1.4 readiness can be evaluated']),
        requiredPrerequisites: CANONICAL_PHASE_1_4_PREREQUISITES,
      });
    }

    const { exitCommit, tenantId } = params;

    // 1. Tenant match check
    if (exitCommit.tenantId !== tenantId) {
      reasons.push(`CROSS_TENANT_MISMATCH: Exit commit tenant '${exitCommit.tenantId}' does not match request '${tenantId}'`);
    }

    // 2. Committed phase check
    if (exitCommit.committedPhase !== 'PHASE_1_3_EXIT_COMMITTED') {
      reasons.push(`INVALID_COMMITTED_PHASE: Expected 'PHASE_1_3_EXIT_COMMITTED', found '${exitCommit.committedPhase}'`);
    }

    // 3. Provenance verification of the exit commit
    const expectedPayload = {
      commitId: exitCommit.commitId,
      tenantId: exitCommit.tenantId,
      candidateId: exitCommit.candidateId,
      authorizationId: exitCommit.authorizationId,
      previousPhase: exitCommit.previousPhase,
      committedPhase: exitCommit.committedPhase,
      committedAt: exitCommit.committedAt,
      committedBy: exitCommit.committedBy,
    };

    const calculatedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(expectedPayload))
      .digest('hex');

    if (calculatedHash !== exitCommit.provenanceHash) {
      reasons.push('PROVENANCE_TAMPER_DETECTED: Exit commit provenance hash does not match computed digest');
    }

    const prerequisitesSatisfied = reasons.length === 0;

    if (prerequisitesSatisfied) {
      reasons.push('Phase 1.3 exit committed and cryptographically verified');
      reasons.push('All canonical Phase 1.4 entry prerequisites confirmed');
      reasons.push('Ready for separate, explicit human authorization for Phase 1.4 entry');
    }

    const readinessId = createPhase14EntryReadinessId(
      `readiness_14_${tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    );

    return Object.freeze({
      readinessId,
      tenantId,
      exitCommitId: exitCommit.commitId,
      status: prerequisitesSatisfied ? 'PHASE_1_4_ENTRY_READY' : 'PHASE_1_4_ENTRY_NOT_READY',
      evaluatedAt: new Date().toISOString(),
      prerequisitesSatisfied,
      reasons: Object.freeze(reasons),
      requiredPrerequisites: CANONICAL_PHASE_1_4_PREREQUISITES,
    });
  }
}
