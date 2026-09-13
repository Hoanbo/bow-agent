// src/core/policyActiveIncidentResolution/policyActiveIncidentResolutionRuntime.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Master Active Policy Incident Resolution Runtime Coordinator (Component 853).
// Coordinates the full 9-stage incident resolution lifecycle:
// 1. Incident acknowledgement
// 2. Incident investigation handoff / revalidation
// 3. Containment assessment
// 4. Human containment clearance
// 5. Human recovery authorization
// 6. Governed recovery handoff (to MS-1.3.72 PolicyActiveRollbackRuntime)
// 7. Recovery verification (across MS-1.3.70 - MS-1.3.74)
// 8. Incident resolution confirmation
// 9. Governed incident closure
//
// Core Authority Invariants:
// - INCIDENT != INCIDENT_RESOLUTION
// - CONTAINMENT_CLEARANCE != RECOVERY_AUTHORIZATION
// - RECOVERY_AUTHORIZATION != RECOVERY_EXECUTION
// - RECOVERY_EXECUTION != RECOVERY_VERIFICATION
// - RECOVERY_VERIFICATION != INCIDENT_CLOSURE
// - INCIDENT_CLOSURE != INCIDENT_DELETION
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - ZERO AUTONOMOUS INCIDENT CLOSURE
// - ZERO AUTONOMOUS CONTAINMENT CLEARANCE
// - ZERO DIRECT TOOL EXECUTION
// - ZERO DIRECT POLICY MUTATION
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { PolicyActiveIncidentStore } from '../policyActiveIncidentResponse/policyActiveIncidentStore.js';
import type { PolicyEmergencySafetyBoundary } from '../policyActiveIncidentResponse/policyEmergencySafetyBoundary.js';
import type { PolicyActivationStateStore } from '../policyStagedActivation/policyActivationStateStore.js';
import type { PolicyActiveRuntimeCoordinator } from '../policyActiveRuntime/policyActiveRuntimeCoordinator.js';
import type { PolicyActiveRollbackRuntime } from '../policyActiveRollback/policyActiveRollbackRuntime.js';
import type { PolicyActiveLifecycleReconciliationRuntime } from '../policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationRuntime.js';
import type {
  ContainmentAssessmentRecord,
  ContainmentClearanceRecord,
  RecoveryAuthorizationRecord,
  IncidentRecoveryHandoffRecord,
  IncidentRecoveryVerificationRecord,
  IncidentResolutionRecord,
  IncidentClosureRecord,
  PolicyActiveIncidentResolutionOptions,
} from './policyActiveIncidentResolutionTypes.js';
import { PolicyIncidentResolutionRevalidationEngine } from './policyIncidentResolutionRevalidationEngine.js';
import { PolicyContainmentAssessmentEngine } from './policyContainmentAssessmentEngine.js';
import { PolicyContainmentClearanceBoundary } from './policyContainmentClearanceBoundary.js';
import { PolicyRecoveryAuthorizationEngine } from './policyRecoveryAuthorizationEngine.js';
import { PolicyIncidentRecoveryHandoffEngine } from './policyIncidentRecoveryHandoffEngine.js';
import { PolicyIncidentRecoveryVerificationEngine } from './policyIncidentRecoveryVerificationEngine.js';
import { PolicyIncidentResolutionEngine } from './policyIncidentResolutionEngine.js';
import { PolicyIncidentClosureBoundary } from './policyIncidentClosureBoundary.js';
import { PolicyActiveIncidentResolutionStore } from './policyActiveIncidentResolutionStore.js';
import { PolicyActiveIncidentResolutionProvenanceEngine } from './policyActiveIncidentResolutionProvenanceEngine.js';
import { PolicyActiveIncidentResolutionAuditEngine } from './policyActiveIncidentResolutionAuditEngine.js';

export class PolicyActiveIncidentResolutionRuntime {
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly incidentStore?: PolicyActiveIncidentStore;
  private readonly safetyBoundary?: PolicyEmergencySafetyBoundary;
  private readonly stateStore?: PolicyActivationStateStore;
  private readonly runtimeCoordinator?: PolicyActiveRuntimeCoordinator;
  private readonly rollbackRuntime?: PolicyActiveRollbackRuntime;
  private readonly reconciliationRuntime?: PolicyActiveLifecycleReconciliationRuntime;

  private readonly resolutionStore: PolicyActiveIncidentResolutionStore;
  private readonly revalidationEngine: PolicyIncidentResolutionRevalidationEngine;
  private readonly assessmentEngine: PolicyContainmentAssessmentEngine;
  private readonly clearanceBoundary: PolicyContainmentClearanceBoundary;
  private readonly recoveryAuthEngine: PolicyRecoveryAuthorizationEngine;
  private readonly handoffEngine: PolicyIncidentRecoveryHandoffEngine;
  private readonly verificationEngine: PolicyIncidentRecoveryVerificationEngine;
  private readonly resolutionEngine: PolicyIncidentResolutionEngine;
  private readonly closureBoundary: PolicyIncidentClosureBoundary;
  private readonly provenanceEngine: PolicyActiveIncidentResolutionProvenanceEngine;
  private readonly auditEngine: PolicyActiveIncidentResolutionAuditEngine;

  constructor(
    options?: PolicyActiveIncidentResolutionOptions,
    dependencies?: {
      incidentStore?: PolicyActiveIncidentStore;
      safetyBoundary?: PolicyEmergencySafetyBoundary;
      stateStore?: PolicyActivationStateStore;
      runtimeCoordinator?: PolicyActiveRuntimeCoordinator;
      rollbackRuntime?: PolicyActiveRollbackRuntime;
      reconciliationRuntime?: PolicyActiveLifecycleReconciliationRuntime;
      resolutionStore?: PolicyActiveIncidentResolutionStore;
    }
  ) {
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.incidentStore = dependencies?.incidentStore;
    this.safetyBoundary = dependencies?.safetyBoundary;
    this.stateStore = dependencies?.stateStore;
    this.runtimeCoordinator = dependencies?.runtimeCoordinator;
    this.rollbackRuntime = dependencies?.rollbackRuntime;
    this.reconciliationRuntime = dependencies?.reconciliationRuntime;

    this.resolutionStore = dependencies?.resolutionStore ?? new PolicyActiveIncidentResolutionStore(options);
    this.revalidationEngine = new PolicyIncidentResolutionRevalidationEngine(options);
    this.assessmentEngine = new PolicyContainmentAssessmentEngine(options);
    this.clearanceBoundary = new PolicyContainmentClearanceBoundary(options);
    this.recoveryAuthEngine = new PolicyRecoveryAuthorizationEngine(options);
    this.handoffEngine = new PolicyIncidentRecoveryHandoffEngine(options);
    this.verificationEngine = new PolicyIncidentRecoveryVerificationEngine(options);
    this.resolutionEngine = new PolicyIncidentResolutionEngine(options);
    this.closureBoundary = new PolicyIncidentClosureBoundary(options);
    this.provenanceEngine = new PolicyActiveIncidentResolutionProvenanceEngine(options);
    this.auditEngine = new PolicyActiveIncidentResolutionAuditEngine(options);
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Resolution runtime suspended by USER_STOP supremacy');
    }
  }

  // ============================================================================
  // STAGE 1: INCIDENT ACKNOWLEDGEMENT
  // ============================================================================

  public acknowledgeIncident(params: {
    tenantPartition: string;
    incidentId: string;
    operatorId: string;
    operatorRole?: string;
    acknowledgementNote?: string;
  }): { acknowledged: boolean; incidentId: string } {
    this.assertUserStopInactive();

    const { tenantPartition, incidentId, operatorId, operatorRole, acknowledgementNote } = params;

    const opLower = operatorId.toLowerCase().trim();
    if (
      opLower.startsWith('auto_') ||
      opLower.startsWith('bot_') ||
      opLower.includes('ai_agent') ||
      opLower.includes('daemon') ||
      opLower === 'anonymous' ||
      opLower === 'guest'
    ) {
      throw new Error(`INCIDENT_ACKNOWLEDGEMENT_REJECTED: Autonomous persona '${operatorId}' cannot acknowledge incidents.`);
    }

    if (this.incidentStore) {
      const incident = this.incidentStore.getIncident(tenantPartition, incidentId);
      if (!incident) {
        throw new Error(`INCIDENT_NOT_FOUND: Incident '${incidentId}' not found for tenant '${tenantPartition}'`);
      }

      this.incidentStore.saveIncident({
        ...incident,
        state: 'AWAITING_HUMAN_REVIEW',
        updatedAt: new Date().toISOString(),
      });
    }

    this.auditEngine.recordEvent({
      eventType: 'INCIDENT_ACKNOWLEDGED',
      tenantPartition,
      actorUserId: operatorId,
      actorRole: operatorRole ?? 'OPERATOR',
      details: {
        incidentId,
        acknowledgementNote: acknowledgementNote ?? 'Acknowledged for investigation',
      },
    });

    this.provenanceEngine.appendRecord({
      tenantPartition,
      incidentId,
      eventType: 'INCIDENT_ACKNOWLEDGED',
      payload: {
        operatorId,
        operatorRole,
        acknowledgementNote,
      },
    });

    return { acknowledged: true, incidentId };
  }

  // ============================================================================
  // STAGE 2: INCIDENT REVALIDATION
  // ============================================================================

  public revalidateIncident(tenantPartition: string, incidentId: string) {
    this.assertUserStopInactive();

    if (!this.incidentStore) {
      throw new Error('INCIDENT_STORE_UNAVAILABLE: Revalidation requires active incident store');
    }

    const incident = this.incidentStore.getIncident(tenantPartition, incidentId);
    if (!incident) {
      throw new Error(`INCIDENT_NOT_FOUND: Incident '${incidentId}' not found for tenant '${tenantPartition}'`);
    }

    const currentActive = this.stateStore?.getActivePolicy(tenantPartition);
    const boundaryState = this.safetyBoundary?.getBoundaryState(tenantPartition);

    const reval = this.revalidationEngine.revalidate({
      tenantPartition,
      incident,
      currentActivePolicy: currentActive,
      currentSafetyBoundary: boundaryState,
    });

    this.auditEngine.recordEvent({
      eventType: reval.valid ? 'INCIDENT_REVALIDATED' : 'INCIDENT_REVALIDATION_BLOCKED',
      tenantPartition,
      details: {
        incidentId,
        valid: reval.valid,
        checksPassed: reval.checksPassed,
        blockingReasons: reval.blockingReasons,
      },
    });

    return reval;
  }

  // ============================================================================
  // STAGE 3: CONTAINMENT ASSESSMENT
  // ============================================================================

  public assessContainment(tenantPartition: string, incidentId: string): ContainmentAssessmentRecord {
    this.assertUserStopInactive();

    if (!this.incidentStore) {
      throw new Error('INCIDENT_STORE_UNAVAILABLE: Containment assessment requires active incident store');
    }

    const incident = this.incidentStore.getIncident(tenantPartition, incidentId);
    if (!incident) {
      throw new Error(`INCIDENT_NOT_FOUND: Incident '${incidentId}' not found for tenant '${tenantPartition}'`);
    }

    const boundaryState = this.safetyBoundary?.getBoundaryState(tenantPartition);

    const record = this.assessmentEngine.assessContainment({
      tenantPartition,
      incident,
      safetyBoundary: boundaryState,
    });

    this.resolutionStore.saveAssessment(record);

    this.auditEngine.recordEvent({
      eventType: 'CONTAINMENT_ASSESSED',
      tenantPartition,
      details: {
        assessmentId: record.assessmentId,
        incidentId,
        status: record.status,
        safetyBoundaryStatus: record.safetyBoundaryStatus,
      },
    });

    this.provenanceEngine.appendRecord({
      tenantPartition,
      incidentId,
      containmentAssessmentId: record.assessmentId,
      eventType: 'CONTAINMENT_ASSESSED',
      payload: {
        status: record.status,
        checksPassed: record.checksPassed,
      },
    });

    return record;
  }

  // ============================================================================
  // STAGE 4: HUMAN CONTAINMENT CLEARANCE
  // ============================================================================

  public clearContainment(params: {
    tenantPartition: string;
    assessmentId: string;
    operatorId: string;
    operatorRole: HumanAuthorizationRole;
    governanceRationale: string;
    originalReporterId?: string | null;
  }): ContainmentClearanceRecord {
    this.assertUserStopInactive();

    const { tenantPartition, assessmentId, operatorId, operatorRole, governanceRationale, originalReporterId } = params;

    const assessment = this.resolutionStore.getAssessment(tenantPartition, assessmentId);
    if (!assessment) {
      throw new Error(`ASSESSMENT_NOT_FOUND: Containment assessment '${assessmentId}' not found`);
    }

    const previousProvenanceHash = this.provenanceEngine.getHeadHash(tenantPartition);

    const clearance = this.clearanceBoundary.clearContainment({
      tenantPartition,
      assessment,
      operatorId,
      operatorRole,
      governanceRationale,
      originalReporterId,
      previousProvenanceHash,
    });

    this.resolutionStore.saveClearance(clearance);

    // Update incident state if store is available
    if (this.incidentStore) {
      const inc = this.incidentStore.getIncident(tenantPartition, assessment.incidentId);
      if (inc) {
        this.incidentStore.saveIncident({
          ...inc,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    this.auditEngine.recordEvent({
      eventType: 'CONTAINMENT_CLEARANCE_GRANTED',
      tenantPartition,
      actorUserId: operatorId,
      actorRole: operatorRole,
      details: {
        clearanceId: clearance.clearanceId,
        assessmentId,
        incidentId: assessment.incidentId,
        governanceRationale,
      },
    });

    this.provenanceEngine.appendRecord({
      tenantPartition,
      incidentId: assessment.incidentId,
      containmentClearanceId: clearance.clearanceId,
      eventType: 'CONTAINMENT_CLEARANCE_GRANTED',
      payload: {
        clearanceId: clearance.clearanceId,
        operatorId,
        operatorRole,
        governanceRationale,
      },
    });

    return clearance;
  }

  // ============================================================================
  // STAGE 5: HUMAN RECOVERY AUTHORIZATION
  // ============================================================================

  public authorizeRecovery(params: {
    tenantPartition: string;
    clearanceId: string;
    recoveryTargetVersion: string;
    operatorId: string;
    operatorRole: HumanAuthorizationRole;
    governanceRationale: string;
    originalRequesterId?: string | null;
  }): RecoveryAuthorizationRecord {
    this.assertUserStopInactive();

    const {
      tenantPartition,
      clearanceId,
      recoveryTargetVersion,
      operatorId,
      operatorRole,
      governanceRationale,
      originalRequesterId,
    } = params;

    const clearance = this.resolutionStore.getClearance(tenantPartition, clearanceId);
    if (!clearance) {
      throw new Error(`CLEARANCE_NOT_FOUND: Containment clearance '${clearanceId}' not found`);
    }

    if (!this.rollbackRuntime) {
      throw new Error('ROLLBACK_RUNTIME_UNAVAILABLE: Recovery authorization requires MS-1.3.72 rollback runtime');
    }

    const histTarget = this.rollbackRuntime.getStore().getHistoricalPolicyByVersion(tenantPartition, recoveryTargetVersion);
    if (!histTarget) {
      throw new Error(`RECOVERY_TARGET_NOT_FOUND: Historical policy version '${recoveryTargetVersion}' not found for tenant '${tenantPartition}'`);
    }

    let reconciliationResult = null;
    if (this.reconciliationRuntime) {
      try {
        reconciliationResult = this.reconciliationRuntime.reconcileLifecycle(tenantPartition);
      } catch {
        // Handled in auth evaluation
      }
    }


    const previousProvenanceHash = this.provenanceEngine.getHeadHash(tenantPartition);

    const authorization = this.recoveryAuthEngine.authorizeRecovery({
      tenantPartition,
      clearance,
      recoveryTarget: histTarget,
      operatorId,
      operatorRole,
      governanceRationale,
      reconciliationResult,
      previousProvenanceHash,
      originalRequesterId,
    });

    this.resolutionStore.saveRecoveryAuthorization(authorization);

    this.auditEngine.recordEvent({
      eventType: 'RECOVERY_AUTHORIZATION_GRANTED',
      tenantPartition,
      actorUserId: operatorId,
      actorRole: operatorRole,
      details: {
        authorizationId: authorization.authorizationId,
        clearanceId,
        recoveryTargetVersion,
        governanceRationale,
      },
    });

    this.provenanceEngine.appendRecord({
      tenantPartition,
      incidentId: clearance.incidentId,
      recoveryAuthorizationId: authorization.authorizationId,
      eventType: 'RECOVERY_AUTHORIZATION_GRANTED',
      payload: {
        authorizationId: authorization.authorizationId,
        recoveryTargetVersion,
        operatorId,
      },
    });

    return authorization;
  }

  // ============================================================================
  // STAGE 6: RECOVERY HANDOFF TO MS-1.3.72
  // ============================================================================

  public handoffRecovery(params: {
    tenantPartition: string;
    authorizationId: string;
  }): { handoffRecord: IncidentRecoveryHandoffRecord; commitResult: any } {
    this.assertUserStopInactive();

    const { tenantPartition, authorizationId } = params;

    const authorization = this.resolutionStore.getRecoveryAuthorization(tenantPartition, authorizationId);
    if (!authorization) {
      throw new Error(`RECOVERY_AUTHORIZATION_NOT_FOUND: Authorization '${authorizationId}' not found`);
    }

    if (!this.rollbackRuntime) {
      throw new Error('ROLLBACK_RUNTIME_UNAVAILABLE: Recovery handoff requires MS-1.3.72 rollback runtime');
    }

    this.auditEngine.recordEvent({
      eventType: 'RECOVERY_HANDOFF_REQUESTED',
      tenantPartition,
      details: {
        authorizationId,
        targetPolicyVersion: authorization.recoveryTargetVersion,
      },
    });

    const result = this.handoffEngine.executeHandoff({
      authorization,
      rollbackRuntime: this.rollbackRuntime,
    });

    this.resolutionStore.saveRecoveryHandoff(result.handoffRecord);

    this.auditEngine.recordEvent({
      eventType: 'RECOVERY_HANDOFF_COMPLETED',
      tenantPartition,
      details: {
        handoffId: result.handoffRecord.handoffId,
        commitId: result.commitResult.commitId,
      },
    });

    this.provenanceEngine.appendRecord({
      tenantPartition,
      incidentId: authorization.incidentId,
      recoveryHandoffId: result.handoffRecord.handoffId,
      eventType: 'RECOVERY_HANDOFF_COMPLETED',
      payload: {
        handoffId: result.handoffRecord.handoffId,
        commitId: result.commitResult.commitId,
      },
    });

    return result;
  }

  // ============================================================================
  // STAGE 7: RECOVERY VERIFICATION
  // ============================================================================

  public verifyRecovery(tenantPartition: string, handoffId: string): IncidentRecoveryVerificationRecord {
    this.assertUserStopInactive();

    const handoff = this.resolutionStore.getRecoveryHandoff(tenantPartition, handoffId);
    if (!handoff) {
      throw new Error(`RECOVERY_HANDOFF_NOT_FOUND: Handoff record '${handoffId}' not found`);
    }

    const currentActive = this.stateStore?.getActivePolicy(tenantPartition);
    let runtimeSnapshot = null;
    if (this.runtimeCoordinator) {
      try {
        runtimeSnapshot = this.runtimeCoordinator.resolveActiveSnapshot(tenantPartition);
      } catch {
        // Handled in verification engine
      }
    }

    let reconciliationResult = null;
    if (this.reconciliationRuntime) {
      try {
        reconciliationResult = this.reconciliationRuntime.reconcileLifecycle(tenantPartition);
      } catch {
        // Verification engine inspects discrepancy
      }
    }


    const boundaryState = this.safetyBoundary?.getBoundaryState(tenantPartition);

    const record = this.verificationEngine.verifyRecovery({
      tenantPartition,
      handoffRecord: handoff,
      activePolicyState: currentActive,
      runtimeSnapshot: runtimeSnapshot ?? null,
      reconciliationResult,
      safetyBoundary: boundaryState,
    });

    this.resolutionStore.saveRecoveryVerification(record);

    this.auditEngine.recordEvent({
      eventType: record.status === 'VERIFIED' ? 'RECOVERY_VERIFICATION_PASSED' : 'RECOVERY_VERIFICATION_FAILED',
      tenantPartition,
      details: {
        verificationId: record.verificationId,
        handoffId,
        status: record.status,
        checksPassed: record.checksPassed,
        discrepancyDetails: record.discrepancyDetails,
      },
    });

    this.provenanceEngine.appendRecord({
      tenantPartition,
      incidentId: handoff.incidentId,
      recoveryVerificationId: record.verificationId,
      eventType: record.status === 'VERIFIED' ? 'RECOVERY_VERIFICATION_PASSED' : 'RECOVERY_VERIFICATION_FAILED',
      payload: {
        verificationId: record.verificationId,
        status: record.status,
      },
    });

    return record;
  }

  // ============================================================================
  // STAGE 8: INCIDENT RESOLUTION CONFIRMATION
  // ============================================================================

  public confirmResolution(params: {
    tenantPartition: string;
    incidentId: string;
    clearanceId: string;
    verificationId?: string;
    nonRecoveryResolutionRationale?: string;
  }): IncidentResolutionRecord {
    this.assertUserStopInactive();

    const { tenantPartition, incidentId, clearanceId, verificationId, nonRecoveryResolutionRationale } = params;

    if (!this.incidentStore) {
      throw new Error('INCIDENT_STORE_UNAVAILABLE: Incident store required for resolution');
    }

    const incident = this.incidentStore.getIncident(tenantPartition, incidentId);
    if (!incident) {
      throw new Error(`INCIDENT_NOT_FOUND: Incident '${incidentId}' not found`);
    }

    const clearance = this.resolutionStore.getClearance(tenantPartition, clearanceId);
    if (!clearance) {
      throw new Error(`CLEARANCE_NOT_FOUND: Containment clearance '${clearanceId}' not found`);
    }

    let verification: IncidentRecoveryVerificationRecord | null = null;
    if (verificationId) {
      verification = this.resolutionStore.getRecoveryVerification(tenantPartition, verificationId);
      if (!verification) {
        throw new Error(`VERIFICATION_NOT_FOUND: Recovery verification '${verificationId}' not found`);
      }
    }

    const record = this.resolutionEngine.evaluateResolution({
      tenantPartition,
      incident,
      containmentClearance: clearance,
      recoveryVerification: verification,
      nonRecoveryResolutionRationale,
    });

    if (record.status !== 'CONFIRMED') {
      throw new Error(`RESOLUTION_CONFIRMATION_BLOCKED: ${record.summary}`);
    }

    this.resolutionStore.saveResolution(record);

    // Update incident state in store
    this.incidentStore.saveIncident({
      ...incident,
      state: 'RESOLVED',
      resolvedAt: record.confirmedAt,
      resolvedBy: clearance.operatorId,
      resolutionRationale: record.summary,
      updatedAt: new Date().toISOString(),
    });

    this.auditEngine.recordEvent({
      eventType: 'INCIDENT_RESOLUTION_CONFIRMED',
      tenantPartition,
      details: {
        resolutionId: record.resolutionId,
        incidentId,
        resolutionMode: record.resolutionMode,
      },
    });

    this.provenanceEngine.appendRecord({
      tenantPartition,
      incidentId,
      resolutionId: record.resolutionId,
      eventType: 'INCIDENT_RESOLUTION_CONFIRMED',
      payload: {
        resolutionId: record.resolutionId,
        summary: record.summary,
      },
    });

    return record;
  }

  // ============================================================================
  // STAGE 9: GOVERNED INCIDENT CLOSURE
  // ============================================================================

  public closeIncident(params: {
    tenantPartition: string;
    resolutionId: string;
    operatorId: string;
    operatorRole: HumanAuthorizationRole;
    closureRationale: string;
    originalReporterId?: string | null;
  }): IncidentClosureRecord {
    this.assertUserStopInactive();

    const {
      tenantPartition,
      resolutionId,
      operatorId,
      operatorRole,
      closureRationale,
      originalReporterId,
    } = params;

    const resolution = this.resolutionStore.getResolution(tenantPartition, resolutionId);
    if (!resolution) {
      throw new Error(`RESOLUTION_NOT_FOUND: Incident resolution '${resolutionId}' not found`);
    }

    const previousProvenanceHash = this.provenanceEngine.getHeadHash(tenantPartition);

    const closure = this.closureBoundary.closeIncident({
      tenantPartition,
      resolution,
      operatorId,
      operatorRole,
      closureRationale,
      previousProvenanceHash,
      originalReporterId,
    });

    this.resolutionStore.saveClosure(closure);

    // Update incident in store to terminal CLOSED state
    if (this.incidentStore) {
      const inc = this.incidentStore.getIncident(tenantPartition, resolution.incidentId);
      if (inc) {
        this.incidentStore.saveIncident({
          ...inc,
          state: 'CLOSED',
          updatedAt: new Date().toISOString(),
        });
      }
    }

    this.auditEngine.recordEvent({
      eventType: 'INCIDENT_CLOSED',
      tenantPartition,
      actorUserId: operatorId,
      actorRole: operatorRole,
      details: {
        closureId: closure.closureId,
        incidentId: resolution.incidentId,
        closureRationale,
      },
    });

    this.provenanceEngine.appendRecord({
      tenantPartition,
      incidentId: resolution.incidentId,
      closureId: closure.closureId,
      eventType: 'INCIDENT_CLOSED',
      payload: {
        closureId: closure.closureId,
        operatorId,
        operatorRole,
        closureRationale,
      },
    });

    return closure;
  }

  // ============================================================================
  // ACCESSORS
  // ============================================================================

  public getStore(): PolicyActiveIncidentResolutionStore {
    return this.resolutionStore;
  }

  public getProvenanceEngine(): PolicyActiveIncidentResolutionProvenanceEngine {
    return this.provenanceEngine;
  }

  public getAuditEngine(): PolicyActiveIncidentResolutionAuditEngine {
    return this.auditEngine;
  }
}
