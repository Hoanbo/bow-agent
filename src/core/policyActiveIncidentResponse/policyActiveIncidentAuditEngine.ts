// src/core/policyActiveIncidentResponse/policyActiveIncidentAuditEngine.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Governed Active Incident Audit Engine (Component 838).
// Dual-records canonical policy incident events to globalAuditLedger under domain
// POLICY_ACTIVE_INCIDENT_RESPONSE, enforcing secret sanitization via DiagnosisSanitizer.
//
// Core Authority Invariants:
// - AUDIT_GRANTS_ZERO_AUTHORITY: Produces non-repudiable audit logs only
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import crypto from 'node:crypto';
import { globalAuditLedger, type AuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer, type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { PolicyActiveIncidentResponseOptions } from './policyActiveIncidentResponseTypes.js';

export const POLICY_ACTIVE_INCIDENT_RESPONSE_AUDIT_DOMAIN = 'POLICY_ACTIVE_INCIDENT_RESPONSE';

export interface ActiveIncidentAuditEvent {
  readonly eventType:
    | 'INCIDENT_DETECTION_STARTED'
    | 'INCIDENT_DETECTED'
    | 'INCIDENT_CLASSIFIED'
    | 'INCIDENT_ESCALATED'
    | 'DEGRADATION_DETECTED'
    | 'RUNTIME_DRIFT_DETECTED'
    | 'PDP_PEP_DRIFT_DETECTED'
    | 'SAFETY_BOUNDARY_ACTIVATED'
    | 'SAFETY_BOUNDARY_BLOCKED'
    | 'HUMAN_REVIEW_REQUIRED'
    | 'INCIDENT_RESOLVED'
    | 'INCIDENT_CLOSED'
    | 'USER_STOP_BLOCKED'
    | 'TENANT_ISOLATION_BLOCKED'
    | 'PROVENANCE_TAMPER_BLOCKED';
  readonly tenantPartition: string;
  readonly actorUserId?: string;
  readonly details: Record<string, any>;
}

export class PolicyActiveIncidentAuditEngine {
  private readonly ledger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(
    options?: PolicyActiveIncidentResponseOptions,
    ledger?: AuditLedger,
    sanitizer?: DiagnosisSanitizer
  ) {
    this.ledger = ledger ?? globalAuditLedger;
    this.sanitizer = sanitizer ?? globalDiagnosisSanitizer;
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active incident audit logging suspended by USER_STOP supremacy');
    }
  }

  /**
   * Records a sanitized audit event to the append-only global audit ledger.
   */
  public recordEvent(event: ActiveIncidentAuditEvent): void {
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
        role: 'system_incident_governor',
        channel: 'GOVERNANCE',
      },
      domain: POLICY_ACTIVE_INCIDENT_RESPONSE_AUDIT_DOMAIN,
      toolName: `incident_response_${event.eventType.toLowerCase()}`,
      classification: 'OBSERVE',
      argumentsHash,
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      resultHash: argumentsHash,
    });
  }
}
