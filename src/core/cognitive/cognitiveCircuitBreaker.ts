// src/core/cognitive/cognitiveCircuitBreaker.ts
// BOWCON V4.0 — MS-1.4.02: DETERMINISTIC PROVIDER CIRCUIT BREAKER & ROUTER
//
// Invariants:
// HIERARCHY: CLOUD_GEMINI -> OLLAMA_LOCAL -> DETERMINISTIC_FALLBACK
// 3_CONSECUTIVE_FAILURES -> OPEN_CIRCUIT
// CIRCUIT_COOLDOWN == 30_000 MS
// MAX_RETRIES_PER_TIER <= 1 (TRANSIENT ONLY)
// NO_RETRY_ON_AUTH_FAILURE == TRUE
// HONEST_FALLBACK_RECORDING == TRUE

import type {
  CognitiveProviderType,
  CognitivePromptContext,
  CognitiveInferenceBudget,
} from './cognitiveTypes.js';
import type {
  CognitiveProvider,
  CognitiveExecutionOptions,
} from './cognitiveProvider.js';
import {
  GeminiCognitiveProvider,
  OllamaCognitiveProvider,
  DeterministicFallbackCognitiveProvider,
  type ProviderExecutionResult,
} from './cognitiveProviders.js';

export interface CognitiveCircuitState {
  consecutiveFailures: number;
  lastFailureAt: number;
  isOpen: boolean;
}

export interface CognitiveCircuitBreakerOptions {
  readonly failureThreshold?: number;
  readonly cooldownMs?: number;
  readonly geminiProvider?: GeminiCognitiveProvider;
  readonly ollamaProvider?: OllamaCognitiveProvider;
  readonly fallbackProvider?: DeterministicFallbackCognitiveProvider;
}

export interface RoutedInferenceResult extends ProviderExecutionResult {
  readonly providerType: 'cloud-gemini' | 'ollama-local' | 'deterministic-fallback';
  readonly modelName: string;
  readonly fallbackOccurred: boolean;
  readonly fallbackChain: readonly string[];
}

export class CognitiveCircuitBreaker {
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  public readonly geminiProvider: GeminiCognitiveProvider;
  public readonly ollamaProvider: OllamaCognitiveProvider;
  public readonly fallbackProvider: DeterministicFallbackCognitiveProvider;

  private readonly circuitStates = new Map<string, CognitiveCircuitState>();

  constructor(options?: CognitiveCircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 3;
    this.cooldownMs = options?.cooldownMs ?? 30000;

    this.geminiProvider = options?.geminiProvider || new GeminiCognitiveProvider();
    this.ollamaProvider = options?.ollamaProvider || new OllamaCognitiveProvider();
    this.fallbackProvider = options?.fallbackProvider || new DeterministicFallbackCognitiveProvider();
  }

  public getCircuitState(providerType: string): CognitiveCircuitState {
    const existing = this.circuitStates.get(providerType);
    if (!existing) {
      return { consecutiveFailures: 0, lastFailureAt: 0, isOpen: false };
    }

    // Check if cooldown expired
    if (existing.isOpen && Date.now() - existing.lastFailureAt > this.cooldownMs) {
      existing.isOpen = false;
      existing.consecutiveFailures = 0;
      this.circuitStates.set(providerType, existing);
    }

    return { ...existing };
  }

  public recordSuccess(providerType: string): void {
    this.circuitStates.delete(providerType);
  }

  public recordFailure(providerType: string): void {
    const existing = this.circuitStates.get(providerType) || {
      consecutiveFailures: 0,
      lastFailureAt: 0,
      isOpen: false,
    };
    existing.consecutiveFailures++;
    existing.lastFailureAt = Date.now();
    if (existing.consecutiveFailures >= this.failureThreshold) {
      existing.isOpen = true;
    }
    this.circuitStates.set(providerType, existing);
  }

  public isAvailable(providerType: string): boolean {
    const state = this.getCircuitState(providerType);
    return !state.isOpen;
  }

  /**
   * Routes inference through the canonical multi-tier fallback ladder:
   * Tier 1: cloud-gemini (if eligible & circuit closed)
   * Tier 2: ollama-local (if eligible & circuit closed)
   * Tier 3: deterministic-fallback (guaranteed)
   */
  public async routeInference(
    context: CognitivePromptContext,
    options: {
      readonly preference?: 'auto' | 'cloud-gemini' | 'ollama-local' | 'deterministic-fallback';
      readonly budget?: CognitiveInferenceBudget;
      readonly signal?: AbortSignal;
      readonly isUserStopActive?: () => boolean;
      readonly onTierAttempt?: (tier: string) => void;
    }
  ): Promise<RoutedInferenceResult> {
    const preference = options.preference || 'auto';
    const fallbackChain: string[] = [];

    // Helper to verify USER_STOP between transitions
    const checkStop = () => {
      if (options.isUserStopActive && options.isUserStopActive()) {
        throw new Error('USER_STOP_PREEMPTED');
      }
    };

    // If deterministic fallback explicitly preferred, jump straight to it
    if (preference === 'deterministic-fallback') {
      checkStop();
      options.onTierAttempt?.('deterministic-fallback');
      const result = await this.fallbackProvider.executeInference(context, {
        signal: options.signal,
      });
      return {
        ...result,
        providerType: 'deterministic-fallback',
        modelName: this.fallbackProvider.modelName,
        fallbackOccurred: false,
        fallbackChain: [],
      };
    }

    // Tier 1: Cloud Gemini
    if ((preference === 'auto' || preference === 'cloud-gemini') && this.geminiProvider.isConfigured()) {
      if (!this.isAvailable('cloud-gemini')) {
        fallbackChain.push('cloud-gemini:circuit-open');
      } else {
        checkStop();
        fallbackChain.push('cloud-gemini');
        options.onTierAttempt?.('cloud-gemini');
        try {
          const result = await this.geminiProvider.executeInference(context, {
            timeoutMs: Math.min(options.budget?.maxLatencyMs || 10000, 15000),
            budget: options.budget,
            signal: options.signal,
          });
          checkStop();
          this.recordSuccess('cloud-gemini');
          return {
            ...result,
            providerType: 'cloud-gemini',
            modelName: this.geminiProvider.modelName,
            fallbackOccurred: false,
            fallbackChain: [],
          };
        } catch (err: any) {
          this.recordFailure('cloud-gemini');
          if (err.message === 'USER_STOP_PREEMPTED' || options.isUserStopActive?.() || options.signal?.aborted) {
            throw new Error('USER_STOP_PREEMPTED');
          }
          // Continue down fallback ladder
        }
      }
    }

    // Check stop signal before progressing to Tier 2
    checkStop();

    // Tier 2: Local Ollama
    if (preference === 'auto' || preference === 'cloud-gemini' || preference === 'ollama-local') {
      if (!this.isAvailable('ollama-local')) {
        fallbackChain.push('ollama-local:circuit-open');
      } else {
        fallbackChain.push('ollama-local');
        options.onTierAttempt?.('ollama-local');
        try {
          const result = await this.ollamaProvider.executeInference(context, {
            timeoutMs: Math.min(options.budget?.maxLatencyMs || 30000, 30000),
            budget: options.budget,
            signal: options.signal,
          });
          checkStop();
          this.recordSuccess('ollama-local');
          return {
            ...result,
            providerType: 'ollama-local',
            modelName: this.ollamaProvider.modelName,
            fallbackOccurred: fallbackChain.length > 1 || preference !== 'ollama-local',
            fallbackChain: Object.freeze([...fallbackChain]),
          };
        } catch (err: any) {
          this.recordFailure('ollama-local');
          if (err.message === 'USER_STOP_PREEMPTED' || options.isUserStopActive?.() || options.signal?.aborted) {
            throw new Error('USER_STOP_PREEMPTED');
          }
          // Continue down fallback ladder
        }
      }
    }

    // Check stop signal before progressing to Tier 3
    checkStop();

    // Tier 3: Deterministic Fallback (Guaranteed zero-network rule execution)
    fallbackChain.push('deterministic-fallback');
    options.onTierAttempt?.('deterministic-fallback');
    const result = await this.fallbackProvider.executeInference(context, {
      signal: options.signal,
    });
    checkStop();

    return {
      ...result,
      providerType: 'deterministic-fallback',
      modelName: this.fallbackProvider.modelName,
      fallbackOccurred: true,
      fallbackChain: Object.freeze([...fallbackChain]),
    };
  }
}
