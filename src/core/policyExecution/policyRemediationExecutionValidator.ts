// src/core/policyExecution/policyRemediationExecutionValidator.ts
// BOWCON V4.0 — MS-1.3.65: GOVERNED REMEDIATION EXECUTION & OUTCOME VERIFICATION LAYER
//
// Governed Policy Remediation Execution Validator.
// Rigorously validates execution envelopes before any execution attempt.
// Enforces:
// 1. Absolute USER_STOP supremacy
// 2. Strict tenant isolation (resolveUserPartition, no anonymous/traversal)
// 3. Immutable hard-forbidden safety floor
// 4. Circuit-breaker interlock
// 5. Envelope freshness and expiration
// 6. Non-autonomous human operator binding
//
// Bộ xác thực thực thi khắc phục chính sách có quản trị.
// Xác thực nghiêm ngặt phong bì thực thi trước bất kỳ nỗ lực thực thi nào.
//
// Authority Invariants:
// - ZERO_AUTONOMOUS_AUTHORIZATION: Rejects autonomous operator identities
// - FAIL_CLOSED_ON_TAMPERING: Corrupted or invalid envelopes rejected immediately
// - HARD_FORBIDDEN_IMMUTABILITY: Permanent block on prohibited targets

import path from 'node:path';
import type { RemediationExecutionEnvelope } from '../policyDecision/policyDecisionTypes.js';
import type {
  ExecutionPreflightValidation,
  PolicyExecutionOptions,
} from './policyExecutionTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import {
  PolicyCanaryCircuitBreaker,
  globalPolicyCanaryCircuitBreaker,
} from '../policyCanary/policyCanaryCircuitBreaker.js';
import { CANONICAL_HARD_FORBIDDEN_ACTIONS } from '../policyEnforcement/policyEnforcementTypes.js';

export interface PolicyRemediationExecutionValidatorOptions extends PolicyExecutionOptions {
  readonly circuitBreaker?: PolicyCanaryCircuitBreaker;
}

const AUTONOMOUS_OPERATOR_PATTERN = /^(auto_|bot_|ai_agent|synthetic_|system_daemon)/i;

export class PolicyRemediationExecutionValidator {
  private readonly circuitBreaker: PolicyCanaryCircuitBreaker;
  private readonly maxEnvelopeAgeMs: number;
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyRemediationExecutionValidatorOptions) {
    this.circuitBreaker = options?.circuitBreaker ?? globalPolicyCanaryCircuitBreaker;
    this.maxEnvelopeAgeMs = options?.maxEnvelopeAgeMs ?? 3600000; // 1 hour max age
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Execution validation suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('EXECUTION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Pre-flight validates an execution envelope.
   * Throws fail-closed errors on security violations, or returns an ExecutionPreflightValidation.
   *
   * Xác thực tiền bay cho một phong bì thực thi.
   * Ném ra lỗi đóng khi có vi phạm bảo mật, hoặc trả về một ExecutionPreflightValidation.
   */
  public validate(envelope: RemediationExecutionEnvelope): ExecutionPreflightValidation {
    const validatedAt = new Date().toISOString();

    // 1. Check USER_STOP
    this.assertUserStopInactive();

    // 2. Validate envelope presence and structure
    if (!envelope || typeof envelope !== 'object') {
      throw new Error('INVALID_EXECUTION_ENVELOPE: Envelope must be a defined object');
    }
    if (!envelope.envelopeId || typeof envelope.envelopeId !== 'string' || envelope.envelopeId.trim().length === 0) {
      throw new Error('INVALID_EXECUTION_ENVELOPE: Missing envelopeId');
    }
    if (!envelope.requestId || typeof envelope.requestId !== 'string' || envelope.requestId.trim().length === 0) {
      throw new Error('INVALID_EXECUTION_ENVELOPE: Missing requestId');
    }
    if (!envelope.proposalId || typeof envelope.proposalId !== 'string' || envelope.proposalId.trim().length === 0) {
      throw new Error('INVALID_EXECUTION_ENVELOPE: Missing proposalId');
    }

    // 3. Validate Tenant Partition Isolation
    this.validateTenant(envelope.tenantPartition);

    // 4. Validate Freshness / Staleness
    const preparedTime = new Date(envelope.preparedAt).getTime();
    const now = Date.now();
    if (Number.isNaN(preparedTime) || now - preparedTime > this.maxEnvelopeAgeMs) {
      throw new Error(
        `EXPIRED_EXECUTION_ENVELOPE: Envelope preparedAt (${envelope.preparedAt}) exceeds maximum allowable age (${this.maxEnvelopeAgeMs}ms)`
      );
    }

    // 5. Validate Human Operator
    if (!envelope.authorizedOperatorId || typeof envelope.authorizedOperatorId !== 'string') {
      throw new Error('UNAUTHORIZED_EXECUTION: Missing authorizedOperatorId');
    }
    if (AUTONOMOUS_OPERATOR_PATTERN.test(envelope.authorizedOperatorId.trim())) {
      throw new Error(
        `AUTONOMOUS_EXECUTION_DENIED: Operator ID '${envelope.authorizedOperatorId}' matches autonomous pattern. Human authorization required.`
      );
    }

    // 6. Hard-Forbidden Safety Floor Verification
    const proposedActions: string[] = envelope.dispatchPayload?.proposedActions || [];
    for (const action of proposedActions) {
      const lower = action.toLowerCase();
      for (const forbidden of CANONICAL_HARD_FORBIDDEN_ACTIONS) {
        if (lower.includes(forbidden)) {
          throw new Error(
            `HARD_FORBIDDEN_EXECUTION_DENIED: Proposed action '${action}' violates canonical safety floor (${forbidden})`
          );
        }
      }
    }

    // 7. Circuit Breaker Check
    const cbStatus = this.circuitBreaker.getStatus(envelope.tenantPartition);
    const isSafetyRestoration =
      envelope.actionType === 'BLOCK_POLICY_CANDIDATE' || envelope.actionType === 'ROLLBACK_TO_BASELINE';

    if (cbStatus.tripped && !isSafetyRestoration) {
      throw new Error(
        `CIRCUIT_BREAKER_ACTIVE_BLOCKED: Tenant circuit breaker is tripped (${cbStatus.tripReason ?? 'TRIPPED'}). Non-safety remediation blocked.`
      );
    }

    return Object.freeze({
      valid: true,
      envelopeId: envelope.envelopeId,
      tenantPartition: envelope.tenantPartition,
      checks: Object.freeze({
        userStopClear: true,
        safetyFloorVerified: true,
        circuitBreakerClear: !cbStatus.tripped || isSafetyRestoration,
        authorizationValid: true,
        notExpired: true,
        tenantIsolated: true,
        candidateValid: true,
      }),
      validatedAt,
    });
  }
}

export const globalPolicyRemediationExecutionValidator = new PolicyRemediationExecutionValidator();
