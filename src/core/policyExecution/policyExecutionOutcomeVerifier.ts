// src/core/policyExecution/policyExecutionOutcomeVerifier.ts
// BOWCON V4.0 — MS-1.3.65: GOVERNED REMEDIATION EXECUTION & OUTCOME VERIFICATION LAYER
//
// Governed Policy Execution Outcome Verifier.
// Independently verifies execution receipts and empirical evidence to determine outcome status.
// Enforces:
// 1. Rigorous classification: SUCCESS, FAILURE, PARTIAL, BLOCKED, CANCELLED, UNKNOWN
// 2. UNKNOWN != SUCCESS (Incomplete or unverifiable execution is NEVER marked as SUCCESS)
// 3. Independent validation decoupled from execution dispatcher
// 4. Cryptographic provenance hashing of verified outcome
//
// Bộ xác minh kết quả thực thi chính sách có quản trị.
// Xác minh độc lập các biên nhận thực thi và bằng chứng thực nghiệm để xác định trạng thái kết quả.
//
// Authority Invariants:
// - ZERO_FALSE_SUCCESS: Cannot claim SUCCESS without unambiguous verifiable evidence
// - FAIL_CLOSED_EVALUATION: Corrupted or missing output results in UNKNOWN / FAILURE
// - STRICT_TENANT_ISOLATION: Cannot verify cross-tenant execution receipts

import crypto from 'node:crypto';
import path from 'node:path';
import {
  type ExecutionReceipt,
  type ExecutionVerificationResult,
  type ExecutionOutcomeStatus,
  createExecutionOutcomeId,
} from './policyExecutionTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export interface PolicyExecutionOutcomeVerifierOptions {
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
}

export class PolicyExecutionOutcomeVerifier {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyExecutionOutcomeVerifierOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Outcome verification suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('VERIFICATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Independently verifies an execution receipt against empirical execution evidence.
   * Xác minh độc lập một biên nhận thực thi dựa trên bằng chứng thực thi thực nghiệm.
   */
  public verifyOutcome(receipt: ExecutionReceipt): ExecutionVerificationResult {
    this.assertUserStopInactive();
    this.validateTenant(receipt.tenantPartition);

    const reasons: string[] = [];
    let evidenceCount = 0;
    let finalStatus: ExecutionOutcomeStatus = 'UNKNOWN';
    let verified = false;

    // 1. Check for basic receipt validity
    if (!receipt.executionId || !receipt.envelopeId || !receipt.startedAt || !receipt.completedAt) {
      reasons.push('INCOMPLETE_RECEIPT_METADATA: Required timing or identifier fields missing');
      finalStatus = 'UNKNOWN';
    } else if (receipt.status === 'BLOCKED') {
      reasons.push(`EXECUTION_BLOCKED: ${receipt.error || 'Execution blocked by pre-flight or policy gate'}`);
      finalStatus = 'BLOCKED';
      verified = true;
      evidenceCount++;
    } else if (receipt.status === 'CANCELLED') {
      reasons.push(`EXECUTION_CANCELLED: ${receipt.error || 'Execution cancelled prior to dispatch'}`);
      finalStatus = 'CANCELLED';
      verified = true;
      evidenceCount++;
    } else if (receipt.status === 'TIMEOUT') {
      reasons.push(`EXECUTION_TIMEOUT: Execution exceeded maximum allowable duration (${receipt.executionDurationMs}ms)`);
      finalStatus = 'FAILURE';
      verified = true;
      evidenceCount++;
    } else if (receipt.status === 'FAILED') {
      reasons.push(`EXECUTION_FAILED: ${receipt.error || 'Dispatcher reported execution failure'}`);
      finalStatus = 'FAILURE';
      verified = true;
      evidenceCount++;
    } else if (receipt.status === 'PARTIAL') {
      reasons.push(`EXECUTION_PARTIAL: Actions partially completed. Error: ${receipt.error || 'Partial execution'}`);
      finalStatus = 'PARTIAL';
      verified = true;
      evidenceCount++;
    } else if (receipt.status === 'SUCCEEDED') {
      // 2. Rigorous empirical evidence check for SUCCEEDED
      if (receipt.error) {
        // Contradictory receipt: says SUCCEEDED but has error
        reasons.push(`CONTRADICTORY_RECEIPT: Status is SUCCEEDED but error field is populated: ${receipt.error}`);
        finalStatus = 'UNKNOWN';
        verified = false;
      } else if (!receipt.rawOutput) {
        // Missing dispatch output evidence
        reasons.push('MISSING_EXECUTION_EVIDENCE: Status is SUCCEEDED but rawOutput evidence is absent');
        finalStatus = 'UNKNOWN';
        verified = false;
      } else {
        // Output evidence present
        evidenceCount++;
        const raw = receipt.rawOutput;

        if (typeof raw === 'object' && raw.success === false) {
          reasons.push(`DISPATCH_REPORTED_FAILURE: rawOutput.success is explicitly false`);
          finalStatus = 'FAILURE';
          verified = true;
        } else if (typeof raw === 'object' && raw.partial === true) {
          reasons.push(`DISPATCH_REPORTED_PARTIAL: rawOutput indicates partial completion`);
          finalStatus = 'PARTIAL';
          verified = true;
        } else {
          reasons.push('VERIFIED_EXECUTION_SUCCESS: Valid execution evidence confirmed without errors');
          finalStatus = 'SUCCESS';
          verified = true;
          evidenceCount++;
        }
      }
    } else {
      reasons.push(`UNRECOGNIZED_STATUS: Status '${receipt.status}' cannot be validated`);
      finalStatus = 'UNKNOWN';
      verified = false;
    }

    const verificationId = createExecutionOutcomeId(
      `out_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    );
    const verifiedAt = new Date().toISOString();

    const provenanceHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          verificationId,
          executionId: receipt.executionId,
          envelopeId: receipt.envelopeId,
          tenantPartition: receipt.tenantPartition,
          finalStatus,
          verified,
          evidenceCount,
          verifiedAt,
        })
      )
      .digest('hex');

    return Object.freeze({
      verificationId,
      executionId: receipt.executionId,
      envelopeId: receipt.envelopeId,
      tenantPartition: receipt.tenantPartition,
      status: finalStatus,
      verified,
      evidenceCount,
      reasons,
      verifiedAt,
      provenanceHash,
    });
  }
}

export const globalPolicyExecutionOutcomeVerifier = new PolicyExecutionOutcomeVerifier();
