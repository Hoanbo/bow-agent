// src/core/brain/brainModelProvider.ts
// BOWCON V4.0 — MS-1.3.30 & MS-1.3.32: BRAIN MODEL PROVIDER & COGNITIVE ADAPTER
//
// The BrainModelProvider is the cognitive interface between the Brain
// and LLM / local rule backends. It is NOT an execution authority.
//
// INVARIANTS:
// LLM_PROPOSE != EXECUTE  — Provider outputs are proposals only
// LLM != SECURITY_AUTHORITY — Provider cannot override policy
// LLM != COMMIT_AUTHORITY   — Provider cannot commit results
// PROVIDER != TOOL_REGISTRY — Provider cannot directly invoke tools
// FAILURE != BRAIN_DEATH

import type { BrainModelOutput } from './brainTypes.js';
import {
  CognitivePipeline,
} from '../cognitive/cognitivePipeline.js';
import {
  DeterministicFallbackProvider,
} from '../cognitive/deterministicFallbackProvider.js';
import {
  OllamaProvider,
} from '../cognitive/ollamaProvider.js';
import type {
  CognitiveResult,
} from '../cognitive/cognitiveTypes.js';

export interface BrainModelProvider {
  /** Returns a proposed understanding + plan for the given input. */
  understand(input: string, context?: Record<string, unknown>): Promise<BrainModelOutput>;
  /** Returns a reasoning trace for a given plan + observations. */
  reason(plan: string, observations: string[], context?: Record<string, unknown>): Promise<string>;
  /** Summarizes a completed task result for human-readable output. */
  summarize(taskSummary: Record<string, unknown>): Promise<string>;
  /** Health check — returns true if provider is usable. */
  isAvailable(): Promise<boolean>;
  /** Provider name for observability. */
  readonly providerName: string;
}

/**
 * Adapter converting structured CognitiveResult into BrainModelOutput.
 */
function cognitiveResultToBrainOutput(result: CognitiveResult, originalInput: string): BrainModelOutput {
  const candidate = result.toolCandidates[0];
  const toolName = candidate?.toolName ?? 'brain_echo';
  const toolArgs = candidate?.toolArgs ?? { input: originalInput };

  return {
    understanding: result.interpretation,
    reasoning: result.reasoningSummary,
    proposedToolName: toolName,
    proposedToolArgs: toolArgs,
    planSummary: result.plan.summary,
    confidence: result.confidence.score,
    requiresConfirmation: result.requiresApproval,
  };
}

// ---------------------------------------------------------------------------
// Deterministic Brain Model Provider (MS-1.3.30 & MS-1.3.32)
// ---------------------------------------------------------------------------
export class DeterministicBrainModelProvider implements BrainModelProvider {
  public readonly providerName = 'deterministic';
  private readonly fallback = new DeterministicFallbackProvider();

  public async understand(input: string, context?: Record<string, unknown>): Promise<BrainModelOutput> {
    const res = await this.fallback.process({
      systemContext: 'BOWCON Brain Deterministic Engine',
      userContext: input,
      memoryContext: typeof context?.memory === 'string' ? context.memory : 'None',
      taskContext: 'Understand user input deterministically',
      capabilitiesContext: 'brain_fs_write, brain_fs_read, brain_fs_append, brain_fs_list, brain_fs_delete, brain_echo',
      policyConstraints: 'PDP verification required',
    });
    return cognitiveResultToBrainOutput(res, input);
  }

  public async reason(plan: string, observations: string[], _context?: Record<string, unknown>): Promise<string> {
    const allMet = observations.every(o =>
      o.toLowerCase().includes('met') ||
      o.toLowerCase().includes('pass') ||
      o.toLowerCase().includes('ok') ||
      o.toLowerCase().includes('exists')
    );
    return allMet
      ? `All ${observations.length} observation(s) satisfied. Plan "${plan}" may proceed to commit.`
      : `One or more observations unmet. Recovery may be required.`;
  }

  public async summarize(taskSummary: Record<string, unknown>): Promise<string> {
    return this.fallback.summarize(taskSummary);
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Ollama Local Model Provider (MS-1.3.30 & MS-1.3.32)
// ---------------------------------------------------------------------------
export class OllamaModelProvider implements BrainModelProvider {
  public readonly providerName = 'ollama-local';
  private readonly ollama: OllamaProvider;
  private readonly fallback = new DeterministicBrainModelProvider();

  constructor(endpoint?: string, model?: string) {
    this.ollama = new OllamaProvider({
      baseUrl: endpoint,
      model,
    });
  }

  public async isAvailable(): Promise<boolean> {
    const health = await this.ollama.healthCheck();
    return health.isAvailable;
  }

  public async understand(input: string, context?: Record<string, unknown>): Promise<BrainModelOutput> {
    try {
      const res = await this.ollama.process({
        systemContext: 'You are BOWCON Brain. Propose structured JSON plan.',
        userContext: input,
        memoryContext: typeof context?.memory === 'string' ? context.memory : 'None',
        taskContext: 'Analyze request and propose tool candidate',
        capabilitiesContext: 'brain_fs_write, brain_fs_read, brain_fs_append, brain_fs_list, brain_fs_delete, brain_echo',
        policyConstraints: 'PDP authorization mandatory',
      });
      return cognitiveResultToBrainOutput(res, input);
    } catch {
      // Degrade gracefully to deterministic fallback
      return this.fallback.understand(input, context);
    }
  }

  public async reason(plan: string, observations: string[], context?: Record<string, unknown>): Promise<string> {
    return this.fallback.reason(plan, observations, context);
  }

  public async summarize(taskSummary: Record<string, unknown>): Promise<string> {
    try {
      return await this.ollama.summarize(taskSummary);
    } catch {
      return this.fallback.summarize(taskSummary);
    }
  }
}

// ---------------------------------------------------------------------------
// Real Cognitive Brain Model Provider (MS-1.3.32 Pipeline Bridge)
// ---------------------------------------------------------------------------
export class CognitiveBrainModelProvider implements BrainModelProvider {
  public readonly providerName = 'cognitive-pipeline';
  private readonly pipeline: CognitivePipeline;
  private readonly fallback = new DeterministicBrainModelProvider();

  constructor(preferred: 'deterministic' | 'ollama' | 'auto' = 'auto') {
    this.pipeline = new CognitivePipeline({
      providerPreference: preferred === 'deterministic' ? 'deterministic-fallback' : preferred === 'ollama' ? 'ollama' : 'auto',
    });
  }

  public async understand(input: string, context?: Record<string, unknown>): Promise<BrainModelOutput> {
    const sessionId = typeof context?.sessionId === 'string' ? context.sessionId : undefined;
    const res = await this.pipeline.execute({
      input,
      sessionId,
      memoryContext: typeof context?.memory === 'string' ? context.memory : undefined,
      taskContext: typeof context?.task === 'string' ? context.task : undefined,
    });
    return cognitiveResultToBrainOutput(res, input);
  }

  public async reason(plan: string, observations: string[], context?: Record<string, unknown>): Promise<string> {
    return this.fallback.reason(plan, observations, context);
  }

  public async summarize(taskSummary: Record<string, unknown>): Promise<string> {
    return this.fallback.summarize(taskSummary);
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Provider Factory
// ---------------------------------------------------------------------------
export function createBrainModelProvider(
  preferred: 'deterministic' | 'ollama' | 'auto' = 'auto'
): BrainModelProvider {
  if (preferred === 'deterministic') return new DeterministicBrainModelProvider();
  if (preferred === 'ollama') return new OllamaModelProvider();
  return new CognitiveBrainModelProvider('auto');
}
