// src/core/policyActiveIncidentResolution/policyIncidentClosureBoundary.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Governed Incident Closure Boundary (Component 849).
// Final terminal governance gate requiring explicit human closure authorization.
// Rejects autonomous personas, bot identities, and closure attempts lacking confirmed resolution evidence.
// Preserves full immutable incident history (zero deletion, zero historical record rewriting).
//
// Core Authority Invariants:
// - INCIDENT_CLOSURE != INCIDENT_DELETION
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS INCIDENT CLOSURE
// - ZERO DIRECT TOOL EXECUTION
// - FAIL_CLOSED

import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type {
  IncidentResolutionRecord,
  IncidentClosureRecord,
  PolicyActiveIncidentResolutionOptions,
} from './policyActiveIncidentResolutionTypes.js';
import { createIncidentClosureId } from './policyActiveIncidentResolutionTypes.js';

export interface IncidentClosureParams {
  readonly tenantPartition: string;
  readonly resolution: IncidentResolutionRecord;
  readonly operatorId: string;
  readonly operatorRole: HumanAuthorizationRole;
  readonly closureRationale: string;
  readonly previousProvenanceHash: string;
  readonly originalReporterId?: string | null;
}

export class PolicyIncidentClosureBoundary {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyActiveIncidentResolutionOptions) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Incident closure boundary suspended by USER_STOP supremacy');
    }
  }

  /**
   * Evaluates closure conditions and produces an immutable IncidentClosureRecord.
   */
  public closeIncident(params: IncidentClosureParams): IncidentClosureRecord {
    this.assertUserStopInactive();

    const {
      tenantPartition,
      resolution,
      operatorId,
      operatorRole,
      closureRationale,
      previousProvenanceHash,
      originalReporterId,
    } = params;

    // 1. Operator validation
    if (!operatorId || typeof operatorId !== 'string' || operatorId.trim().length === 0) {
      throw new Error('INCIDENT_CLOSURE_REJECTED: Operator identifier must be a non-empty string');
    }

    const opLower = operatorId.toLowerCase().trim();
    if (
      opLower.startsWith('auto_') ||
      opLower.startsWith('bot_') ||
      opLower.includes('ai_agent') ||
      opLower.includes('daemon') ||
      opLower === 'anonymous' ||
      opLower === 'guest'
    ) {
      throw new Error(`INCIDENT_CLOSURE_REJECTED: Autonomous persona '${operatorId}' cannot authorize incident closure.`);
    }

    // 2. Anti-Self-Approval check
    if (originalReporterId && originalReporterId.trim() === operatorId.trim()) {
      throw new Error(`ANTI_SELF_APPROVAL_VIOLATION: Operator '${operatorId}' cannot close an incident they originally reported.`);
    }

    // 3. Rationale validation
    if (!closureRationale || closureRationale.trim().length < 10) {
      throw new Error('INCIDENT_CLOSURE_REJECTED: Explicit human governance closure rationale (>= 10 characters) required.');
    }

    // 4. Resolution status validation
    if (!resolution || resolution.status !== 'CONFIRMED') {
      throw new Error(`INCIDENT_CLOSURE_REJECTED: Resolution record status is '${resolution?.status}', requires 'CONFIRMED'.`);
    }

    if (resolution.tenantPartition !== tenantPartition) {
      throw new Error(`INCIDENT_CLOSURE_REJECTED: Resolution tenant '${resolution.tenantPartition}' != '${tenantPartition}'.`);
    }

    // 5. Provenance validation
    if (!previousProvenanceHash || typeof previousProvenanceHash !== 'string' || previousProvenanceHash.trim().length === 0) {
      throw new Error('INCIDENT_CLOSURE_REJECTED: Missing cryptographic provenance hash.');
    }

    const closureId = createIncidentClosureId(`ic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    return Object.freeze({
      closureId,
      tenantPartition,
      incidentId: resolution.incidentId,
      resolutionId: resolution.resolutionId,
      operatorId: operatorId.trim(),
      operatorRole,
      closureRationale: closureRationale.trim(),
      closedAt: new Date().toISOString(),
      isAutonomous: false as const,
      provenanceHash: previousProvenanceHash,
      isIncidentDeleted: false as const,
      isHistoryRewritten: false as const,
    });
  }
}
