// src/core/policyPhaseExitAudit/policyPhaseExitAuditEngine.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Canonical Audit Engine (Component 898).
// Records structured audit events under domain POLICY_PHASE_EXIT_EVIDENCE_AUDIT to globalAuditLedger.
// Sanitizes all payloads via DiagnosisSanitizer.
//
// Core Authority Invariants:
// - AUDIT != POLICY_AUTHORITY
// - AUDIT != POLICY_MUTATION
// - USER_STOP > EVERYTHING

import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export const POLICY_PHASE_EXIT_EVIDENCE_AUDIT_DOMAIN = 'POLICY_PHASE_EXIT_EVIDENCE_AUDIT';

export type PhaseExitAuditEventType =
  | 'PHASE_EXIT_AUDIT_STARTED'
  | 'PHASE_EXIT_EVIDENCE_COLLECTED'
  | 'PHASE_EXIT_CRITERION_VERIFIED'
  | 'PHASE_EXIT_CRITERION_BLOCKED'
  | 'PHASE_EXIT_CIRCULAR_EVIDENCE_DETECTED'
  | 'PHASE_EXIT_CONFLICTING_EVIDENCE_DETECTED'
  | 'PHASE_EXIT_AUDIT_COMPLETED'
  | 'PHASE_EXIT_AUDIT_BLOCKED'
  | 'USER_STOP_BLOCKED';

export interface PhaseExitAuditEventParams {
  readonly eventType: PhaseExitAuditEventType;
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly details: Record<string, any>;
}

export class PolicyPhaseExitAuditEngine {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Audit engine suspended by USER_STOP supremacy');
    }
  }

  /**
   * Records a sanitized audit event into the global audit ledger.
   */
  public recordEvent(params: PhaseExitAuditEventParams): void {
    this.assertUserStopInactive();

    const sanitizedDetails = globalDiagnosisSanitizer.sanitize(params.details);

    globalAuditLedger.record({
      timestamp: new Date().toISOString(),
      actor: {
        userId: params.actorUserId ?? params.tenantId,
        role: 'AUDITOR',
        channel: 'GOVERNANCE',
      },
      domain: POLICY_PHASE_EXIT_EVIDENCE_AUDIT_DOMAIN,
      toolName: `audit_${params.eventType.toLowerCase()}`,
      classification: 'OBSERVE',
      argumentsHash: '',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      resultHash: '',
      metadata: sanitizedDetails,
      details: sanitizedDetails,
    } as any);
  }
}
