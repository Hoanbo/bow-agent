export declare const DELIBERATION_SCHEMA_VERSION = 1;
export declare const DELIBERATION_BOUNDS: Readonly<{
    MAX_DELIBERATION_SESSIONS_PER_TENANT: 50;
    MAX_HYPOTHESES_PER_SESSION: 20;
    MAX_EVIDENCE_PER_HYPOTHESIS: 30;
    MAX_CONSTRAINTS_PER_SESSION: 50;
    MAX_CONTRADICTIONS_PER_SESSION: 40;
    MAX_INFERENCE_DEPTH: 6;
    MAX_GRAPH_NODES: 100;
    MAX_GRAPH_EDGES: 200;
    MAX_SESSION_BYTES: number;
    MAX_DELIBERATION_TIME_MS: 10000;
    MAX_TITLE_LENGTH: 200;
    MAX_PREMISE_LENGTH: 2000;
}>;
export declare const CANONICAL_DELIBERATION_WEIGHTS: Readonly<{
    symbolicValidityWeight: 0.6;
    neuralPlausibilityWeight: 0.4;
    refutationPenaltyWeight: 0.5;
}>;
export declare class DeliberationError extends Error {
    readonly code: string;
    readonly details?: Readonly<Record<string, unknown>>;
    constructor(code: string, message: string, details?: Record<string, unknown>);
}
export declare class DeliberationValidationError extends DeliberationError {
    readonly validationErrors: readonly string[];
    constructor(message: string, errors?: string[], details?: Record<string, unknown>);
}
export declare class DeliberationTransitionError extends DeliberationError {
    constructor(fromStatus: string, toStatus: string, reason?: string);
}
export declare class DeliberationConcurrencyError extends DeliberationError {
    readonly expectedVersion: number;
    readonly actualVersion: number;
    constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>);
}
export declare class CrossTenantDeliberationError extends DeliberationError {
    constructor(requestedTenant: string, activeTenant: string);
}
export declare class DeliberationUserStopError extends DeliberationError {
    constructor(checkpoint: string);
}
export declare class DeliberationCoTProhibitedError extends DeliberationError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class DeliberationIntegrityError extends DeliberationError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class DeliberationSecurityError extends DeliberationError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class DeliberationCapacityError extends DeliberationError {
    constructor(currentCount: number, maxCount: number, entityType?: string);
}
export declare class ContradictionError extends DeliberationError {
    readonly category: string;
    constructor(category: string, message: string, details?: Record<string, unknown>);
}
export type DeliberationOrigin = 'GOAL_REFINEMENT' | 'UNRESOLVED_COGNITIVE_QUESTION' | 'INCIDENT_ROOT_CAUSE' | 'POLICY_CONTRADICTION_ANALYSIS' | 'TASK_PLAN_ALTERNATIVES';
export type DeliberationSessionStatus = 'INITIALIZING' | 'DELIBERATING' | 'CONVERGED' | 'RESOLVED' | 'INCONCLUSIVE' | 'CONTRADICTED' | 'ABORTED';
export type HypothesisStatus = 'PROPOSED' | 'VALIDATING' | 'SUPPORTED' | 'REFUTED' | 'CONTRADICTED' | 'INCONCLUSIVE' | 'SUPERSEDED';
export type EvidenceSourceType = 'USER_DIRECTIVE' | 'CANONICAL_EPISODIC_MEMORY' | 'SEMANTIC_MEMORY_REFERENCE' | 'GOVERNED_GOAL_STATE' | 'TASK_OUTCOME_RECORD' | 'SYSTEM_EMPIRICAL_OBSERVATION';
export type ContradictionCategory = 'LOGICAL_CONTRADICTION' | 'CONSTRAINT_CONTRADICTION' | 'GOAL_CONTRADICTION' | 'EVIDENCE_CONTRADICTION' | 'RESOURCE_CONTRADICTION' | 'POLICY_CONTRADICTION';
export type SymbolicConstraintPolarity = 'MUST' | 'MUST_NOT' | 'PREFER';
export interface EvidenceBinding {
    readonly evidenceId: string;
    readonly tenantId: string;
    readonly sessionId?: string;
    readonly sourceType: EvidenceSourceType;
    readonly sourceReferenceId: string;
    readonly statement: string;
    readonly confidence: number;
    readonly isEmpiricallyVerified: boolean;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly provenanceHash: string;
    readonly boundAt: string;
}
export interface SymbolicConstraint {
    readonly constraintId: string;
    readonly predicate: string;
    readonly polarity: SymbolicConstraintPolarity;
    readonly sourceGoalId?: string;
    readonly active: boolean;
    readonly description?: string;
}
export interface HypothesisProposalInput {
    readonly tenantId: string;
    readonly sessionId?: string;
    readonly title: string;
    readonly premise: string;
    readonly predictedOutcome?: string;
    readonly supportingEvidenceIds?: readonly string[];
    readonly refutingEvidenceIds?: readonly string[];
    readonly plausibilityScore?: number;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
export interface DeliberationHypothesis {
    readonly hypothesisId: string;
    readonly sessionId: string;
    readonly tenantId: string;
    readonly title: string;
    readonly premise: string;
    readonly predictedOutcome: string;
    readonly status: HypothesisStatus;
    readonly statusReason?: string;
    readonly supportingEvidenceIds: readonly string[];
    readonly refutingEvidenceIds: readonly string[];
    readonly satisfiedConstraintIds: readonly string[];
    readonly violatedConstraintIds: readonly string[];
    readonly plausibilityScore: number;
    readonly validityScore: number;
    readonly combinedConfidence: number;
    readonly version: number;
    readonly provenanceHash: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}
export interface DeliberationContradiction {
    readonly contradictionId: string;
    readonly category: ContradictionCategory;
    readonly entityIdA: string;
    readonly entityIdB: string;
    readonly explanation: string;
    readonly severity: 'HIGH' | 'CRITICAL';
    readonly detectedAt: string;
}
export interface DeliberationResult {
    readonly sessionId: string;
    readonly tenantId: string;
    readonly targetGoalId?: string;
    readonly winningHypothesisId: string | null;
    readonly topHypotheses: readonly DeliberationHypothesis[];
    readonly status: DeliberationSessionStatus;
    readonly summaryRationale: string;
    readonly recommendedAction?: string;
    readonly requiresHumanReview: boolean;
    readonly sessionVersion: number;
    readonly provenanceHash: string;
    readonly completedAt: string;
}
export interface DeliberationSessionDocument {
    readonly schemaVersion: number;
    readonly sessionId: string;
    readonly tenantId: string;
    readonly sessionVersion: number;
    readonly status: DeliberationSessionStatus;
    readonly origin: DeliberationOrigin;
    readonly targetGoalId?: string;
    readonly hypotheses: readonly DeliberationHypothesis[];
    readonly evidenceBindings: readonly EvidenceBinding[];
    readonly constraints: readonly SymbolicConstraint[];
    readonly contradictions: readonly DeliberationContradiction[];
    readonly result: DeliberationResult | null;
    readonly provenanceHash: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly recoveredFromBackup?: boolean;
}
export declare function isSafeDeliberationKey(key: string): boolean;
export declare function assertNoDeliberationCoT(val: unknown, path?: string): void;
/**
 * Computes deterministic hypothesis identifier.
 */
export declare function computeDeterministicHypothesisId(tenantId: string, sessionId: string, title: string, createdAt: string): string;
/**
 * Computes deterministic SHA-256 hash of a DeliberationHypothesis.
 */
export declare function computeHypothesisHash(hypo: Omit<DeliberationHypothesis, 'provenanceHash'>, previousHash?: string): string;
/**
 * Computes deterministic SHA-256 hash of an EvidenceBinding.
 */
export declare function computeEvidenceBindingHash(evidence: Omit<EvidenceBinding, 'provenanceHash'>): string;
/**
 * Computes deterministic SHA-256 hash of a DeliberationResult.
 */
export declare function computeResultHash(result: Omit<DeliberationResult, 'provenanceHash'>): string;
/**
 * Computes deterministic provenance hash for the entire DeliberationSessionDocument.
 */
export declare function computeSessionProvenanceHash(doc: Omit<DeliberationSessionDocument, 'provenanceHash'>): string;
