// src/core/policyActiveIncidentResolution/policyContainmentClearanceBoundary.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Governed Containment Clearance Boundary (Component 844).
// Non-bypassable human governance gate enforcing strict human authorization for containment clearance.
// Rejects autonomous personas, bot identities, anonymous/guest operators, self-approvals,
// and clearances with missing or inadequate governance rationales.
//
// Core Authority Invariants:
// - CONTAINMENT_CLEARANCE != RECOVERY_AUTHORIZATION
// - CONTAINMENT_CLEARANCE != POLICY_MUTATION
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS CONTAINMENT CLEARANCE
// - ZERO AUTONOMOUS POLICY MUTATION
// - FAIL_CLOSED

import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type {
  ContainmentAssessmentRecord,
  ContainmentClearanceRecord,
  PolicyActiveIncidentResolutionOptions,
} from './policyActiveIncidentResolutionTypes.js';
import { createContainmentClearanceId } from './policyActiveIncidentResolutionTypes.js';

export interface ContainmentClearanceParams {
  readonly tenantPartition: string;
  readonly assessment: ContainmentAssessmentRecord;
  readonly operatorId: string;
  readonly operatorRole: HumanAuthorizationRole;
  readonly governanceRationale: string;
  readonly originalReporterId?: string | null;
  readonly previousProvenanceHash: string;
}

export class PolicyContainmentClearanceBoundary {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyActiveIncidentResolutionOptions) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Containment clearance boundary suspended by USER_STOP supremacy');
    }
  }

  /**
   * Evaluates and issues a governed human containment clearance.
   */
  public clearContainment(params: ContainmentClearanceParams): ContainmentClearanceRecord {
    this.assertUserStopInactive();

    const {
      tenantPartition,
      assessment,
      operatorId,
      operatorRole,
      governanceRationale,
      originalReporterId,
      previousProvenanceHash,
    } = params;

    // 1. Operator validation
    if (!operatorId || typeof operatorId !== 'string' || operatorId.trim().length === 0) {
      throw new Error('CONTAINMENT_CLEARANCE_REJECTED: Operator identifier must be a non-empty string');
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
      throw new Error(`CONTAINMENT_CLEARANCE_REJECTED: Autonomous persona '${operatorId}' cannot grant containment clearance.`);
    }

    // 2. Anti-Self-Approval check
    if (originalReporterId && originalReporterId.trim() === operatorId.trim()) {
      throw new Error(`ANTI_SELF_APPROVAL_VIOLATION: Operator '${operatorId}' cannot clear containment on an incident they originally reported.`);
    }

    // 3. Governance Rationale check
    if (!governanceRationale || governanceRationale.trim().length < 10) {
      throw new Error('CONTAINMENT_CLEARANCE_REJECTED: Explicit human governance rationale (>= 10 characters) is required.');
    }

    // 4. Assessment Status check
    if (!assessment || assessment.status !== 'CONTAINED') {
      throw new Error(`CONTAINMENT_CLEARANCE_REJECTED: Containment assessment status is '${assessment?.status}', requires 'CONTAINED'.`);
    }

    if (assessment.tenantPartition !== tenantPartition) {
      throw new Error(`CONTAINMENT_CLEARANCE_REJECTED: Assessment tenant '${assessment.tenantPartition}' does not match '${tenantPartition}'.`);
    }

    // 5. Provenance binding check
    if (!previousProvenanceHash || typeof previousProvenanceHash !== 'string' || previousProvenanceHash.trim().length === 0) {
      throw new Error('CONTAINMENT_CLEARANCE_REJECTED: Missing required cryptographic provenance hash.');
    }

    const clearanceId = createContainmentClearanceId(`cc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    return Object.freeze({
      clearanceId,
      tenantPartition,
      incidentId: assessment.incidentId,
      assessmentId: assessment.assessmentId,
      operatorId: operatorId.trim(),
      operatorRole,
      governanceRationale: governanceRationale.trim(),
      clearedAt: new Date().toISOString(),
      isAutonomous: false as const,
      provenanceHash: previousProvenanceHash,
    });
  }
}
