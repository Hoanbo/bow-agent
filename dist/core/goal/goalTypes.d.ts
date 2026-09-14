import type { CognitiveIntent } from '../cognitive/cognitiveTypes.js';
export declare const GOAL_SCHEMA_VERSION = 1;
export declare const MAX_GOALS_PER_TENANT = 500;
export declare const MAX_SUBGOALS_PER_GOAL = 20;
export declare const MAX_GRAPH_DEPTH = 8;
export declare const MAX_EDGES_PER_GOAL = 30;
export declare const MAX_TITLE_LENGTH = 200;
export declare const MAX_DESCRIPTION_LENGTH = 2000;
export declare class GoalError extends Error {
    readonly code: string;
    readonly details?: Readonly<Record<string, unknown>>;
    constructor(code: string, message: string, details?: Record<string, unknown>);
}
export declare class GoalValidationError extends GoalError {
    readonly validationErrors: readonly string[];
    constructor(message: string, errors?: string[], details?: Record<string, unknown>);
}
export declare class GoalTransitionError extends GoalError {
    constructor(fromStatus: string, toStatus: string, reason?: string);
}
export declare class GoalGraphCycleError extends GoalError {
    readonly cyclePath: readonly string[];
    constructor(cyclePath?: string[]);
}
export declare class GoalConcurrencyError extends GoalError {
    readonly expectedVersion: number;
    readonly actualVersion: number;
    constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>);
}
export declare class CrossTenantGoalError extends GoalError {
    constructor(requestedTenant: string, activeTenant: string);
}
export declare class GoalUserStopError extends GoalError {
    constructor(checkpoint: string);
}
export declare class GoalCoTProhibitedError extends GoalError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class GoalIntegrityError extends GoalError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class GoalSecurityError extends GoalError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class GoalCapacityError extends GoalError {
    constructor(currentCount: number, maxCount: number, entityType?: string);
}
export type GoalOrigin = 'USER_DIRECTIVE' | 'SYSTEM_EVENT' | 'COGNITIVE_REGISTER' | 'TASK_OUTCOME';
export type GoalStatus = 'PROPOSED' | 'VALIDATING' | 'APPROVED' | 'ACTIVE' | 'BLOCKED' | 'PAUSED' | 'COMPLETED' | 'ABANDONED' | 'REJECTED';
export type GovernedGoalStatus = GoalStatus;
export type GoalEdgeType = 'PARENT_OF' | 'DEPENDS_ON' | 'BLOCKS' | 'CONFLICTS_WITH';
export type GoalConflictType = 'RESOURCE_EXCLUSION' | 'POLICY_CONTRADICTION' | 'INSTRUCTIONAL_CONTRADICTION';
export interface GoalPriorityVector {
    readonly importance: number;
    readonly urgency: number;
    readonly userEmphasis: number;
    readonly risk: number;
    readonly dependencyPressure: number;
    readonly blockingImpact: number;
}
export interface GoalPriorityWeights {
    readonly wi: number;
    readonly wu: number;
    readonly we: number;
    readonly wr: number;
    readonly wd: number;
    readonly wb: number;
}
export declare const CANONICAL_PRIORITY_WEIGHTS: GoalPriorityWeights;
export interface GoalProposalInput {
    readonly tenantId: string;
    readonly sessionId?: string;
    readonly parentGoalId?: string | null;
    readonly origin: GoalOrigin;
    readonly sourceIntent: string | CognitiveIntent;
    readonly title: string;
    readonly description: string;
    readonly successCriteria: readonly string[];
    readonly failureCriteria?: readonly string[];
    readonly constraints?: readonly string[];
    readonly priorityVector?: Partial<GoalPriorityVector>;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
export interface GovernedGoal {
    readonly goalId: string;
    readonly parentGoalId: string | null;
    readonly tenantId: string;
    readonly sessionId?: string;
    readonly origin: GoalOrigin;
    readonly sourceIntent: string | CognitiveIntent;
    readonly title: string;
    readonly description: string;
    readonly successCriteria: readonly string[];
    readonly failureCriteria: readonly string[];
    readonly constraints: readonly string[];
    readonly priorityScore: number;
    readonly priorityVector: GoalPriorityVector;
    readonly status: GoalStatus;
    readonly statusReason?: string;
    readonly activeTaskRefs: readonly string[];
    readonly version: number;
    readonly provenanceHash: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}
export interface GoalEdge {
    readonly edgeId: string;
    readonly sourceGoalId: string;
    readonly targetGoalId: string;
    readonly edgeType: GoalEdgeType;
    readonly tenantId: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly createdAt: string;
}
export interface GoalConflictDescriptor {
    readonly conflictId: string;
    readonly goalIdA: string;
    readonly goalIdB: string;
    readonly conflictType: GoalConflictType;
    readonly severity: 'HIGH' | 'CRITICAL';
    readonly reason: string;
    readonly detectedAt: string;
}
export interface GoalGraphDocument {
    readonly schemaVersion: number;
    readonly tenantId: string;
    readonly graphVersion: number;
    readonly goals: readonly GovernedGoal[];
    readonly edges: readonly GoalEdge[];
    readonly conflicts: readonly GoalConflictDescriptor[];
    readonly provenanceHash: string;
    readonly lastUpdatedAt: string;
    readonly recoveredFromBackup?: boolean;
}
export declare function isSafeObjectKey(key: string): boolean;
export declare function assertNoChainOfThought(val: unknown, path?: string): void;
export declare const assertNoProhibitedReasoning: typeof assertNoChainOfThought;
/**
 * Computes deterministic goal identifier from canonical material.
 */
export declare function computeDeterministicGoalId(tenantId: string, sourceIntent: string | CognitiveIntent, title: string, createdAt: string): string;
/**
 * Computes deterministic SHA-256 hash of a GovernedGoal.
 */
export declare function computeGoalHash(goal: Omit<GovernedGoal, 'provenanceHash'>, previousHash?: string): string;
/**
 * Computes deterministic provenance hash for the entire GoalGraphDocument.
 */
export declare function computeGraphProvenanceHash(doc: Omit<GoalGraphDocument, 'provenanceHash'>): string;
