// src/core/policyPostExecution/policyRegressionDetectionEngine.ts
// BOWCON V4.0 — MS-1.3.66: GOVERNED POST-EXECUTION RECONCILIATION,
// IMPACT ANALYSIS & POLICY FEEDBACK PROPOSAL LAYER
//
// Governed Policy Regression Detection Engine.
// Evaluates post-execution findings and historical context to detect policy regressions,
// candidate degradations, repeated failures, and safety floor anomalies using deterministic rules.
//
// Động cơ phát hiện hồi quy chính sách có quản trị.
// Đánh giá các phát hiện sau thực thi và bối cảnh lịch sử để phát hiện hồi quy chính sách,
// suy giảm ứng viên, lỗi lặp lại và bất thường rào chắn an toàn bằng các quy tắc xác định.
//
// Authority Invariants:
// - DETERMINISTIC_RULES_ONLY: No ML, neural models, or non-deterministic heuristics
// - FAIL_CLOSED_EVALUATION: Unknown or contradictory states escalate severity
// - ABSOLUTE_USER_STOP_SUPREMACY: Immediate suspension when USER_STOP active
// - STRICT_TENANT_ISOLATION: Tenant isolation strictly checked

import crypto from 'node:crypto';
import path from 'node:path';
import type {
  PostExecutionReconciliationResult,
  PostExecutionImpactAnalysis,
  PostExecutionRegressionFinding,
  PolicyRegressionType,
  PolicyPostExecutionOptions,
} from './policyPostExecutionTypes.js';
import { createRegressionDetectionId } from './policyPostExecutionTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export interface RegressionDetectionContext {
  readonly historicalFailureCount?: number;
  readonly repeatedRollbackCount?: number;
  readonly repeatedUnknownCount?: number;
  readonly candidateDivergenceCount?: number;
  readonly safetyViolationReported?: boolean;
}

export class PolicyRegressionDetectionEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyPostExecutionOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Regression detection suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('REGRESSION_DETECTION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Deterministically evaluates post-execution evidence to detect policy regressions.
   * Đánh giá có tính xác định bằng chứng sau thực thi để phát hiện hồi quy chính sách.
   */
  public detectRegression(
    reconciliation: PostExecutionReconciliationResult,
    impact: PostExecutionImpactAnalysis,
    context?: RegressionDetectionContext
  ): PostExecutionRegressionFinding {
    this.assertUserStopInactive();
    this.validateTenant(reconciliation.tenantPartition);

    const regressionTypes: PolicyRegressionType[] = [];
    const details: string[] = [];
    let severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'NONE';

    // 1. Safety Floor Violation
    if (context?.safetyViolationReported === true || impact.classification === 'SAFETY_REGRESSION') {
      regressionTypes.push('SAFETY_FLOOR_VIOLATION');
      details.push('Safety regression observed during impact analysis or execution');
      severity = 'CRITICAL';
    }

    // 2. Candidate Degradation
    if ((context?.candidateDivergenceCount ?? 0) >= 3) {
      regressionTypes.push('CANDIDATE_DEGRADATION');
      details.push(`Elevated candidate decision divergence (${context?.candidateDivergenceCount} mismatches)`);
      if (severity !== 'CRITICAL') severity = 'HIGH';
    }

    // 3. Repeated Remediation Failure
    if ((context?.historicalFailureCount ?? 0) >= 2 || reconciliation.status === 'VERIFIED_FAILURE') {
      if ((context?.historicalFailureCount ?? 0) >= 2) {
        regressionTypes.push('REPEATED_REMEDIATION_FAILURE');
        details.push(`Consecutive remediation failures detected (${context?.historicalFailureCount})`);
        if (severity !== 'CRITICAL') severity = 'HIGH';
      }
    }

    // 4. Rollback Recurrence
    if ((context?.repeatedRollbackCount ?? 0) >= 2) {
      regressionTypes.push('ROLLBACK_RECURRENCE');
      details.push(`Repeated rollback actions observed (${context?.repeatedRollbackCount})`);
      if (severity !== 'CRITICAL' && severity !== 'HIGH') severity = 'MEDIUM';
    }

    // 5. Repeated UNKNOWN Outcomes
    if ((context?.repeatedUnknownCount ?? 0) >= 2 || reconciliation.status === 'VERIFIED_UNKNOWN') {
      if ((context?.repeatedUnknownCount ?? 0) >= 2) {
        regressionTypes.push('REPEATED_UNKNOWN_OUTCOMES');
        details.push(`Multiple unverified or ambiguous UNKNOWN execution outcomes (${context?.repeatedUnknownCount})`);
        if (severity !== 'CRITICAL') severity = 'HIGH';
      }
    }

    // 6. Policy Regression (general worse-than-expected outcome)
    if (impact.classification === 'WORSE_THAN_EXPECTED') {
      regressionTypes.push('POLICY_REGRESSION');
      details.push('Execution impact was worse than expected');
      if (severity === 'NONE') severity = 'MEDIUM';
    }

    if (regressionTypes.length === 0) {
      regressionTypes.push('NO_REGRESSION');
      details.push('No policy regressions or degradations detected');
      severity = 'NONE';
    }

    const detectionId = createRegressionDetectionId(
      `reg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    );
    const detectedAt = new Date().toISOString();

    return Object.freeze({
      detectionId,
      executionId: reconciliation.executionId,
      tenantPartition: reconciliation.tenantPartition,
      candidateId: reconciliation.candidateId,
      regressionDetected: regressionTypes.some((t) => t !== 'NO_REGRESSION'),
      regressionTypes: Object.freeze([...regressionTypes]),
      severity,
      details: Object.freeze([...details]),
      detectedAt,
    });
  }
}

export const globalPolicyRegressionDetectionEngine = new PolicyRegressionDetectionEngine();
