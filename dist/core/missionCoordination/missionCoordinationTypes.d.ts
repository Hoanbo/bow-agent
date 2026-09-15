export declare const MISSION_COORDINATION_SCHEMA_VERSION = "1.5.13";
/** Hard structural mission boundaries / Các giới hạn trần sứ mệnh cấu trúc cứng */
export declare const MAX_OBJECTIVES_PER_MISSION = 20;
export declare const MAX_ACTIVE_OBJECTIVE_SESSIONS = 3;
export declare const MAX_COORDINATION_CYCLES = 100;
export declare const MAX_REASSESSMENTS = 10;
export declare const MAX_MISSION_DURATION_MS = 86400000;
export declare const MAX_OBJECTIVE_RETRIES = 3;
export declare const MAX_CONSECUTIVE_MISSION_FAILURES = 3;
export declare const MAX_OBJECTIVE_DEPENDENCY_DEPTH = 10;
export declare const MAX_STARVATION_CYCLES = 5;
export type MissionState = 'INITIALIZING' | 'AUTHORIZED' | 'READY' | 'COORDINATING' | 'OBJECTIVE_ACTIVE' | 'OBJECTIVE_BLOCKED' | 'REVIEW_REQUIRED' | 'SUSPENDED' | 'RESUMABLE' | 'COMPLETED' | 'FAILED' | 'HALTED_BY_USER_STOP' | 'HALTED_BY_EMERGENCY_STOP' | 'INVALIDATED';
export type MissionObjectiveState = 'REGISTERED' | 'BLOCKED' | 'READY' | 'DELEGATED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type MissionConflictCategory = 'NONE' | 'RESOURCE_CONFLICT' | 'SCOPE_CONFLICT' | 'DEPENDENCY_CONFLICT' | 'ENVIRONMENT_CONFLICT' | 'AUTHORIZATION_CONFLICT' | 'LEASE_CONFLICT' | 'POLICY_CONFLICT' | 'OBJECTIVE_CONFLICT';
export type MissionRiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface MissionBudgetSnapshot {
    readonly maxObjectives: number;
    readonly objectivesRegistered: number;
    readonly maxActiveObjectiveSessions: number;
    readonly activeObjectiveSessions: number;
    readonly maxCoordinationCycles: number;
    readonly coordinationCyclesConsumed: number;
    readonly maxReassessments: number;
    readonly reassessmentsConsumed: number;
    readonly missionDurationLimitMs: number;
    readonly missionStartedAt: number;
    readonly consecutiveFailures: number;
}
export interface MissionAuthorizationEnvelope {
    readonly envelopeId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly humanOperatorId: string;
    readonly authorizationScope: readonly string[];
    readonly riskTier: MissionRiskTier;
    readonly humanConfirmationToken?: string;
    readonly humanConfirmationExpiresAt?: number;
    readonly leaseId: string;
    readonly issuedAt: number;
    readonly expiresAt: number;
    readonly provenanceHash: string;
}
export interface MissionObjectiveBinding {
    readonly objectiveId: string;
    readonly title: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly authorizationScope: readonly string[];
    readonly riskTier: MissionRiskTier;
    readonly leaseId: string;
    readonly dependencies: readonly string[];
    readonly priorityScore: number;
    readonly humanExplicitPriority?: number;
    readonly state: MissionObjectiveState;
    readonly failureAttempts: number;
    readonly starvationAge: number;
    readonly boundAt: number;
    readonly completedAt?: number;
    readonly resultSummary?: string;
    readonly bindingHash: string;
}
export interface MissionDependencyGraph {
    readonly nodes: readonly string[];
    readonly edges: readonly {
        readonly from: string;
        readonly to: string;
    }[];
    readonly depthMap: Record<string, number>;
}
export interface MissionPriorityPolicy {
    readonly basePriorityWeight: number;
    readonly dependencyReadinessWeight: number;
    readonly urgencyWeight: number;
    readonly starvationWeight: number;
    readonly riskTierPenaltyWeight: number;
    readonly immutableHumanPriorityOverride: boolean;
}
export interface MissionConflict {
    readonly conflictId: string;
    readonly category: MissionConflictCategory;
    readonly affectedObjectiveIds: readonly string[];
    readonly description: string;
    readonly isResolvable: boolean;
    readonly resolutionStrategy?: string;
    readonly detectedAt: number;
    readonly resolvedAt?: number;
}
export interface MissionReassessmentRecord {
    readonly reassessmentId: string;
    readonly cycleNumber: number;
    readonly triggerReason: string;
    readonly eligibleObjectiveIds: readonly string[];
    readonly selectedObjectiveId?: string;
    readonly timestamp: number;
    readonly recordHash: string;
}
export interface MissionContinuitySnapshot {
    readonly snapshotId: string;
    readonly missionId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly coordinationCycle: number;
    readonly missionState: MissionState;
    readonly completedObjectiveIds: readonly string[];
    readonly activeObjectiveIds: readonly string[];
    readonly pendingObjectiveIds: readonly string[];
    readonly blockedObjectiveIds: readonly string[];
    readonly priorityOrder: readonly string[];
    readonly activeConflicts: readonly MissionConflict[];
    readonly budgetState: MissionBudgetSnapshot;
    readonly environmentFingerprint: string;
    readonly previousSnapshotHash: string;
    readonly currentSnapshotHash: string;
    readonly timestamp: number;
}
export interface GovernedMission {
    readonly missionId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly humanOperatorId: string;
    readonly title: string;
    readonly description: string;
    readonly objectiveIds: readonly string[];
    readonly authorizationScope: readonly string[];
    readonly riskTier: MissionRiskTier;
    readonly status: MissionState;
    readonly priorityPolicy: MissionPriorityPolicy;
    readonly dependencyGraph: MissionDependencyGraph;
    readonly objectives: Record<string, MissionObjectiveBinding>;
    readonly conflicts: readonly MissionConflict[];
    readonly budget: MissionBudgetSnapshot;
    readonly authorizationEnvelope: MissionAuthorizationEnvelope;
    readonly continuitySnapshots: readonly MissionContinuitySnapshot[];
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly generation: number;
    readonly missionVersion: number;
    readonly provenanceHash: string;
}
export interface MissionCoordinationResult {
    readonly missionId: string;
    readonly tenantId: string;
    readonly finalState: MissionState;
    readonly completedSuccessfully: boolean;
    readonly completedObjectiveCount: number;
    readonly failedObjectiveCount: number;
    readonly totalCyclesExecuted: number;
    readonly totalReassessments: number;
    readonly wallClockDurationMs: number;
    readonly finalSnapshotHash: string;
    readonly auditChainHeadHash: string;
    readonly summaryDetails: string;
}
export declare class MissionCoordinationError extends Error {
    readonly code: string;
    readonly tenantId?: string;
    readonly missionId?: string;
    readonly timestamp: number;
    constructor(message: string, code?: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationValidationError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationAuthorizationError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationTenantIsolationError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationSessionIsolationError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationScopeViolationError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationLeaseError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationBudgetError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationDependencyError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationConflictError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationPriorityError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationConcurrencyError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationUserStopError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationEmergencyStopError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationPersistenceError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationProvenanceError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare class MissionCoordinationGovernanceError extends MissionCoordinationError {
    constructor(message: string, tenantId?: string, missionId?: string);
}
export declare function deterministicJsonStringify(obj: unknown): string;
export declare function computeSha256(data: string): string;
export declare function computeMissionAuthorizationHash(envelope: Omit<MissionAuthorizationEnvelope, 'provenanceHash'>): string;
export declare function computeObjectiveBindingHash(binding: Omit<MissionObjectiveBinding, 'bindingHash'>): string;
export declare function computeObjectiveSelectionHash(selection: {
    missionId: string;
    objectiveId: string;
    cycleNumber: number;
    priorityScore: number;
    timestamp: number;
}): string;
export declare function computeCoordinationCycleHash(cycleData: {
    missionId: string;
    cycleNumber: number;
    activeObjectiveId?: string;
    state: MissionState;
    timestamp: number;
}): string;
export declare function computeMissionSnapshotHash(snapshot: Omit<MissionContinuitySnapshot, 'currentSnapshotHash'>): string;
export declare function computeMissionProvenanceHash(mission: Omit<GovernedMission, 'provenanceHash'>): string;
export declare function computeMissionResultHash(result: Omit<MissionCoordinationResult, 'auditChainHeadHash'>): string;
export declare function computeMissionAuditHash(auditData: Record<string, unknown>): string;
