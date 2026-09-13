// src/core/contextAssembly/contextTypes.ts
// BOWCON V4.0 — MS-1.4.03: CONTEXT ASSEMBLY & DYNAMIC COMPACTION TYPES
//
// Invariants:
// CONTEXT != AUTHORITY
// CONTEXT != PLAN
// CONTEXT != EXECUTION
// CONTEXT != POLICY
// CONTEXT != MEMORY COMMIT
// HARD_MAX_PROMPT_TOKENS <= 8192
// DEFAULT_MAX_PROMPT_TOKENS == 4096
// DEFAULT_MAX_COMPLETION_TOKENS == 2048
// TIER_1_CRITICAL_IMMUTABLE == TRUE

import type { CognitivePromptContext, CognitiveTurn } from '../cognitive/cognitiveTypes.js';
import type { TaskStep } from '../taskLifecycle/agentTaskTypes.js';

export const HARD_MAX_PROMPT_TOKENS = 8192;
export const DEFAULT_MAX_PROMPT_TOKENS = 4096;
export const DEFAULT_MAX_COMPLETION_TOKENS = 2048;

/**
 * Priority tiers for context fragments during assembly and compaction.
 * Lower numbers have strictly higher preservation priority.
 */
export enum ContextTier {
  TIER_1_CRITICAL = 1,
  TIER_2_HIGH = 2,
  TIER_3_MEDIUM = 3,
  TIER_4_LOW = 4,
}

/**
 * Functional category of context fragment.
 */
export type ContextCategory =
  | 'SYSTEM_SAFETY_DIRECTIVES'
  | 'GOVERNANCE_CONSTRAINTS'
  | 'TASK_METADATA'
  | 'ACTIVE_TASK_INTENT'
  | 'ACTIVE_STEP'
  | 'PREVIOUS_STEP_RESULT'
  | 'FAILURE_TELEMETRY'
  | 'SANITIZED_USER_PROMPT'
  | 'EXPLICIT_USER_CONSTRAINTS'
  | 'RECENT_CONVERSATION_TURNS'
  | 'HISTORICAL_COMPLETED_STEPS'
  | 'CAPABILITY_SCHEMAS'
  | 'VERBOSE_STEP_PARAMETERS'
  | 'CUSTOM_FRAGMENT';

/**
 * Atomic unit of context consumed and transformed during assembly.
 */
export interface ContextFragment {
  readonly fragmentId: string;
  readonly category: ContextCategory;
  readonly tier: ContextTier;
  readonly priority: number; // Higher number = higher priority within the same tier
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

// ---------------------------------------------------------------------------
// ERROR HIERARCHY
// ---------------------------------------------------------------------------

export class ContextAssemblyError extends Error {
  public readonly code: string;
  public readonly details?: Readonly<Record<string, unknown>>;

  constructor(message: string, code = 'CONTEXT_ASSEMBLY_ERROR', details?: Record<string, unknown>) {
    super(`[${code}] ${message}`);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details ? Object.freeze({ ...details }) : undefined;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ContextSourceUnavailableError extends ContextAssemblyError {
  constructor(source: string, reason?: string, details?: Record<string, unknown>) {
    super(
      `Mandatory context source '${source}' is unavailable: ${reason || 'Not found'}`,
      'CONTEXT_SOURCE_UNAVAILABLE',
      { source, reason, ...details }
    );
  }
}

export class ContextSourceCorruptedError extends ContextAssemblyError {
  constructor(source: string, reason?: string, details?: Record<string, unknown>) {
    super(
      `Context source '${source}' is corrupted: ${reason || 'Integrity violation'}`,
      'CONTEXT_SOURCE_CORRUPTED',
      { source, reason, ...details }
    );
  }
}

export class ContextBudgetExceededError extends ContextAssemblyError {
  public readonly limit: number;
  public readonly actual: number;

  constructor(limit: number, actual: number, messageOrDetails?: string | Record<string, unknown>) {
    const customMsg = typeof messageOrDetails === 'string' ? messageOrDetails : undefined;
    const details = typeof messageOrDetails === 'object' ? messageOrDetails : undefined;
    super(
      customMsg || `Context token budget exceeded: limit=${limit}, actual=${actual} (compaction unable to reduce further without violating Tier 1 safety)`,
      'CONTEXT_BUDGET_EXCEEDED',
      { limit, actual, ...details }
    );
    this.limit = limit;
    this.actual = actual;
  }
}

export class ContextUserStopError extends ContextAssemblyError {
  public readonly stage: string;

  constructor(stage: string) {
    super(
      `Context assembly aborted by USER_STOP during stage '${stage}'`,
      'CONTEXT_USER_STOP_ERROR',
      { stage }
    );
    this.stage = stage;
  }
}

export class CrossTenantContextError extends ContextAssemblyError {
  public readonly requestedTenantId: string;
  public readonly actualTenantId: string;

  constructor(requestedTenantId: string, actualTenantId: string, details?: Record<string, unknown>) {
    super(
      `Cross-tenant context violation: requested '${requestedTenantId}' but resource belongs to '${actualTenantId}'`,
      'CROSS_TENANT_CONTEXT_ERROR',
      { requestedTenantId, actualTenantId, ...details }
    );
    this.requestedTenantId = requestedTenantId;
    this.actualTenantId = actualTenantId;
  }
}

export class StaleTaskContextError extends ContextAssemblyError {
  public readonly expectedVersion: number;
  public readonly actualVersion: number;

  constructor(taskId: string, expectedVersion: number, actualVersion: number) {
    super(
      `Stale task context for task '${taskId}': expected version ${expectedVersion}, but actual task version is ${actualVersion}`,
      'STALE_TASK_CONTEXT_ERROR',
      { taskId, expectedVersion, actualVersion }
    );
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

export class ContextValidationError extends ContextAssemblyError {
  public readonly validationErrors: readonly string[];

  constructor(message: string, errors: readonly string[] = []) {
    super(
      `Context validation error: ${message}${errors.length > 0 ? ` (${errors.join(', ')})` : ''}`,
      'CONTEXT_VALIDATION_ERROR',
      { validationErrors: errors }
    );
    this.validationErrors = Object.freeze([...errors]);
  }
}
