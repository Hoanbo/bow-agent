// src/core/policyPhaseTransition/policyPhaseTransitionAuditEngine.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Governed Phase Transition Audit Engine (Component 881).
// Emits structured canonical audit events to globalAuditLedger under domain POLICY_PHASE_TRANSITION.
// Enforces secret scrubbing via DiagnosisSanitizer.
//
// Core Authority Invariants:
// - AUDIT_ENGINE_HOLDS_ZERO_AUTHORITY
// - SECRETS_MUST_BE_STRIPPED_BEFORE_PERSISTENCE
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import { globalAuditLedger, type AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export const POLICY_PHASE_TRANSITION_AUDIT_DOMAIN = 'POLICY_PHASE_TRANSITION';

export interface PhaseTransitionAuditEvent {
  readonly eventType: string;
  readonly tenantId: string;
  readonly actorUserId?: string;
  readonly actorRole?: string;
  readonly details: Record<string, any>;
  readonly timestamp?: string;
  readonly executionStatus?: string;
}

export class PolicyPhaseTransitionAuditEngine {
  private readonly ledger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: {
    readonly isUserStopActive?: () => boolean;
    readonly ledger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
  }) {
    this.ledger = options?.ledger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Transition audit engine suspended by USER_STOP supremacy');
    }
  }

  /**
   * Records a structured phase transition audit event to the global ledger.
   */
  public recordEvent(event: PhaseTransitionAuditEvent): void {
    this.assertUserStopInactive();

    const timestamp = event.timestamp ?? new Date().toISOString();
    const sanitizedDetails = this.sanitizer.sanitize(event.details ?? {});

    this.ledger.record({
      timestamp,
      actor: {
        userId: event.actorUserId ?? event.tenantId,
        role: event.actorRole ?? 'SYSTEM',
        channel: 'GOVERNANCE',
      },
      domain: POLICY_PHASE_TRANSITION_AUDIT_DOMAIN,
      toolName: `phase_transition_${event.eventType.toLowerCase()}`,
      classification: 'OBSERVE',
      argumentsHash: '',
      policyDecision: 'PERMIT',
      executionStatus: (event.executionStatus ?? 'SUCCESS') as any,
      resultHash: '',
      details: typeof sanitizedDetails === 'string' ? JSON.parse(sanitizedDetails) : sanitizedDetails,
    } as any);
  }
}
