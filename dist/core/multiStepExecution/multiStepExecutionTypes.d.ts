import type { GroundedPlanTaskBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import type { ExecutionOperationKind, GovernedExecutionResultEnvelope } from '../governedExecution/executionTypes.js';
export declare const MAX_EXECUTION_STEPS = 10;
export declare const MAX_REPLANNING_GENERATIONS = 10;
export declare const MAX_REPLANS_PER_SESSION = 10;
export declare const MULTI_STEP_EXECUTION_SCHEMA_VERSION = "4.0.0";
export type MultiStepExecutionStatus = 'DRAFT' | 'VALIDATED' | 'READY' | 'AUTHORIZATION_PENDING' | 'AUTHORIZED' | 'EXECUTING' | 'STEP_COMPLETED' | 'ENVIRONMENT_VERIFICATION' | 'PAUSED' | 'REPLANNING_REQUIRED' | 'REPLAN_PENDING' | 'NEW_GENERATION' | 'COMPLETED' | 'FAILED' | 'DENIED' | 'CANCELLED' | 'PREEMPTED' | 'INVALIDATED';
export type GenerationStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'SUPERSEDED' | 'COMPLETED' | 'FAILED' | 'INVALIDATED';
export type StepExecutionStatus = 'PENDING' | 'READY' | 'AUTHORIZATION_PENDING' | 'AUTHORIZED' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'INVALIDATED' | 'PREEMPTED';
export type ExecutionEnvironmentValidity = 'UNCHANGED' | 'CHANGED' | 'INVALID' | 'UNKNOWN';
export type MultiStepExecutionEvent = 'MULTI_STEP_STARTED' | 'STEP_READY' | 'STEP_AUTHORIZATION_REQUIRED' | 'STEP_AUTHORIZED' | 'STEP_EXECUTION_STARTED' | 'STEP_EXECUTION_SUCCEEDED' | 'STEP_EXECUTION_FAILED' | 'ENVIRONMENT_CHECKED' | 'ENVIRONMENT_CHANGED' | 'EXECUTION_PAUSED' | 'REPLANNING_REQUIRED' | 'REPLANNING_STARTED' | 'GENERATION_CREATED' | 'GENERATION_AUTHORIZATION_REQUIRED' | 'GENERATION_AUTHORIZED' | 'MULTI_STEP_COMPLETED' | 'MULTI_STEP_FAILED' | 'MULTI_STEP_DENIED' | 'MULTI_STEP_CANCELLED' | 'MULTI_STEP_PREEMPTED' | 'MULTI_STEP_INVALIDATED';
export interface MultiStepExecutionStepState {
    readonly stepId: string;
    readonly stepIndex: number;
    readonly title: string;
    readonly operationKind: ExecutionOperationKind;
    readonly dependencies: readonly string[];
    readonly status: StepExecutionStatus;
    readonly leaseId?: string;
    readonly executionId?: string;
    readonly resultEnvelope?: GovernedExecutionResultEnvelope;
    readonly failureReason?: string;
    readonly updatedAt: string;
}
export interface ExecutionEnvironmentSnapshot {
    readonly snapshotId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly generationId: string;
    readonly stepId?: string;
    readonly screenStateHash?: string;
    readonly observedElements?: readonly {
        readonly id: string;
        readonly label?: string;
        readonly bounds?: unknown;
    }[];
    readonly systemPreconditions: Readonly<Record<string, boolean | string | number>>;
    readonly observedPreconditions: Readonly<Record<string, boolean | string | number>>;
    readonly timestamp: string;
    readonly provenanceHash: string;
}
export interface ExecutionStepCheckpoint {
    readonly checkpointId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly generationId: string;
    readonly stepId: string;
    readonly stepIndex: number;
    readonly status: StepExecutionStatus;
    readonly resultSummary?: Readonly<Record<string, unknown>>;
    readonly environmentSnapshotHash: string;
    readonly timestamp: string;
    readonly provenanceHash: string;
}
export interface ReplanningRequest {
    readonly requestId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly sourceGenerationId: string;
    readonly sourceGenerationIndex: number;
    readonly taskId: string;
    readonly planId: string;
    readonly completedStepIds: readonly string[];
    readonly failedStepId?: string;
    readonly invalidatedStepIds: readonly string[];
    readonly environmentSnapshot: ExecutionEnvironmentSnapshot;
    readonly reason: string;
    readonly affectedDependencies: readonly string[];
    readonly remainingObjective: string;
    readonly provenanceHash: string;
    readonly timestamp: string;
}
export interface MultiStepExecutionGeneration {
    readonly generationId: string;
    readonly generationIndex: number;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly taskId: string;
    readonly planId: string;
    readonly planVersion: number;
    readonly bindingSnapshot: GroundedPlanTaskBinding;
    readonly taskSnapshot: AgentTask;
    readonly stepStates: Readonly<Record<string, MultiStepExecutionStepState>>;
    readonly status: GenerationStatus;
    readonly provenanceHash: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}
export interface MultiStepExecutionSession {
    readonly sessionId: string;
    readonly tenantId: string;
    readonly taskId: string;
    readonly planId: string;
    readonly activeGenerationId: string;
    readonly status: MultiStepExecutionStatus;
    readonly sessionVersion: number;
    readonly generations: readonly MultiStepExecutionGeneration[];
    readonly checkpoints: readonly ExecutionStepCheckpoint[];
    readonly provenanceRoot: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}
export interface MultiStepExecutionResult {
    readonly sessionId: string;
    readonly tenantId: string;
    readonly taskId: string;
    readonly status: MultiStepExecutionStatus;
    readonly totalSteps: number;
    readonly completedSteps: number;
    readonly failedSteps: number;
    readonly replanningGenerations: number;
    readonly stepResults: readonly GovernedExecutionResultEnvelope[];
    readonly finalOutcome: string;
    readonly provenanceHash: string;
    readonly sessionVersion: number;
    readonly timestamp: string;
}
export interface MultiStepExecutionSessionDocument {
    readonly schemaVersion: string;
    readonly session: MultiStepExecutionSession;
    readonly activeGeneration?: MultiStepExecutionGeneration;
    readonly replanningRequests: readonly ReplanningRequest[];
    readonly environmentSnapshots: readonly ExecutionEnvironmentSnapshot[];
    readonly executionResults: readonly GovernedExecutionResultEnvelope[];
    readonly provenanceHash: string;
    readonly sessionVersion: number;
    readonly updatedAt: string;
}
export declare class MultiStepExecutionError extends Error {
    constructor(message: string);
}
export declare class MultiStepExecutionValidationError extends MultiStepExecutionError {
    constructor(message: string);
}
export declare class MultiStepExecutionAuthorizationError extends MultiStepExecutionError {
    constructor(message: string);
}
export declare class MultiStepExecutionLeaseError extends MultiStepExecutionError {
    constructor(message: string);
}
export declare class MultiStepExecutionDependencyError extends MultiStepExecutionError {
    constructor(message: string);
}
export declare class MultiStepExecutionEnvironmentError extends MultiStepExecutionError {
    constructor(message: string);
}
export declare class MultiStepExecutionReplanningError extends MultiStepExecutionError {
    constructor(message: string);
}
export declare class MultiStepExecutionGenerationError extends MultiStepExecutionError {
    constructor(message: string);
}
export declare class MultiStepExecutionTenantIsolationError extends MultiStepExecutionError {
    constructor(message: string);
}
export declare class MultiStepExecutionSessionIsolationError extends MultiStepExecutionError {
    constructor(message: string);
}
export declare class MultiStepExecutionConcurrencyError extends MultiStepExecutionError {
    constructor(message: string);
}
export declare class MultiStepExecutionUserStopError extends MultiStepExecutionError {
    readonly checkpoint: string;
    constructor(checkpoint: string);
}
export declare class MultiStepExecutionPersistenceError extends MultiStepExecutionError {
    constructor(message: string);
}
export declare function deterministicJsonStringify(obj: unknown): string;
export declare function computeSha256(data: string): string;
export declare function computeGenerationProvenanceHash(generation: Omit<MultiStepExecutionGeneration, 'provenanceHash'>): string;
export declare function computeEnvironmentSnapshotProvenanceHash(snapshot: Omit<ExecutionEnvironmentSnapshot, 'provenanceHash'>): string;
export declare function computeStepCheckpointProvenanceHash(checkpoint: Omit<ExecutionStepCheckpoint, 'provenanceHash'>): string;
export declare function computeReplanningRequestProvenanceHash(request: Omit<ReplanningRequest, 'provenanceHash'>): string;
export declare function computeMultiStepSessionProvenanceHash(session: Omit<MultiStepExecutionSession, 'provenanceRoot'>): string;
export declare function computeMultiStepResultProvenanceHash(result: Omit<MultiStepExecutionResult, 'provenanceHash'>): string;
export declare function computeSessionDocumentProvenanceHash(doc: Omit<MultiStepExecutionSessionDocument, 'provenanceHash'>): string;
