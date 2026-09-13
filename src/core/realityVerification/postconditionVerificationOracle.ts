// src/core/realityVerification/postconditionVerificationOracle.ts
// BOWCON V4.0 — MS-1.4.07: POSTCONDITION VERIFICATION ORACLE
//
// EN:
// Deterministic oracle evaluating empirical evidence against formal postcondition contracts.
// Guarantees safe predicate execution without dynamic code or arbitrary string evaluation.
// Enforces postcondition priority hierarchies (CRITICAL, HIGH, MEDIUM, LOW) and required invariant semantics.
//
// VI:
// Oracle xác minh tất định đánh giá bằng chứng thực nghiệm dựa trên các hợp đồng postcondition chính thức.
// Bảo đảm thực thi vị từ an toàn mà không có mã động hoặc đánh giá chuỗi tùy ý.
// Thực thi các thứ bậc ưu tiên postcondition (CRITICAL, HIGH, MEDIUM, LOW) và ngữ nghĩa bất biến bắt buộc.

import type { Postcondition, PostconditionResult } from '../verification/postconditionTypes.js';
import { evaluatePostcondition } from '../verification/postconditionEvaluator.js';
import type {
  RealityEvidence,
  RealityVerificationStatus,
  RealityVerificationSummary,
  RealityVerificationFailure,
  VerificationRecommendation,
} from './realityVerificationTypes.js';

export interface OracleEvaluationOutcome {
  readonly status: RealityVerificationStatus;
  readonly confidence: number;
  readonly postconditionResults: readonly PostconditionResult[];
  readonly summary: RealityVerificationSummary;
  readonly failure?: RealityVerificationFailure;
  readonly recommendation: VerificationRecommendation;
}

export class PostconditionVerificationOracle {
  /**
   * Evaluates postconditions and expected outcomes against collected reality evidence.
   */
  public evaluateInvariants(params: {
    postconditions?: readonly Postcondition[];
    expectedOutcome?: string;
    evidence: readonly RealityEvidence[];
    executionSucceeded: boolean;
  }): OracleEvaluationOutcome {
    const { postconditions = [], expectedOutcome, evidence, executionSucceeded } = params;

    // 1. Build composite observed state map from evidence
    const observedState = this.buildObservedStateMap(evidence);

    // 2. If execution failed at adapter plane, verification must fail closed
    if (!executionSucceeded) {
      return {
        status: 'NOT_VERIFIED',
        confidence: 0.95,
        postconditionResults: [],
        summary: {
          totalInvariants: postconditions.length,
          passedCount: 0,
          failedCount: postconditions.length,
          unknownCount: 0,
          conflictingCount: 0,
          allRequiredPassed: false,
        },
        failure: {
          category: 'EXECUTION_FAILED',
          message: 'Tool execution did not succeed at the adapter boundary.',
        },
        recommendation: 'MANUAL_INSPECTION',
      };
    }

    // 3. If no formal postconditions were specified
    if (postconditions.length === 0) {
      const confidence = evidence.length > 0 ? 0.9 : 0.7;
      return {
        status: 'VERIFIED',
        confidence,
        postconditionResults: [],
        summary: {
          totalInvariants: 0,
          passedCount: 0,
          failedCount: 0,
          unknownCount: 0,
          conflictingCount: 0,
          allRequiredPassed: true,
        },
        recommendation: 'NONE',
      };
    }

    // 4. Evaluate each postcondition deterministically
    const results: PostconditionResult[] = [];
    let passedCount = 0;
    let failedCount = 0;
    let unknownCount = 0;
    let conflictingCount = 0;
    let hasCriticalOrRequiredFailure = false;
    let hasCriticalOrRequiredUnknown = false;
    let primaryFailureMessage: string | undefined;

    for (const rawPost of postconditions) {
      let rawOp = (rawPost as any).operator || (rawPost as any).predicate || 'EQUALS';
      if (rawOp === 'GREATER_THAN_OR_EQUALS' || rawOp === 'GTE') rawOp = 'GREATER_OR_EQUAL';
      if (rawOp === 'LESS_THAN_OR_EQUALS' || rawOp === 'LTE') rawOp = 'LESS_OR_EQUAL';
      if (rawOp === 'GT') rawOp = 'GREATER_THAN';
      if (rawOp === 'LT') rawOp = 'LESS_THAN';
      if (rawOp === 'EQ') rawOp = 'EQUALS';
      if (rawOp === 'NEQ') rawOp = 'NOT_EQUALS';

      const canonicalPostcondition: Postcondition = {
        id: rawPost.id || `post_${results.length + 1}`,
        description: rawPost.description || '',
        targetPath: (rawPost as any).targetPath || (rawPost as any).target || '',
        operator: rawOp,
        expectedValue: (rawPost as any).expectedValue !== undefined ? (rawPost as any).expectedValue : (rawPost as any).expected,
        required: rawPost.required !== false,
        priority: rawPost.priority || 'HIGH',
      };

      const isRequired = canonicalPostcondition.required !== false;
      const isCritical = canonicalPostcondition.priority === 'CRITICAL' || canonicalPostcondition.priority === 'HIGH';

      const result = evaluatePostcondition(canonicalPostcondition, observedState);
      results.push(result);

      if (result.status === 'PASSED') {
        passedCount++;
      } else if (result.status === 'FAILED') {
        failedCount++;
        if (isRequired || isCritical) {
          hasCriticalOrRequiredFailure = true;
          primaryFailureMessage = primaryFailureMessage || result.message;
        }
      } else if (result.status === 'UNKNOWN') {
        unknownCount++;
        if (isRequired || isCritical) {
          hasCriticalOrRequiredUnknown = true;
        }
      } else if (result.status === 'CONFLICTING') {
        conflictingCount++;
      }
    }

    const allRequiredPassed = !hasCriticalOrRequiredFailure && !hasCriticalOrRequiredUnknown;

    const summary: RealityVerificationSummary = {
      totalInvariants: postconditions.length,
      passedCount,
      failedCount,
      unknownCount,
      conflictingCount,
      allRequiredPassed,
    };

    // 5. Synthesize final status and recommendation
    if (conflictingCount > 0) {
      return {
        status: 'CONTRADICTORY',
        confidence: 0.5,
        postconditionResults: results,
        summary,
        failure: {
          category: 'CONFLICTING_EVIDENCE',
          message: 'Contradictory observations detected across evidence sources.',
        },
        recommendation: 'MANUAL_INSPECTION',
      };
    }

    if (hasCriticalOrRequiredFailure) {
      return {
        status: 'NOT_VERIFIED',
        confidence: 0.95,
        postconditionResults: results,
        summary,
        failure: {
          category: 'POSTCONDITION_FAILURE',
          message: primaryFailureMessage || 'One or more required postconditions failed verification.',
        },
        recommendation: 'MANUAL_INSPECTION',
      };
    }

    if (hasCriticalOrRequiredUnknown) {
      return {
        status: 'UNKNOWN',
        confidence: 0.4,
        postconditionResults: results,
        summary,
        failure: {
          category: 'MISSING_EVIDENCE',
          message: 'Authoritative evidence for one or more required postconditions was not observed.',
        },
        recommendation: 'CLARIFICATION_REQUIRED',
      };
    }

    // Section 3.5: If any optional/low invariant failed, reject partial success -> NOT_VERIFIED
    if (failedCount > 0) {
      return {
        status: 'NOT_VERIFIED',
        confidence: 0.8,
        postconditionResults: results,
        summary,
        failure: {
          category: 'PARTIAL_SUCCESS_REJECTED',
          message: 'One or more non-critical postcondition invariants failed; partial success rejected.',
        },
        recommendation: 'RETRY_RECOMMENDED',
      };
    }

    // All postconditions passed
    const confidence = results.length > 0 ? passedCount / results.length : 0.9;

    return {
      status: 'VERIFIED',
      confidence,
      postconditionResults: results,
      summary,
      recommendation: 'NONE',
    };
  }

  /**
   * Builds an in-memory key-value dictionary and nested hierarchy from all collected evidence items.
   */
  private buildObservedStateMap(evidenceList: readonly RealityEvidence[]): Record<string, unknown> {
    const map: Record<string, unknown> = {};

    for (const item of evidenceList) {
      // Direct literal path
      map[item.path] = item.observedValue;

      // Nested hierarchy for dot-separated paths
      if (item.path.includes('.')) {
        const segments = item.path.split('.');
        let current: any = map;
        for (let i = 0; i < segments.length - 1; i++) {
          const seg = segments[i];
          if (seg === '__proto__' || seg === 'constructor' || seg === 'prototype') {
            break;
          }
          if (!current[seg] || typeof current[seg] !== 'object' || Array.isArray(current[seg])) {
            current[seg] = {};
          }
          current = current[seg];
        }
        const lastSeg = segments[segments.length - 1];
        if (lastSeg !== '__proto__' && lastSeg !== 'constructor' && lastSeg !== 'prototype') {
          current[lastSeg] = item.observedValue;
        }
      }
    }

    return map;
  }
}

export const globalPostconditionVerificationOracle = new PostconditionVerificationOracle();
