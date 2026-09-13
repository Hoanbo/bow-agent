// src/core/policyExecution/policyExecutionIdempotencyGuard.ts
// BOWCON V4.0 — MS-1.3.65: GOVERNED REMEDIATION EXECUTION & OUTCOME VERIFICATION LAYER
//
// Governed Policy Execution Idempotency Guard.
// Guarantees single-flight, non-replayable execution of remediation envelopes.
// Enforces:
// 1. One authorized execution envelope -> exactly one execution attempt
// 2. Immediate fail-closed rejection on duplicate or replayed envelope IDs
// 3. Strict tenant partition isolation
// 4. Atomic flight reservation
// 5. Invariant: Idempotency guard NEVER acts as a bypass around authorization
//
// Bộ bảo vệ tính bất biến thực thi chính sách có quản trị.
// Đảm bảo thực thi đơn tuyến, không thể phát lại cho các phong bì khắc phục.
//
// Authority Invariants:
// - ZERO_REPLAY_ALLOWANCE: Replayed envelopes fail closed immediately
// - STRICT_TENANT_ISOLATION: Cross-tenant registration/access forbidden
// - ATOMIC_FLIGHT_RESERVATION: Races between duplicate executions fail closed

import crypto from 'node:crypto';
import path from 'node:path';
import type { RemediationExecutionEnvelope } from '../policyDecision/policyDecisionTypes.js';
import {
  type ExecutionId,
  type ExecutionAttemptId,
  type ExecutionLifecycleStatus,
  type ExecutionAttemptRecord,
  createExecutionAttemptId,
} from './policyExecutionTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export interface PolicyExecutionIdempotencyGuardOptions {
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
}

export class PolicyExecutionIdempotencyGuard {
  // Tenant -> Map<envelopeId, ExecutionAttemptRecord>
  private readonly tenantAttempts: Map<string, Map<string, ExecutionAttemptRecord>> = new Map();
  // Tenant -> Map<executionId, ExecutionAttemptRecord>
  private readonly executionLookup: Map<string, Map<string, ExecutionAttemptRecord>> = new Map();
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyExecutionIdempotencyGuardOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Idempotency check suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('IDEMPOTENCY_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  private getTenantAttempts(tenantPartition: string): Map<string, ExecutionAttemptRecord> {
    let map = this.tenantAttempts.get(tenantPartition);
    if (!map) {
      map = new Map();
      this.tenantAttempts.set(tenantPartition, map);
    }
    return map;
  }

  private getTenantExecutions(tenantPartition: string): Map<string, ExecutionAttemptRecord> {
    let map = this.executionLookup.get(tenantPartition);
    if (!map) {
      map = new Map();
      this.executionLookup.set(tenantPartition, map);
    }
    return map;
  }

  /**
   * Atomically reserves an execution flight for an authorized envelope.
   * If the envelope was already executed or is currently executing, fails closed.
   *
   * Đặt chỗ thực thi nguyên tử cho một phong bì đã ủy quyền.
   * Nếu phong bì đã được thực thi hoặc đang thực thi, sẽ thất bại đóng.
   */
  public registerAttempt(
    envelope: RemediationExecutionEnvelope,
    executionId: ExecutionId
  ): ExecutionAttemptRecord {
    this.assertUserStopInactive();
    this.validateTenant(envelope.tenantPartition);

    const attempts = this.getTenantAttempts(envelope.tenantPartition);
    const executions = this.getTenantExecutions(envelope.tenantPartition);

    const existing = attempts.get(envelope.envelopeId);
    if (existing) {
      if (existing.status === 'EXECUTING') {
        throw new Error(
          `CONCURRENT_EXECUTION_CONFLICT: Envelope '${envelope.envelopeId}' is currently executing (Attempt: ${existing.attemptId})`
        );
      }
      throw new Error(
        `DUPLICATE_EXECUTION_ATTEMPT: Envelope '${envelope.envelopeId}' has already been processed with status '${existing.status}' (ExecutionId: ${existing.executionId})`
      );
    }

    const attemptId = createExecutionAttemptId(
      `att_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    );
    const startedAt = new Date().toISOString();
    const attemptHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          attemptId,
          executionId,
          envelopeId: envelope.envelopeId,
          requestId: envelope.requestId,
          tenantPartition: envelope.tenantPartition,
          startedAt,
        })
      )
      .digest('hex');

    const record: ExecutionAttemptRecord = Object.freeze({
      attemptId,
      executionId,
      envelopeId: envelope.envelopeId,
      requestId: envelope.requestId,
      tenantPartition: envelope.tenantPartition,
      status: 'EXECUTING',
      startedAt,
      attemptHash,
    });

    attempts.set(envelope.envelopeId, record);
    executions.set(executionId, record);

    return record;
  }

  /**
   * Updates an execution flight upon completion.
   * Cập nhật chuyến bay thực thi khi hoàn tất.
   */
  public markCompleted(
    tenantPartition: string,
    executionId: ExecutionId,
    finalStatus: ExecutionLifecycleStatus
  ): ExecutionAttemptRecord {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const executions = this.getTenantExecutions(tenantPartition);
    const existing = executions.get(executionId);
    if (!existing) {
      throw new Error(
        `EXECUTION_ATTEMPT_NOT_FOUND: No active attempt found for executionId '${executionId}' in tenant '${tenantPartition}'`
      );
    }

    const completedAt = new Date().toISOString();
    const updated: ExecutionAttemptRecord = Object.freeze({
      ...existing,
      status: finalStatus,
      completedAt,
    });

    const attempts = this.getTenantAttempts(tenantPartition);
    attempts.set(existing.envelopeId, updated);
    executions.set(executionId, updated);

    return updated;
  }

  /**
   * Gets attempt by envelopeId within a tenant.
   */
  public getAttemptByEnvelopeId(
    tenantPartition: string,
    envelopeId: string
  ): ExecutionAttemptRecord | undefined {
    this.validateTenant(tenantPartition);
    return this.getTenantAttempts(tenantPartition).get(envelopeId);
  }

  /**
   * Gets attempt by executionId within a tenant.
   */
  public getAttempt(
    tenantPartition: string,
    executionId: ExecutionId
  ): ExecutionAttemptRecord | undefined {
    this.validateTenant(tenantPartition);
    return this.getTenantExecutions(tenantPartition).get(executionId);
  }
}

export const globalPolicyExecutionIdempotencyGuard = new PolicyExecutionIdempotencyGuard();
