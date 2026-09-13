// src/core/policyExecution/policyExecutionRecoveryEngine.ts
// BOWCON V4.0 — MS-1.3.65: GOVERNED REMEDIATION EXECUTION & OUTCOME VERIFICATION LAYER
//
// Governed Policy Execution Recovery Engine.
// Reconciles in-flight executions across process restarts, crashes, and timeouts.
// Enforces:
// 1. UNKNOWN != SUCCESS (Incomplete executions never promoted to success)
// 2. Fail-closed recovery: Incomplete or ambiguous executions marked UNKNOWN or TIMEOUT
// 3. Absolute USER_STOP supremacy during recovery
// 4. Non-destructive reconciliation: Never blindly retries side-effecting operations
//
// Động cơ phục hồi thực thi chính sách có quản trị.
// Điều hòa các thực thi đang diễn ra qua các lần khởi động lại tiến trình, sự cố và hết thời gian.
//
// Authority Invariants:
// - ZERO_BLIND_RETRY: Side-effecting remediations never retried without proof of non-execution
// - FAIL_CLOSED_SAFETY: Ambiguous outcomes terminate in UNKNOWN or TIMEOUT
// - USER_STOP_SUPREMACY: Immediate cancellation on active USER_STOP

import path from 'node:path';
import {
  type ExecutionId,
  type ExecutionAttemptRecord,
  type ExecutionRecoveryDisposition,
  type PolicyExecutionOptions,
} from './policyExecutionTypes.js';
import {
  PolicyExecutionIdempotencyGuard,
  globalPolicyExecutionIdempotencyGuard,
} from './policyExecutionIdempotencyGuard.js';
import {
  PolicyExecutionAuditEngine,
  globalPolicyExecutionAuditEngine,
} from './policyExecutionAuditEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export interface PolicyExecutionRecoveryEngineOptions extends PolicyExecutionOptions {
  readonly idempotencyGuard?: PolicyExecutionIdempotencyGuard;
  readonly auditEngine?: PolicyExecutionAuditEngine;
}

export class PolicyExecutionRecoveryEngine {
  private readonly idempotencyGuard: PolicyExecutionIdempotencyGuard;
  private readonly auditEngine: PolicyExecutionAuditEngine;
  private readonly maxExecutionDurationMs: number;
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyExecutionRecoveryEngineOptions) {
    this.idempotencyGuard = options?.idempotencyGuard ?? globalPolicyExecutionIdempotencyGuard;
    this.auditEngine = options?.auditEngine ?? globalPolicyExecutionAuditEngine;
    this.maxExecutionDurationMs = options?.maxExecutionDurationMs ?? 30000; // 30s timeout
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Execution recovery suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('RECOVERY_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Reconciles a single in-flight execution flight.
   * Điều hòa một chuyến bay thực thi đang diễn ra.
   */
  public reconcileFlight(
    tenantPartition: string,
    executionId: ExecutionId
  ): ExecutionRecoveryDisposition {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const attempt = this.idempotencyGuard.getAttempt(tenantPartition, executionId);
    if (!attempt) {
      throw new Error(`RECOVERY_TARGET_NOT_FOUND: ExecutionId '${executionId}' not found in tenant '${tenantPartition}'`);
    }

    const recoveredAt = new Date().toISOString();

    if (attempt.status !== 'EXECUTING' && attempt.status !== 'PENDING' && attempt.status !== 'VALIDATING') {
      // Already terminal
      return Object.freeze({
        executionId,
        originalStatus: attempt.status,
        recoveredStatus: attempt.status,
        actionTaken: 'RECONCILED',
        reason: `Execution is already in terminal state '${attempt.status}'`,
        recoveredAt,
      });
    }

    // Check duration for timeout
    const startTime = new Date(attempt.startedAt).getTime();
    const now = Date.now();
    const elapsed = now - startTime;

    if (elapsed > this.maxExecutionDurationMs) {
      // Timed out
      this.idempotencyGuard.markCompleted(tenantPartition, executionId, 'TIMEOUT');
      this.auditEngine.recordEvent({
        eventType: 'EXECUTION_RECOVERED',
        tenantPartition,
        executionId,
        envelopeId: attempt.envelopeId,
        status: 'TIMEOUT',
        reason: `Execution exceeded max allowable duration (${elapsed}ms > ${this.maxExecutionDurationMs}ms)`,
      });

      return Object.freeze({
        executionId,
        originalStatus: attempt.status,
        recoveredStatus: 'TIMEOUT',
        actionTaken: 'ABORTED_FAIL_CLOSED',
        reason: `Execution timed out after ${elapsed}ms. Marked TIMEOUT.`,
        recoveredAt,
      });
    }

    // Still within timeout window but unresolved across crash/restart
    this.idempotencyGuard.markCompleted(tenantPartition, executionId, 'UNKNOWN');
    this.auditEngine.recordEvent({
      eventType: 'EXECUTION_RECOVERED',
      tenantPartition,
      executionId,
      envelopeId: attempt.envelopeId,
      status: 'UNKNOWN',
      reason: 'Execution flight interrupted by process restart or unhandled crash. Marked UNKNOWN.',
    });

    return Object.freeze({
      executionId,
      originalStatus: attempt.status,
      recoveredStatus: 'UNKNOWN',
      actionTaken: 'MARKED_UNKNOWN',
      reason: 'In-flight execution unconfirmed across crash/restart. Marked UNKNOWN fail-closed.',
      recoveredAt,
    });
  }
}

export const globalPolicyExecutionRecoveryEngine = new PolicyExecutionRecoveryEngine();
