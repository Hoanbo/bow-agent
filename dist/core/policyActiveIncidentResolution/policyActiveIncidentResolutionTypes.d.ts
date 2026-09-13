import type { ActiveIncidentId, SafetyBoundaryStatus } from '../policyActiveIncidentResponse/policyActiveIncidentResponseTypes.js';
import type { ActivePolicyStateId } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { RollbackTargetId, RecoveryRequestId, RecoveryCommitId } from '../policyActiveRollback/policyActiveRollbackTypes.js';
import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
export type IncidentResolutionRequestId = string & {
    readonly __brand: unique symbol;
};
export type ContainmentAssessmentId = string & {
    readonly __brand: unique symbol;
};
export type ContainmentClearanceId = string & {
    readonly __brand: unique symbol;
};
export type RecoveryAuthorizationId = string & {
    readonly __brand: unique symbol;
};
export type RecoveryHandoffId = string & {
    readonly __brand: unique symbol;
};
export type RecoveryVerificationId = string & {
    readonly __brand: unique symbol;
};
export type ResolutionConfirmationId = string & {
    readonly __brand: unique symbol;
};
export type IncidentClosureId = string & {
    readonly __brand: unique symbol;
};
export type ResolutionProvenanceId = string & {
    readonly __brand: unique symbol;
};
export declare function createIncidentResolutionRequestId(raw: string): IncidentResolutionRequestId;
export declare function createContainmentAssessmentId(raw: string): ContainmentAssessmentId;
export declare function createContainmentClearanceId(raw: string): ContainmentClearanceId;
export declare function createRecoveryAuthorizationId(raw: string): RecoveryAuthorizationId;
export declare function createRecoveryHandoffId(raw: string): RecoveryHandoffId;
export declare function createRecoveryVerificationId(raw: string): RecoveryVerificationId;
export declare function createResolutionConfirmationId(raw: string): ResolutionConfirmationId;
export declare function createIncidentClosureId(raw: string): IncidentClosureId;
export declare function createResolutionProvenanceId(raw: string): ResolutionProvenanceId;
export type IncidentResolutionLifecycleState = 'INCIDENT_DETECTED' | 'INCIDENT_ACKNOWLEDGED' | 'INVESTIGATION_REQUIRED' | 'CONTAINMENT_ASSESSED' | 'CONTAINMENT_CLEARANCE_REQUIRED' | 'CONTAINMENT_CLEARED' | 'RECOVERY_AUTHORIZATION_REQUIRED' | 'RECOVERY_AUTHORIZED' | 'RECOVERY_HANDOFF' | 'RECOVERY_VERIFICATION_REQUIRED' | 'RECOVERY_VERIFIED' | 'RESOLUTION_CONFIRMED' | 'INCIDENT_CLOSED' | 'FAIL_CLOSED' | 'REQUIRES_HUMAN_INTERVENTION' | 'RECOVERY_BLOCKED' | 'CONTAINMENT_CLEARANCE_BLOCKED' | 'RESOLUTION_BLOCKED';
export type ContainmentAssessmentStatus = 'CONTAINED' | 'UNCONTAINED' | 'EVALUATION_FAILED';
export type RecoveryVerificationStatus = 'VERIFIED' | 'FAILED' | 'BLOCKED' | 'INCONSISTENT';
export type ResolutionConfirmationStatus = 'CONFIRMED' | 'REJECTED' | 'BLOCKED';
/**
 * Read-only evaluation of whether containment conditions are met.
 */
export interface ContainmentAssessmentRecord {
    readonly assessmentId: ContainmentAssessmentId;
    readonly tenantPartition: string;
    readonly incidentId: ActiveIncidentId;
    readonly status: ContainmentAssessmentStatus;
    readonly safetyBoundaryStatus: SafetyBoundaryStatus;
    readonly hardForbiddenFloorPreserved: boolean;
    readonly activePolicyDriftBlocked: boolean;
    readonly evaluatedAt: string;
    readonly checksPassed: readonly string[];
    readonly blockingReasons: readonly string[];
    readonly isPolicyMutation: false;
    readonly isAutonomousClearance: false;
    readonly isDirectToolExecution: false;
}
/**
 * Governed Human Containment Clearance Record.
 */
export interface ContainmentClearanceRecord {
    readonly clearanceId: ContainmentClearanceId;
    readonly tenantPartition: string;
    readonly incidentId: ActiveIncidentId;
    readonly assessmentId: ContainmentAssessmentId;
    readonly operatorId: string;
    readonly operatorRole: HumanAuthorizationRole;
    readonly governanceRationale: string;
    readonly clearedAt: string;
    readonly isAutonomous: false;
    readonly provenanceHash: string;
}
/**
 * Governed Human Recovery Authorization Record.
 */
export interface RecoveryAuthorizationRecord {
    readonly authorizationId: RecoveryAuthorizationId;
    readonly tenantPartition: string;
    readonly incidentId: ActiveIncidentId;
    readonly clearanceId: ContainmentClearanceId;
    readonly recoveryTargetVersion: string;
    readonly targetId: RollbackTargetId;
    readonly operatorId: string;
    readonly operatorRole: HumanAuthorizationRole;
    readonly governanceRationale: string;
    readonly authorizedAt: string;
    readonly isAutonomous: false;
    readonly provenanceHash: string;
    readonly isRecoveryExecution: false;
    readonly isPolicyMutation: false;
}
/**
 * Record of handoff to MS-1.3.72 Rollback/Recovery subsystem.
 */
export interface IncidentRecoveryHandoffRecord {
    readonly handoffId: RecoveryHandoffId;
    readonly tenantPartition: string;
    readonly incidentId: ActiveIncidentId;
    readonly authorizationId: RecoveryAuthorizationId;
    readonly rollbackRecoveryRequestId: RecoveryRequestId;
    readonly targetPolicyVersion: string;
    readonly targetId: RollbackTargetId;
    readonly handoffStatus: 'HANDED_OFF' | 'HANDOFF_FAILED';
    readonly handedOffAt: string;
    readonly commitId?: RecoveryCommitId;
}
/**
 * Multi-layer recovery verification record across MS-1.3.70 - 74.
 */
export interface IncidentRecoveryVerificationRecord {
    readonly verificationId: RecoveryVerificationId;
    readonly tenantPartition: string;
    readonly incidentId: ActiveIncidentId;
    readonly handoffId: RecoveryHandoffId;
    readonly status: RecoveryVerificationStatus;
    readonly recoveredPolicyVersion: string;
    readonly activePolicyVerified: boolean;
    readonly runtimeSnapshotSynchronized: boolean;
    readonly pdpSafetyFloorVerified: boolean;
    readonly pepEnforcementConsistent: boolean;
    readonly lifecycleReconciliationClean: boolean;
    readonly safetyBoundaryNormalized: boolean;
    readonly verifiedAt: string;
    readonly checksPassed: readonly string[];
    readonly discrepancyDetails: readonly string[];
    readonly isAutoRepairAttempted: false;
    readonly isAutoResyncAttempted: false;
}
/**
 * Deterministic Incident Resolution Confirmation Record.
 */
export interface IncidentResolutionRecord {
    readonly resolutionId: ResolutionConfirmationId;
    readonly tenantPartition: string;
    readonly incidentId: ActiveIncidentId;
    readonly status: ResolutionConfirmationStatus;
    readonly resolutionMode: 'RECOVERY_VERIFIED' | 'RESOLVED_WITHOUT_RECOVERY';
    readonly containmentClearanceId: ContainmentClearanceId;
    readonly recoveryVerificationId?: RecoveryVerificationId;
    readonly confirmedAt: string;
    readonly summary: string;
    readonly evidenceChain: readonly string[];
    readonly isAutonomousClosure: false;
    readonly isPolicyMutation: false;
}
/**
 * Immutable Human Incident Closure Record.
 */
export interface IncidentClosureRecord {
    readonly closureId: IncidentClosureId;
    readonly tenantPartition: string;
    readonly incidentId: ActiveIncidentId;
    readonly resolutionId: ResolutionConfirmationId;
    readonly operatorId: string;
    readonly operatorRole: HumanAuthorizationRole;
    readonly closureRationale: string;
    readonly closedAt: string;
    readonly isAutonomous: false;
    readonly provenanceHash: string;
    readonly isIncidentDeleted: false;
    readonly isHistoryRewritten: false;
}
/**
 * Cryptographic Provenance Record for Incident Resolution Lifecycle.
 */
export interface ResolutionProvenanceRecord {
    readonly provenanceId: ResolutionProvenanceId;
    readonly tenantPartition: string;
    readonly incidentId: ActiveIncidentId;
    readonly activePolicyStateId?: ActivePolicyStateId | null;
    readonly containmentAssessmentId?: ContainmentAssessmentId | null;
    readonly containmentClearanceId?: ContainmentClearanceId | null;
    readonly recoveryAuthorizationId?: RecoveryAuthorizationId | null;
    readonly recoveryHandoffId?: RecoveryHandoffId | null;
    readonly recoveryVerificationId?: RecoveryVerificationId | null;
    readonly resolutionId?: ResolutionConfirmationId | null;
    readonly closureId?: IncidentClosureId | null;
    readonly eventType: string;
    readonly timestamp: string;
    readonly previousHash: string;
    readonly recordHash: string;
    readonly payloadHash: string;
}
/**
 * Configuration options for policyActiveIncidentResolution domain.
 */
export interface PolicyActiveIncidentResolutionOptions {
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
}
