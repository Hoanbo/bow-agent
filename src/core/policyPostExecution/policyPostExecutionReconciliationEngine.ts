// src/core/policyPostExecution/policyPostExecutionReconciliationEngine.ts
// BOWCON V4.0 — MS-1.3.66: GOVERNED POST-EXECUTION RECONCILIATION,
// IMPACT ANALYSIS & POLICY FEEDBACK PROPOSAL LAYER
//
// Governed Post-Execution Reconciliation Engine.
// Consumes verified MS-1.3.65 execution receipts and independent verification results,
// reconciling lifecycle transitions, detecting contradictory evidence, and preventing false success claims.
//
// Động cơ điều hòa sau thực thi có quản trị.
// Tiêu thụ biên nhận thực thi MS-1.3.65 đã xác minh và kết quả xác minh độc lập,
// điều hòa các chuyển đổi vòng đời, phát hiện bằng chứng mâu thuẫn và ngăn chặn tuyên bố thành công giả mạo.
//
// Authority Invariants:
// - ZERO_FALSE_CONVERSION: Never converts UNKNOWN or contradictory outcomes into SUCCESS
// - FAIL_CLOSED_ON_CONTRADICTION: Contradictory evidence results in RECONCILIATION_INVALID
// - ABSOLUTE_USER_STOP_SUPREMACY: Immediate fail-closed suspension on active USER_STOP
// - STRICT_TENANT_ISOLATION: Reconciles only within verified tenant partition

import crypto from 'node:crypto';
import path from 'node:path';
import type {
  ExecutionReceipt,
  ExecutionVerificationResult,
} from '../policyExecution/policyExecutionTypes.js';
import {
  type PostExecutionReconciliationResult,
  type ReconciledOutcomeStatus,
  type PolicyPostExecutionOptions,
  createReconciliationId,
} from './policyPostExecutionTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export class PolicyPostExecutionReconciliationEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyPostExecutionOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Post-execution reconciliation suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('RECONCILIATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Reconciles execution receipt against independent verification result.
   * Điều hòa biên nhận thực thi với kết quả xác minh độc lập.
   */
  public reconcile(
    receipt: ExecutionReceipt,
    verification: ExecutionVerificationResult
  ): PostExecutionReconciliationResult {
    this.assertUserStopInactive();

    // 1. Basic integrity check on arguments
    if (!receipt || typeof receipt !== 'object') {
      throw new Error('INVALID_RECONCILIATION_INPUT: ExecutionReceipt is required');
    }
    if (!verification || typeof verification !== 'object') {
      throw new Error('INVALID_RECONCILIATION_INPUT: ExecutionVerificationResult is required');
    }

    // 2. Cross-tenant & Identity alignment
    this.validateTenant(receipt.tenantPartition);
    this.validateTenant(verification.tenantPartition);

    if (receipt.tenantPartition !== verification.tenantPartition) {
      throw new Error(
        `TENANT_MISMATCH_RECONCILIATION_FAILED: Receipt tenant '${receipt.tenantPartition}' does not match verification tenant '${verification.tenantPartition}'`
      );
    }

    if (receipt.executionId !== verification.executionId) {
      throw new Error(
        `EXECUTION_ID_MISMATCH: Receipt executionId '${receipt.executionId}' does not match verification executionId '${verification.executionId}'`
      );
    }

    const discrepancies: string[] = [];
    let status: ReconciledOutcomeStatus = 'VERIFIED_UNKNOWN';

    // 3. Missing Lifecycle Evidence Checks
    if (!receipt.startedAt || !receipt.completedAt) {
      discrepancies.push('MISSING_TIMING_METADATA: Started or completed timestamp missing');
    }
    if (receipt.executionDurationMs < 0) {
      discrepancies.push(`INVALID_EXECUTION_DURATION: Negative duration (${receipt.executionDurationMs}ms)`);
    }

    // 4. Contradictory Evidence Analysis
    if (receipt.status === 'SUCCEEDED' && verification.status !== 'SUCCESS') {
      discrepancies.push(
        `CONTRADICTORY_OUTCOME: Receipt claimed SUCCEEDED but outcome verifier determined '${verification.status}'`
      );
      status = 'RECONCILIATION_INVALID';
    } else if (receipt.status === 'FAILED' && verification.status === 'SUCCESS') {
      discrepancies.push(
        `CONTRADICTORY_OUTCOME: Receipt claimed FAILED but outcome verifier claimed SUCCESS`
      );
      status = 'RECONCILIATION_INVALID';
    } else if (receipt.status === 'SUCCEEDED' && receipt.error) {
      discrepancies.push(
        `CONTRADICTORY_RECEIPT_ERROR: Receipt status is SUCCEEDED but error field is populated (${receipt.error})`
      );
      status = 'RECONCILIATION_DEGRADED';
    } else if (verification.status === 'UNKNOWN' || receipt.status === 'UNKNOWN') {
      // UNKNOWN preservation: NEVER convert UNKNOWN into SUCCESS
      status = 'VERIFIED_UNKNOWN';
    } else if (verification.status === 'SUCCESS' && receipt.status === 'SUCCEEDED') {
      status = discrepancies.length > 0 ? 'RECONCILIATION_DEGRADED' : 'VERIFIED_SUCCESS';
    } else if (verification.status === 'FAILURE' || receipt.status === 'FAILED') {
      status = 'VERIFIED_FAILURE';
    } else if (verification.status === 'PARTIAL' || receipt.status === 'PARTIAL') {
      status = 'VERIFIED_PARTIAL';
    } else if (verification.status === 'BLOCKED' || receipt.status === 'BLOCKED') {
      status = 'VERIFIED_BLOCKED';
    } else if (verification.status === 'CANCELLED' || receipt.status === 'CANCELLED') {
      status = 'VERIFIED_CANCELLED';
    } else {
      status = 'VERIFIED_UNKNOWN';
    }

    const reconciliationId = createReconciliationId(
      `rec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    );
    const reconciledAt = new Date().toISOString();

    const provenanceHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          reconciliationId,
          executionId: receipt.executionId,
          tenantPartition: receipt.tenantPartition,
          proposalId: receipt.proposalId,
          requestId: receipt.requestId,
          status,
          rawOutcomeStatus: verification.status,
          discrepancies,
          reconciledAt,
        })
      )
      .digest('hex');

    return Object.freeze({
      reconciliationId,
      executionId: receipt.executionId,
      tenantPartition: receipt.tenantPartition,
      proposalId: receipt.proposalId,
      requestId: receipt.requestId,
      candidateId: receipt.candidateId,
      status,
      rawOutcomeStatus: verification.status,
      discrepancies,
      reconciledAt,
      provenanceHash,
    });
  }
}

export const globalPolicyPostExecutionReconciliationEngine = new PolicyPostExecutionReconciliationEngine();
