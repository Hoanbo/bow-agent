import type { CognitiveIntent, CognitiveRiskLevel } from '../cognitive/cognitiveTypes.js';
export declare const COGNITIVE_STATE_SCHEMA_VERSION = 1;
export declare const MAX_COGNITIVE_STATE_BYTES: number;
export declare const MAX_RECENT_OBSERVATIONS = 10;
export declare const MAX_SECONDARY_ATTENTION_TARGETS = 3;
export declare const MAX_ATTENTION_STACK_DEPTH = 5;
export declare const GENESIS_PREVIOUS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
export declare class CognitiveStateError extends Error {
    readonly code: string;
    readonly details?: Readonly<Record<string, unknown>>;
    constructor(code: string, message: string, details?: Record<string, unknown>);
}
export declare class CognitiveStateValidationError extends CognitiveStateError {
    readonly validationErrors: readonly string[];
    constructor(message: string, errors?: string[], details?: Record<string, unknown>);
}
export declare class CognitiveStateConcurrencyError extends CognitiveStateError {
    readonly expectedVersion: number;
    readonly actualVersion: number;
    constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>);
}
export declare class CognitiveStateSizeLimitError extends CognitiveStateError {
    readonly byteLength: number;
    readonly limitBytes: number;
    constructor(actualBytes: number, limitBytes?: number);
}
export declare class CognitiveStateRecoveryError extends CognitiveStateError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class CognitiveStateIntegrityError extends CognitiveStateError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class CrossTenantCognitiveStateError extends CognitiveStateError {
    constructor(requestedTenant: string, activeTenant: string);
}
export declare class CognitiveStateUserStopError extends CognitiveStateError {
    constructor(checkpoint: string);
}
export declare class CognitiveStateTransitionError extends CognitiveStateError {
    constructor(fromState: string, toState: string, reason?: string);
}
export declare class CognitiveStatePromotionError extends CognitiveStateError {
    constructor(message: string, details?: Record<string, unknown>);
}
export type CognitiveLifecycleState = 'UNINITIALIZED' | 'INITIALIZING' | 'ACTIVE' | 'INTERRUPTED' | 'SUSPENDED' | 'RECOVERING' | 'CLOSED';
export declare const LEGAL_LIFECYCLE_TRANSITIONS: Readonly<Record<CognitiveLifecycleState, readonly CognitiveLifecycleState[]>>;
export interface FocusDescriptor {
    readonly subject: string;
    readonly domain: string;
    readonly establishedAt: string;
    readonly rationale: string;
}
export interface AttentionTargetDescriptor {
    readonly targetId: string;
    readonly targetType: 'FILE' | 'FUNCTION' | 'TASK_STEP' | 'ERROR' | 'ENTITY' | 'TOPIC';
    readonly targetValue: string;
    readonly salienceScore: number;
    readonly assignedAt: string;
}
export interface CognitiveHypothesis {
    readonly hypothesisId: string;
    readonly summary: string;
    readonly status: 'SPECULATIVE' | 'VERIFYING' | 'REFUTED' | 'VERIFIED';
    readonly confidence: number;
    readonly verificationCriteria?: string;
    readonly evidenceIds?: readonly string[];
}
export interface CognitivePendingDecision {
    readonly decisionId: string;
    readonly actionCandidate: string;
    readonly estimatedRisk: CognitiveRiskLevel;
    readonly requiresApproval: boolean;
    readonly rationale: string;
    readonly evaluatedAt: string;
}
export interface CognitiveObservation {
    readonly observationId: string;
    readonly source: string;
    readonly content: string;
    readonly observedAt: string;
    readonly salience: number;
}
export interface LastVerifiedStateReference {
    readonly verificationId: string;
    readonly stateChecksum: string;
    readonly verifiedAt: string;
    readonly verifiedByOracle: string;
}
export interface WorkingRegisters {
    readonly current_focus: FocusDescriptor | null;
    readonly active_intent: CognitiveIntent | null;
    readonly active_goal_ref: string | null;
    readonly attention_target: AttentionTargetDescriptor | null;
    readonly active_constraints: readonly string[];
    readonly active_entities: Readonly<Record<string, unknown>>;
    readonly unresolved_questions: readonly string[];
    readonly hypotheses: readonly CognitiveHypothesis[];
    readonly pending_decisions: readonly CognitivePendingDecision[];
    readonly recent_observations: readonly CognitiveObservation[];
    readonly current_environment: Readonly<Record<string, unknown>>;
    readonly active_task_ref: string | null;
    readonly cognitive_priority: number;
    readonly uncertainty_state: Readonly<Record<string, unknown>>;
    readonly last_verified_state: LastVerifiedStateReference | null;
}
export interface AttentionFrame {
    readonly frameId: string;
    readonly primaryTarget: AttentionTargetDescriptor | null;
    readonly secondaryTargets: readonly AttentionTargetDescriptor[];
    readonly activePriority: number;
    readonly interruptedBy: string;
    readonly savedAt: string;
}
export interface AttentionState {
    readonly primaryTarget: AttentionTargetDescriptor | null;
    readonly secondaryTargets: readonly AttentionTargetDescriptor[];
    readonly stack: readonly AttentionFrame[];
}
export interface CognitiveStateProvenance {
    readonly stateHash: string;
    readonly previousStateHash: string;
    readonly stateVersion: number;
    readonly mutatedBy: string;
    readonly mutationReason: string;
    readonly timestamp: string;
}
export interface CognitiveStateDocument {
    readonly schemaVersion: number;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly stateVersion: number;
    readonly lifecycleState: CognitiveLifecycleState;
    readonly registers: WorkingRegisters;
    readonly attention: AttentionState;
    readonly provenance: CognitiveStateProvenance;
}
/**
 * Recursively canonicalizes an arbitrary object/array ensuring deterministic key sorting
 * and detecting prohibited chain-of-thought keys.
 */
export declare function canonicalizeStateValue(val: unknown, path?: string): unknown;
/**
 * Produces deterministic JSON string from canonical state document without volatile fields.
 */
export declare function serializeCanonicalState(doc: CognitiveStateDocument): string;
/**
 * Computes SHA-256 provenance hash for a cognitive state document.
 */
export declare function computeCognitiveStateHash(doc: CognitiveStateDocument): string;
