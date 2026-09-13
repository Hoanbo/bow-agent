// src/core/policyActiveIncidentResponse/policyIncidentEscalationEngine.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Governed Incident Escalation Engine (Component 835).
// Produces immutable human governance escalation records for active policy incidents.
// Enforces mandatory human operator review; rejects autonomous self-approval or de-escalation.
//
// Core Authority Invariants:
// - ESCALATION_ENGINE_GRANTS_ZERO_AUTHORITY: Produces governance notices only
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import crypto from 'node:crypto';
import type {
  ActiveIncidentId,
  IncidentEscalationRecord,
  IncidentSeverity,
  PolicyActiveIncidentResponseOptions,
} from './policyActiveIncidentResponseTypes.js';
import { createIncidentEscalationId } from './policyActiveIncidentResponseTypes.js';

export class PolicyIncidentEscalationEngine {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyActiveIncidentResponseOptions) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Incident escalation suspended by USER_STOP supremacy');
    }
  }

  /**
   * Generates an immutable human escalation record for a verified incident.
   */
  public escalateIncident(
    tenantPartition: string,
    incidentId: ActiveIncidentId,
    severity: IncidentSeverity,
    violatedInvariant: string,
    requiredHumanAction: string
  ): IncidentEscalationRecord {
    this.assertUserStopInactive();

    const escalationId = createIncidentEscalationId(`esc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    const escalatedAt = new Date().toISOString();

    const provenanceHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ escalationId, incidentId, tenantPartition, severity, violatedInvariant, requiredHumanAction, escalatedAt }))
      .digest('hex');

    const record: IncidentEscalationRecord = Object.freeze({
      escalationId,
      incidentId,
      tenantPartition,
      severity,
      violatedInvariant,
      requiredHumanAction,
      escalatedAt,
      isAutonomous: false,
      provenanceHash,
    });

    return record;
  }
}
