// src/core/policyPhaseTransition/policyPhaseExitCriteriaRevalidator.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Criteria Revalidator (Component 872).
// Independently revalidates all 24 mandatory readiness criteria before permitting candidate creation.
// Enforces strict non-conversion invariants: UNKNOWN != PASS, PARTIAL != PASS, NOT_TESTED != PASS.

import type { ReadinessAssessmentReport } from '../policyGovernanceReadiness/policyGovernanceReadinessTypes.js';
import { CANONICAL_READINESS_CRITERIA } from '../policyGovernanceReadiness/policyGovernanceReadinessCriteria.js';

export interface CriteriaRevalidationResult {
  readonly valid: boolean;
  readonly allCriteriaPass: boolean;
  readonly totalCriteriaChecked: number;
  readonly passedCount: number;
  readonly failedCount: number;
  readonly partialCount: number;
  readonly untestedCount: number;
  readonly issues: readonly string[];
}

export class PolicyPhaseExitCriteriaRevalidator {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Criteria revalidator suspended by USER_STOP supremacy');
    }
  }

  /**
   * Revalidates all mandatory criteria in a readiness assessment report.
   */
  public revalidateCriteria(report: ReadinessAssessmentReport): CriteriaRevalidationResult {
    this.assertUserStopInactive();

    const issues: string[] = [];
    let passedCount = 0;
    let failedCount = 0;
    let partialCount = 0;
    let untestedCount = 0;

    if (!report || !report.criteriaResults || !Array.isArray(report.criteriaResults)) {
      return Object.freeze({
        valid: false,
        allCriteriaPass: false,
        totalCriteriaChecked: 0,
        passedCount: 0,
        failedCount: 0,
        partialCount: 0,
        untestedCount: 0,
        issues: Object.freeze(['MISSING_CRITERIA: criteriaResults is missing or malformed in report']),
      });
    }

    const resultMap = new Map<string, string>();
    for (const res of report.criteriaResults) {
      if (res && res.criterion && res.criterion.criterionId) {
        resultMap.set(res.criterion.criterionId, res.status);
      }
    }

    // Check each mandatory criterion from canonical specification
    for (const canonical of CANONICAL_READINESS_CRITERIA) {
      const status = resultMap.get(canonical.criterionId);

      if (!status) {
        issues.push(`MISSING_CRITERION_EVALUATION: Canonical criterion '${canonical.name}' (${canonical.criterionId}) has no evaluation result`);
        untestedCount++;
        continue;
      }

      switch (status) {
        case 'PASS':
          passedCount++;
          break;
        case 'FAIL':
          failedCount++;
          if (canonical.isMandatory) {
            issues.push(`MANDATORY_CRITERION_FAILED: Criterion '${canonical.name}' status is FAIL`);
          }
          break;
        case 'PARTIAL':
          partialCount++;
          if (canonical.isMandatory) {
            issues.push(`MANDATORY_CRITERION_PARTIAL: Criterion '${canonical.name}' status is PARTIAL (cannot convert to PASS)`);
          }
          break;
        case 'NOT_TESTED':
          untestedCount++;
          if (canonical.isMandatory) {
            issues.push(`MANDATORY_CRITERION_UNTESTED: Criterion '${canonical.name}' status is NOT_TESTED (cannot convert to PASS)`);
          }
          break;
        default:
          issues.push(`INVALID_CRITERION_STATUS: Criterion '${canonical.name}' has unexpected status '${status}'`);
          break;
      }
    }

    const allCriteriaPass = issues.length === 0 && passedCount === CANONICAL_READINESS_CRITERIA.length;

    return Object.freeze({
      valid: allCriteriaPass,
      allCriteriaPass,
      totalCriteriaChecked: CANONICAL_READINESS_CRITERIA.length,
      passedCount,
      failedCount,
      partialCount,
      untestedCount,
      issues: Object.freeze(issues),
    });
  }
}
