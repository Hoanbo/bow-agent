import type { PlanActionType, PlanRiskLevel } from './planningTypes.js';
import type { CognitiveResult } from '../cognitive/cognitiveTypes.js';
import type { AssembledContext } from '../contextAssembly/contextTypes.js';
export declare const GOVERNED_PLANNER_VERSION = "4.0.0";
/**
 * Hard bounded limits for the governed planner.
 */
export declare const PLANNER_LIMITS: {
    readonly MAX_STEPS: 20;
    readonly MAX_DEPENDENCIES: 50;
    readonly MAX_PARAMETER_BYTES: 8192;
    readonly MAX_PLAN_SIZE_BYTES: 65536;
    readonly MAX_INTENT_LENGTH: 512;
    readonly MAX_TARGET_LENGTH: 256;
    readonly MAX_ASSUMPTIONS: 10;
    readonly MAX_CONSTRAINTS: 20;
};
/**
 * Governed planner configuration options.
 */
export interface GovernedPlannerConfig {
    readonly maxSteps?: number;
    readonly maxDependencies?: number;
    readonly maxParameterBytes?: number;
    readonly maxPlanSizeBytes?: number;
    readonly enforceStrictApprovalOnHighRisk?: boolean;
    readonly deterministicTimestamp?: string;
    /**
     * Hard invariant: Autonomous actions are never allowed.
     */
    readonly allowAutonomousActions?: false;
}
/**
 * Canonical request contract for governed multi-step action planning.
 */
export interface GovernedPlanningRequest {
    readonly requestId: string;
    readonly taskId: string;
    readonly tenantId: string;
    readonly expectedTaskVersion: number;
    readonly cognitiveResult: CognitiveResult;
    readonly assembledContext?: AssembledContext;
    readonly constraints?: readonly string[];
    readonly plannerConfig?: GovernedPlannerConfig;
    readonly correlationId?: string;
    readonly signal?: AbortSignal;
}
/**
 * Individual inert candidate step within a governed plan.
 * Contains NO executable callbacks, NO tool invocations, NO execution authority.
 */
export interface GovernedCandidateStep {
    readonly stepId: string;
    readonly sequence: number;
    readonly actionType: PlanActionType;
    readonly intent: string;
    readonly target?: string;
    readonly parameters: Readonly<Record<string, unknown>>;
    readonly dependencies: readonly string[];
    readonly expectedOutcome: string;
    readonly riskLevel: PlanRiskLevel;
    readonly requiresApproval: boolean;
    readonly capabilityId?: string;
    readonly status: 'CANDIDATE';
}
/**
 * Directed dependency edge between two candidate steps.
 */
export interface PlanDependencyEdge {
    readonly fromStepId: string;
    readonly toStepId: string;
}
/**
 * Directed Acyclic Graph (DAG) representation of candidate step dependencies.
 */
export interface PlanDag {
    readonly nodes: readonly string[];
    readonly edges: readonly PlanDependencyEdge[];
    readonly topologicalOrder: readonly string[];
    readonly levels: readonly (readonly string[])[];
}
/**
 * Summary of risk and approval requirements across all candidate steps.
 */
export interface PlanRiskSummary {
    readonly overallRisk: PlanRiskLevel;
    readonly highestStepRisk: PlanRiskLevel;
    readonly riskCounts: Readonly<Record<PlanRiskLevel, number>>;
    readonly approvalRequiredStepCount: number;
    readonly requiresHumanApproval: boolean;
}
/**
 * Canonical Governed Candidate Plan.
 * This is UNTRUSTED DATA representing a candidate proposal only.
 */
export interface GovernedCandidatePlan {
    readonly planId: string;
    readonly requestId: string;
    readonly taskId: string;
    readonly tenantId: string;
    readonly taskVersion: number;
    readonly objective: string;
    readonly assumptions: readonly string[];
    readonly constraints: readonly string[];
    readonly steps: readonly GovernedCandidateStep[];
    readonly dag: PlanDag;
    readonly riskSummary: PlanRiskSummary;
    readonly requiresApproval: boolean;
    /**
     * Explicit architectural tags:
     * Confirms this data structure is candidate-only and holds no execution authority.
     */
    readonly isCandidatePlanOnly: true;
    readonly isAuthorized: false;
    readonly provenanceHash: string;
    readonly timestamp: string;
}
/**
 * Validation metadata for candidate plan integrity.
 */
export interface PlanValidationMetadata {
    readonly valid: boolean;
    readonly validatedAt: string;
    readonly stepCount: number;
    readonly edgeCount: number;
    readonly passedValidationRules: readonly string[];
}
/**
 * Planner runtime execution metadata.
 */
export interface PlannerRuntimeMetadata {
    readonly plannerVersion: string;
    readonly durationMs: number;
    readonly deterministicTimestampUsed: boolean;
    readonly cognitiveModelUsed: string;
}
/**
 * Canonical response contract from the governed planner.
 */
export interface GovernedPlanningResponse {
    readonly requestId: string;
    readonly taskId: string;
    readonly tenantId: string;
    readonly taskVersion: number;
    readonly candidatePlan: GovernedCandidatePlan;
    readonly validationMetadata: PlanValidationMetadata;
    readonly provenanceHash: string;
    readonly timestamp: string;
    readonly plannerMetadata: PlannerRuntimeMetadata;
    readonly status: 'CANDIDATE_PRODUCED';
}
/**
 * Audit event type constants for governed planner domain.
 */
export declare const PLANNER_AUDIT_DOMAIN = "agent_action_planner";
export declare const PlannerAuditEventType: {
    readonly PLANNER_STARTED: "PLANNER_STARTED";
    readonly PLANNER_COMPLETED: "PLANNER_COMPLETED";
    readonly PLANNER_VALIDATION_FAILED: "PLANNER_VALIDATION_FAILED";
    readonly PLANNER_DAG_INVALID: "PLANNER_DAG_INVALID";
    readonly PLANNER_STALE_REJECTED: "PLANNER_STALE_REJECTED";
    readonly PLANNER_USER_STOP_ABORTED: "PLANNER_USER_STOP_ABORTED";
    readonly PLANNER_PLAN_REJECTED: "PLANNER_PLAN_REJECTED";
};
export type PlannerAuditEventType = typeof PlannerAuditEventType[keyof typeof PlannerAuditEventType];
/**
 * Base error class for Governed Planning.
 */
export declare class GovernedPlanningError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(code: string, message: string, details?: unknown);
}
/**
 * Thrown when plan structural or safety validation fails.
 */
export declare class PlanValidationError extends GovernedPlanningError {
    readonly validationErrors: readonly string[];
    constructor(message: string, validationErrors?: readonly string[]);
}
/**
 * Thrown when cycle or invalid edge is detected in plan DAG.
 */
export declare class PlanDagCycleError extends GovernedPlanningError {
    readonly cycleNodes: readonly string[];
    constructor(message: string, cycleNodes?: readonly string[]);
}
/**
 * Thrown when planning is aborted by USER_STOP supremacy.
 */
export declare class PlanUserStopError extends GovernedPlanningError {
    constructor(message?: string);
}
/**
 * Thrown when task version mismatch is detected (stale plan protection).
 */
export declare class StaleTaskPlanError extends GovernedPlanningError {
    readonly expectedVersion: number;
    readonly authoritativeVersion: number;
    constructor(expectedVersion: number, authoritativeVersion: number);
}
/**
 * Thrown when cross-tenant access or invalid tenant identifier is detected.
 */
export declare class CrossTenantPlanError extends GovernedPlanningError {
    constructor(message: string);
}
/**
 * Thrown when plan bounds (step count, dependencies, byte size) are exceeded.
 */
export declare class PlanBudgetExceededError extends GovernedPlanningError {
    constructor(message: string);
}
/**
 * Thrown when planning is cancelled via AbortSignal.
 */
export declare class PlanAbortError extends GovernedPlanningError {
    constructor(message?: string);
}
