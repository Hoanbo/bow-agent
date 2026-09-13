// src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationAuditEngine.ts
// BOWCON V4.0 — MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION
//
// Governed Lifecycle Reconciliation Audit Engine (Component 827).
// Dual-records canonical lifecycle reconciliation events to globalAuditLedger under the
// domain POLICY_ACTIVE_LIFECYCLE_RECONCILIATION, enforcing secret sanitization via DiagnosisSanitizer.
//
// Core Authority Invariants:
// - AUDIT_GRANTS_ZERO_AUTHORITY: Produces non-repudiable audit logs only
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import crypto from 'node:crypto';
import { globalAuditLedger, type AuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer, type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { PolicyActiveLifecycleReconciliationOptions } from './policyActiveLifecycleReconciliationTypes.js';

export const POLICY_ACTIVE_LIFECYCLE_RECONCILIATION_AUDIT_DOMAIN = 'POLICY_ACTIVE_LIFECYCLE_RECONCILIATION';

export interface LifecycleReconciliationAuditEvent {
  readonly eventType:
    | 'LIFECYCLE_RECONCILIATION_STARTED'
    | 'ACTIVE_POLICY_RESOLVED'
    | 'RUNTIME_POLICY_RECONCILIATION_STARTED'
    | 'RUNTIME_POLICY_DRIFT_DETECTED'
    | 'PDP_RECONCILIATION_COMPLETED'
    | 'PEP_RECONCILIATION_COMPLETED'
    | 'VERSION_CONSISTENCY_VERIFIED'
    | 'ROLLBACK_CONSISTENCY_VERIFIED'
    | 'SUNSET_CONSISTENCY_VERIFIED'
    | 'RECOVERY_CONSISTENCY_VERIFIED'
    | 'PROVENANCE_CONSISTENCY_VERIFIED'
    | 'LIFECYCLE_RECONCILIATION_PASSED'
    | 'LIFECYCLE_RECONCILIATION_BLOCKED'
    | 'TENANT_ISOLATION_BLOCKED'
    | 'USER_STOP_BLOCKED'
    | 'PROVENANCE_TAMPER_BLOCKED';
  readonly tenantPartition: string;
  readonly actorUserId?: string;
  readonly details: Record<string, any>;
}

export class PolicyActiveLifecycleReconciliationAuditEngine {
  private readonly ledger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(
    options?: PolicyActiveLifecycleReconciliationOptions,
    ledger?: AuditLedger,
    sanitizer?: DiagnosisSanitizer
  ) {
    this.ledger = ledger ?? globalAuditLedger;
    this.sanitizer = sanitizer ?? globalDiagnosisSanitizer;
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Lifecycle reconciliation audit logging suspended by USER_STOP supremacy');
    }
  }

  /**
   * Records a sanitized audit event to the append-only global audit ledger.
   */
  public recordEvent(event: LifecycleReconciliationAuditEvent): void {
    this.assertUserStopInactive();

    const timestamp = new Date().toISOString();
    const sanitizedDetails = this.sanitizer.sanitize(event.details);

    const argumentsHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(sanitizedDetails))
      .digest('hex');

    this.ledger.record({
      timestamp,
      actor: {
        userId: event.actorUserId ?? event.tenantPartition,
        role: 'system_reconciler',
        channel: 'GOVERNANCE',
      },
      domain: POLICY_ACTIVE_LIFECYCLE_RECONCILIATION_AUDIT_DOMAIN,
      toolName: `active_reconciliation_${event.eventType.toLowerCase()}`,
      classification: 'OBSERVE',
      argumentsHash,
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      resultHash: argumentsHash,
    });
  }
}
