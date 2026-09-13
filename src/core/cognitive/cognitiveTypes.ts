// src/core/cognitive/cognitiveTypes.ts
// BOWCON V4.0 — MS-1.3.32: REAL BOWCON COGNITIVE PROVIDER & LOCAL INTELLIGENCE RUNTIME
//
// Invariants:
// ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// HIGH_CONFIDENCE != EXECUTION_AUTHORITY
// COGNITIVE_PROVIDER != TOOL_REGISTRY
// FAILURE != BRAIN_DEATH

import { randomBytes } from 'node:crypto';

export const COGNITIVE_RUNTIME_VERSION = '4.0.0';

export type CognitiveProviderType =
  | 'cloud-gemini'
  | 'ollama-local'
  | 'deterministic-fallback'
  | 'local-real'
  | 'ollama';

export type CognitiveIntent =
  | 'OBSERVE'
  | 'READ'
  | 'WRITE'
  | 'APPEND'
  | 'UPDATE'
  | 'SEARCH'
  | 'ANALYZE'
  | 'PLAN'
  | 'DECIDE'
  | 'COMMUNICATE'
  | 'QUERY'
  | 'SYSTEM'
  | 'UNKNOWN';

export type CognitiveDecisionType = 'PROCEED' | 'REQUIRE_APPROVAL' | 'REJECT' | 'CLARIFY';

export type CognitiveRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CognitiveConfidence {
  readonly score: number; // 0.0 to 1.0
  readonly calibrationRationale: string;
  readonly meetsExecutionThreshold: boolean;
}

export interface CognitivePlanStep {
  readonly stepIndex: number;
  readonly action: string;
  readonly target?: string;
  readonly parameters?: Record<string, unknown>;
  readonly requiredCapability?: string;
  readonly validationCriteria?: string;
}

export interface CognitivePlan {
  readonly planId: string;
  readonly steps: readonly CognitivePlanStep[];
  readonly summary: string;
  readonly estimatedRisk: CognitiveRiskLevel;
  readonly requiredCapabilities: readonly string[];
}

export interface CognitiveDecision {
  readonly decisionType: CognitiveDecisionType;
  readonly riskLevel: CognitiveRiskLevel;
  readonly requiredCapabilities: readonly string[];
  readonly requiresApproval: boolean;
  readonly executionEligibility: boolean;
  readonly reasonSummary: string;
}

export interface CognitiveStageTrace {
  readonly stage: string;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly durationMs: number;
  readonly metadata?: Record<string, unknown>;
}

export interface CognitiveTrace {
  readonly traceId: string;
  readonly requestId: string;
  readonly providerType: CognitiveProviderType;
  readonly modelName: string;
  readonly latencyMs: number;
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly stages: readonly CognitiveStageTrace[];
}

export interface CognitiveToolCandidate {
  readonly toolName: string;
  readonly toolArgs: Record<string, unknown>;
  readonly intent: CognitiveIntent;
  readonly capability: string;
}

export interface CognitiveResult {
  readonly requestId: string;
  readonly provider: CognitiveProviderType;
  readonly model: string;
  readonly intent: CognitiveIntent;
  readonly interpretation: string;
  readonly reasoningSummary: string;
  readonly plan: CognitivePlan;
  readonly decision: CognitiveDecision;
  readonly confidence: CognitiveConfidence;
  readonly requestedCapabilities: readonly string[];
  readonly riskLevel: CognitiveRiskLevel;
  readonly toolCandidates: readonly CognitiveToolCandidate[];
  readonly requiresApproval: boolean;
  readonly createdAt: string;
  readonly traceId: string;
  readonly rawOutput?: string;
}

export interface CognitiveTurn {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly timestamp?: string;
  readonly targetEntity?: string;
}

export interface CognitivePromptContext {
  readonly systemContext?: string;
  readonly systemPrompt?: string;
  readonly userContext?: string;
  readonly memoryContext?: string;
  readonly taskContext?: string;
  readonly capabilitiesContext?: string;
  readonly policyConstraints?: string;
  readonly previousTurns?: readonly CognitiveTurn[];
}

export interface CognitiveProviderConfig {
  readonly providerPreference?: 'auto' | 'cloud-gemini' | 'ollama-local' | 'ollama' | 'local-real' | 'deterministic-fallback';
  readonly geminiApiKey?: string;
  readonly geminiModel?: string;
  readonly ollamaBaseUrl?: string;
  readonly ollamaModel?: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

export interface CognitiveHealthStatus {
  readonly isAvailable: boolean;
  readonly providerType: CognitiveProviderType;
  readonly modelName: string;
  readonly latencyMs?: number;
  readonly error?: string;
  readonly details?: Record<string, unknown>;
}

// ============================================================================
// MS-1.4.02 CANONICAL INFERENCE CONTRACTS & BUDGETS
// ============================================================================

export interface CognitiveInferenceBudget {
  readonly maxPromptTokens: number;
  readonly maxCompletionTokens: number;
  readonly maxLatencyMs: number;
  readonly maxCostUsd?: number;
}

export interface CognitiveInferenceRequest {
  readonly requestId: string;
  readonly taskId?: string;
  readonly tenantId: string;
  readonly promptContext: CognitivePromptContext;
  readonly providerPreference?:
    | 'auto'
    | 'cloud-gemini'
    | 'ollama-local'
    | 'deterministic-fallback';
  readonly budget: CognitiveInferenceBudget;
  readonly schemaRequirement?: 'STRUCTURED_REASONING' | 'RAW_TEXT';
  readonly correlationId?: string;
}

export interface CognitiveUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly latencyMs: number;
  readonly estimatedCostUsd: number;
}

export interface CognitiveInferenceResponse {
  readonly requestId: string;
  readonly taskId?: string;
  readonly tenantId: string;
  readonly providerType: 'cloud-gemini' | 'ollama-local' | 'deterministic-fallback';
  readonly modelName: string;
  readonly cognitiveResult: CognitiveResult;
  readonly usage: CognitiveUsage;
  readonly fallbackOccurred: boolean;
  readonly fallbackChain: readonly string[];
  readonly provenanceHash: string;
  readonly timestamp: string;
}

// ============================================================================
// MS-1.4.02 ERROR HIERARCHY
// ============================================================================

export class CognitiveRuntimeError extends Error {
  public readonly code: string;
  public readonly details?: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`[${code}] ${message}`);
    this.name = 'CognitiveRuntimeError';
    this.code = code;
    this.details = details ? Object.freeze({ ...details }) : undefined;
  }
}

export class CognitiveBudgetExceededError extends CognitiveRuntimeError {
  public readonly budgetType: 'prompt_tokens' | 'completion_tokens' | 'latency' | 'cost' | 'cumulative_task_cost';
  public readonly limit: number;
  public readonly actual: number;

  constructor(
    budgetType: 'prompt_tokens' | 'completion_tokens' | 'latency' | 'cost' | 'cumulative_task_cost',
    limit: number,
    actual: number,
    details?: Record<string, unknown>
  ) {
    super(
      'COGNITIVE_BUDGET_EXCEEDED',
      `Cognitive budget exceeded for '${budgetType}': limit=${limit}, actual=${actual}`,
      { budgetType, limit, actual, ...details }
    );
    this.name = 'CognitiveBudgetExceededError';
    this.budgetType = budgetType;
    this.limit = limit;
    this.actual = actual;
  }
}

export class CognitiveTimeoutError extends CognitiveRuntimeError {
  public readonly timeoutMs: number;
  public readonly providerType?: string;

  constructor(timeoutMs: number, providerType?: string, details?: Record<string, unknown>) {
    super(
      'COGNITIVE_TIMEOUT',
      `Cognitive inference timed out after ${timeoutMs}ms${providerType ? ` on provider '${providerType}'` : ''}`,
      { timeoutMs, providerType, ...details }
    );
    this.name = 'CognitiveTimeoutError';
    this.timeoutMs = timeoutMs;
    this.providerType = providerType;
  }
}

export class CognitiveProviderUnavailableError extends CognitiveRuntimeError {
  public readonly providerType: string;

  constructor(providerType: string, message: string, details?: Record<string, unknown>) {
    super(
      'COGNITIVE_PROVIDER_UNAVAILABLE',
      `Provider '${providerType}' is unavailable: ${message}`,
      { providerType, ...details }
    );
    this.name = 'CognitiveProviderUnavailableError';
    this.providerType = providerType;
  }
}

export class CognitiveValidationError extends CognitiveRuntimeError {
  public readonly validationErrors: readonly string[];

  constructor(message: string, validationErrors: string[] = [], details?: Record<string, unknown>) {
    super(
      'COGNITIVE_VALIDATION_ERROR',
      `Cognitive result validation failed: ${message}`,
      { validationErrors, ...details }
    );
    this.name = 'CognitiveValidationError';
    this.validationErrors = Object.freeze([...validationErrors]);
  }
}

export class CognitiveUserStopError extends CognitiveRuntimeError {
  constructor(operation: string, details?: Record<string, unknown>) {
    super(
      'COGNITIVE_USER_STOP_ACTIVE',
      `Cognitive operation '${operation}' aborted because USER_STOP is active`,
      { operation, ...details }
    );
    this.name = 'CognitiveUserStopError';
  }
}

// ============================================================================
// DETERMINISTIC IDENTIFIER GENERATORS
// ============================================================================

export function makeCognitiveRequestId(): string {
  const rand = randomBytes(8).toString('hex');
  return `cogreq_${rand}`;
}

export function makeCognitiveTraceId(): string {
  const rand = randomBytes(8).toString('hex');
  return `cogtrc_${rand}`;
}

export function makeCognitivePlanId(): string {
  const rand = randomBytes(6).toString('hex');
  return `cogpln_${rand}`;
}
