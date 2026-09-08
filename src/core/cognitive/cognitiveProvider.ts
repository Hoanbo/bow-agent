// src/core/cognitive/cognitiveProvider.ts
// BOWCON V4.0 — MS-1.3.32: COGNITIVE PROVIDER CONTRACT
//
// Invariants:
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// HIGH_CONFIDENCE != EXECUTION_AUTHORITY
// COGNITIVE_PROVIDER != TOOL_REGISTRY
// FAILURE != BRAIN_DEATH

import type {
  CognitiveProviderType,
  CognitivePromptContext,
  CognitiveResult,
  CognitiveHealthStatus,
} from './cognitiveTypes.js';

export interface CognitiveExecutionOptions {
  readonly timeoutMs?: number;
  readonly maxTokens?: number;
  readonly signal?: AbortSignal;
  readonly sessionId?: string;
  readonly correlationId?: string;
}

export interface CognitiveProvider {
  /** Provider classification ('local-real' | 'ollama' | 'deterministic-fallback') */
  readonly providerType: CognitiveProviderType;

  /** Human-readable provider identifier */
  readonly providerName: string;

  /** Active model identifier (e.g. 'qwen2.5:14b', 'bowcon-rule-engine-v4') */
  readonly modelName: string;

  /** Probes provider availability, latency, and status */
  healthCheck(): Promise<CognitiveHealthStatus>;

  /**
   * Processes a structured prompt context and generates a validated CognitiveResult.
   * Does NOT execute any tools or commit side effects.
   */
  process(
    context: CognitivePromptContext,
    options?: CognitiveExecutionOptions
  ): Promise<CognitiveResult>;

  /** Summarizes task outcome for human or audit review */
  summarize(taskSummary: Record<string, unknown>): Promise<string>;

  /** Graceful cleanup */
  shutdown(): Promise<void>;
}
