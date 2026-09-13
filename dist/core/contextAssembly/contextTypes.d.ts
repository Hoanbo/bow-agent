import type { CognitivePromptContext, CognitiveTurn } from '../cognitive/cognitiveTypes.js';
export declare const HARD_MAX_PROMPT_TOKENS = 8192;
export declare const DEFAULT_MAX_PROMPT_TOKENS = 4096;
export declare const DEFAULT_MAX_COMPLETION_TOKENS = 2048;
/**
 * Priority tiers for context fragments during assembly and compaction.
 * Lower numbers have strictly higher preservation priority.
 */
export declare enum ContextTier {
    TIER_1_CRITICAL = 1,
    TIER_2_HIGH = 2,
    TIER_3_MEDIUM = 3,
    TIER_4_LOW = 4
}
/**
 * Functional category of context fragment.
 */
export type ContextCategory = 'SYSTEM_SAFETY_DIRECTIVES' | 'GOVERNANCE_CONSTRAINTS' | 'TASK_METADATA' | 'ACTIVE_TASK_INTENT' | 'ACTIVE_STEP' | 'PREVIOUS_STEP_RESULT' | 'FAILURE_TELEMETRY' | 'SANITIZED_USER_PROMPT' | 'EXPLICIT_USER_CONSTRAINTS' | 'RECENT_CONVERSATION_TURNS' | 'HISTORICAL_COMPLETED_STEPS' | 'CAPABILITY_SCHEMAS' | 'VERBOSE_STEP_PARAMETERS' | 'CUSTOM_FRAGMENT';
/**
 * Atomic unit of context consumed and transformed during assembly.
 */
export interface ContextFragment {
    readonly fragmentId: string;
    readonly category: ContextCategory;
    readonly tier: ContextTier;
    readonly priority: number;
    readonly source: string;
    readonly content: string;
    readonly tokenEstimate: number;
    readonly isMandatory: boolean;
    readonly canTruncate: boolean;
    readonly canDrop: boolean;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
/**
 * User/Session prompt inputs passed into context assembly.
 */
export interface ContextPromptInputs {
    readonly userContext?: string;
    readonly taskContext?: string;
    readonly systemPrompt?: string;
    readonly policyConstraints?: string;
    readonly memoryContext?: string;
    readonly capabilitiesContext?: string;
    readonly previousTurns?: readonly CognitiveTurn[];
    readonly customFragments?: readonly ContextFragment[];
}
/**
 * Budget options governing context sizing and allocation.
 */
export interface ContextBudgetOptions {
    readonly maxPromptTokens?: number;
    readonly maxCompletionTokens?: number;
    readonly reservedCompletionTokens?: number;
    readonly tierAllocations?: {
        readonly tier1MaxTokens?: number;
        readonly tier2MaxTokens?: number;
        readonly tier3MaxTokens?: number;
        readonly tier4MaxTokens?: number;
    };
}
/**
 * Request envelope for context assembly.
 */
export interface ContextAssemblyRequest {
    readonly assemblyId: string;
    readonly tenantId: string;
    readonly taskId?: string;
    readonly expectedTaskVersion?: number;
    readonly promptInputs: ContextPromptInputs;
    readonly budget?: ContextBudgetOptions;
    readonly correlationId?: string;
}
/**
 * Compaction metrics reporting how fragments were pruned/condensed.
 */
export interface ContextCompactionMetrics {
    readonly compactionApplied: boolean;
    readonly originalTokenEstimate: number;
    readonly finalTokenEstimate: number;
    readonly tokensSaved: number;
    readonly droppedFragmentCount: number;
    readonly compactedFragmentCount: number;
    readonly truncatedFragmentCount: number;
    readonly compactedTiers: readonly ContextTier[];
}
/**
 * Final assembled context envelope compatible with CognitivePromptContext.
 */
export interface AssembledContext {
    readonly systemContext: string;
    readonly systemPrompt: string;
    readonly userContext: string;
    readonly taskContext: string;
    readonly memoryContext: string;
    readonly capabilitiesContext: string;
    readonly policyConstraints: string;
    readonly previousTurns: readonly CognitiveTurn[];
    readonly formattedPrompt: string;
    readonly rawPrompt: string;
    readonly tokenCount: number;
}
/**
 * Result envelope returned from ContextAssemblyEngine.
 */
export interface ContextAssemblyResult {
    readonly status: 'SUCCESS' | 'STOPPED' | 'ERROR';
    readonly assemblyId: string;
    readonly tenantId: string;
    readonly taskId?: string;
    readonly taskVersion?: number;
    readonly assembledContext: AssembledContext;
    readonly cognitivePromptContext: CognitivePromptContext;
    readonly totalEstimatedTokens: number;
    readonly fragments: readonly ContextFragment[];
    readonly compactionMetrics: ContextCompactionMetrics;
    readonly provenanceHash: string;
    readonly timestamp: string;
}
export declare class ContextAssemblyError extends Error {
    readonly code: string;
    readonly details?: Readonly<Record<string, unknown>>;
    constructor(message: string, code?: string, details?: Record<string, unknown>);
}
export declare class ContextSourceUnavailableError extends ContextAssemblyError {
    constructor(source: string, reason?: string, details?: Record<string, unknown>);
}
export declare class ContextSourceCorruptedError extends ContextAssemblyError {
    constructor(source: string, reason?: string, details?: Record<string, unknown>);
}
export declare class ContextBudgetExceededError extends ContextAssemblyError {
    readonly limit: number;
    readonly actual: number;
    constructor(limit: number, actual: number, messageOrDetails?: string | Record<string, unknown>);
}
export declare class ContextUserStopError extends ContextAssemblyError {
    readonly stage: string;
    constructor(stage: string);
}
export declare class CrossTenantContextError extends ContextAssemblyError {
    readonly requestedTenantId: string;
    readonly actualTenantId: string;
    constructor(requestedTenantId: string, actualTenantId: string, details?: Record<string, unknown>);
}
export declare class StaleTaskContextError extends ContextAssemblyError {
    readonly expectedVersion: number;
    readonly actualVersion: number;
    constructor(taskId: string, expectedVersion: number, actualVersion: number);
}
export declare class ContextValidationError extends ContextAssemblyError {
    readonly validationErrors: readonly string[];
    constructor(message: string, errors?: readonly string[]);
}
