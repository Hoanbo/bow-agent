// src/core/policyPhaseTransition/policyPhaseExitReadinessResolver.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Phase Exit Readiness Resolver (Component 871).
// Consumes and validates MS-1.3.76 evidence. Strictly non-authoritative.
// Never authorizes phase exit or mutates policy state.

import * as crypto from 'crypto';
import type { ReadinessAssessmentReport } from '../policyGovernanceReadiness/policyGovernanceReadinessTypes.js';

export interface ReadinessResolutionResult {
  readonly valid: boolean;
  readonly isReadyForPhaseExit: boolean;
  readonly assessmentId: string;
  readonly tenantId: string;
  readonly reportId: string;
  readonly provenanceHash: string;
  readonly issues: readonly string[];
}

export class PolicyPhaseExitReadinessResolver {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Readiness resolver suspended by USER_STOP supremacy');
    }
  }

  /**
   * Resolves and verifies an MS-1.3.76 readiness assessment report.
   * Strictly read-only and non-authoritative.
   */
  public resolveReadiness(report: ReadinessAssessmentReport): ReadinessResolutionResult {
    this.assertUserStopInactive();

    const issues: string[] = [];

    if (!report) {
      return Object.freeze({
        valid: false,
        isReadyForPhaseExit: false,
        assessmentId: 'UNKNOWN',
        tenantId: 'UNKNOWN',
        reportId: 'UNKNOWN',
        provenanceHash: '',
        issues: Object.freeze(['MISSING_REPORT: Readiness assessment report payload is null or undefined']),
      });
    }

    if (!report.reportId || !report.assessmentId || !report.tenantId) {
      issues.push('MALFORMED_REPORT: Missing reportId, assessmentId, or tenantId');
    }

    // 1. Verify readiness status
    if (report.readinessStatus !== 'READY_FOR_PHASE_EXIT') {
      issues.push(`UNREADY_STATUS: Assessment readinessStatus is '${report.readinessStatus}', expected 'READY_FOR_PHASE_EXIT'`);
    }

    // 2. Verify recommendation
    if (report.phaseExitRecommendation !== 'RECOMMENDED') {
      issues.push(`NOT_RECOMMENDED: Assessment phaseExitRecommendation is '${report.phaseExitRecommendation}', expected 'RECOMMENDED'`);
    }

    // 3. Verify declaration is strictly HUMAN_AUTHORITY_REQUIRED
    if (report.phaseExitDeclaration !== 'HUMAN_AUTHORITY_REQUIRED') {
      issues.push(`INVALID_DECLARATION: phaseExitDeclaration must be 'HUMAN_AUTHORITY_REQUIRED', found '${report.phaseExitDeclaration}'`);
    }

    // 4. Verify all 24 criteria passed
    if (!report.passedCriteria || report.passedCriteria.length < 24) {
      issues.push(`INCOMPLETE_CRITERIA: Passed criteria count is ${report.passedCriteria?.length ?? 0}, required at least 24`);
    }
    if (report.failedCriteria && report.failedCriteria.length > 0) {
      issues.push(`FAILED_CRITERIA_PRESENT: Found ${report.failedCriteria.length} failed criteria`);
    }
    if (report.partialCriteria && report.partialCriteria.length > 0) {
      issues.push(`PARTIAL_CRITERIA_PRESENT: Found ${report.partialCriteria.length} partial criteria`);
    }
    if (report.untestedCriteria && report.untestedCriteria.length > 0) {
      issues.push(`UNTESTED_CRITERIA_PRESENT: Found ${report.untestedCriteria.length} untested criteria`);
    }

    // 5. Verify provenance hash integrity
    if (!report.provenanceHash || typeof report.provenanceHash !== 'string' || report.provenanceHash.length !== 64) {
      issues.push('INVALID_PROVENANCE_HASH: Report lacks valid 64-character SHA-256 provenance hash');
    } else {
      const expectedPayload = {
        reportId: report.reportId,
        assessmentId: report.assessmentId,
        tenantId: report.tenantId,
        timestamp: report.timestamp,
        componentMatrixSummary: report.componentMatrixSummary,
        readinessStatus: report.readinessStatus,
        phaseExitRecommendation: report.phaseExitRecommendation,
        phaseExitDeclaration: report.phaseExitDeclaration,
        passedCount: report.passedCriteria.length,
        failedCount: report.failedCriteria.length,
        partialCount: report.partialCriteria.length,
        untestedCount: report.untestedCriteria.length,
      };

      const calculatedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(expectedPayload))
        .digest('hex');

      if (calculatedHash !== report.provenanceHash) {
        issues.push('PROVENANCE_MISMATCH: Computed hash does not match report provenanceHash (possible tampering)');
      }
    }

    const isReady = issues.length === 0;

    return Object.freeze({
      valid: isReady,
      isReadyForPhaseExit: isReady,
      assessmentId: report.assessmentId ?? 'UNKNOWN',
      tenantId: report.tenantId ?? 'UNKNOWN',
      reportId: report.reportId ?? 'UNKNOWN',
      provenanceHash: report.provenanceHash ?? '',
      issues: Object.freeze(issues),
    });
  }
}
