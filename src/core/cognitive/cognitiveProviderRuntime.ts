// src/core/cognitive/cognitiveProviderRuntime.ts
// BOWCON V4.0 — MS-1.4.02: MASTER COGNITIVE PROVIDER RUNTIME FAÇADE
//
// Invariants:
// USER_STOP > EVERYTHING
// LLM_OUTPUT == UNTRUSTED_DATA
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// COGNITIVE_RUNTIME != TASK_STATE_MUTATOR
// NO_CREDENTIAL_LEAKAGE == TRUE
// FAIL_CLOSED == TRUE

import crypto from 'node:crypto';
import { globalAuditLedger, type AuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer, type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import {
  type CognitiveInferenceRequest,
  type CognitiveInferenceResponse,
  type CognitiveUsage,
  type CognitiveResult,
  CognitiveUserStopError,
  CognitiveBudgetExceededError,
  CognitiveValidationError,
  CognitiveRuntimeError,
} from './cognitiveTypes.js';
import {
  CognitiveCircuitBreaker,
  type CognitiveCircuitBreakerOptions,
  type RoutedInferenceResult,
} from './cognitiveCircuitBreaker.js';

export interface CognitiveProviderRuntimeOptions extends CognitiveCircuitBreakerOptions {
  readonly auditLedger?: AuditLedger;
  readonly sanitizer?: DiagnosisSanitizer;
  readonly isUserStopActive?: () => boolean;
  readonly maxCumulativeTaskCostUsd?: number;
}

export class CognitiveProviderRuntime {
  private readonly circuitBreaker: CognitiveCircuitBreaker;
  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly externalUserStopFn?: () => boolean;
  private internalUserStop = false;

  private readonly maxCumulativeTaskCostUsd: number;
  private readonly taskCostLedger = new Map<string, number>();

  private readonly activeControllers = new Set<AbortController>();

  constructor(options?: CognitiveProviderRuntimeOptions) {
    this.circuitBreaker = new CognitiveCircuitBreaker(options);
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.maxCumulativeTaskCostUsd = options?.maxCumulativeTaskCostUsd ?? 0.5; // $0.50 default task budget cap

    this.externalUserStopFn =
      options?.isUserStopActive ??
      (() => {
        try {
          return globalMasterHumanAuthority.isUserStopActive;
        } catch {
          return false;
        }
      });
  }

  public setUserStopActive(active: boolean): void {
    this.internalUserStop = active;
    if (active) {
      for (const ctrl of this.activeControllers) {
        try {
          ctrl.abort();
        } catch {}
      }
    }
  }

  public setUserStop(active: boolean): void {
    this.setUserStopActive(active);
  }

  public isUserStopActive(): boolean {
    if (this.internalUserStop) return true;
    if (this.externalUserStopFn && this.externalUserStopFn()) return true;
    return false;
  }

  public assertUserStopInactive(operation: string): void {
    if (this.isUserStopActive()) {
      throw new CognitiveUserStopError(operation);
    }
  }

  public getCircuitBreaker(): CognitiveCircuitBreaker {
    return this.circuitBreaker;
  }

  public getTaskCumulativeCost(taskId: string): number {
    return this.taskCostLedger.get(taskId) || 0.0;
  }

  public resetTaskCost(taskId: string): void {
    this.taskCostLedger.delete(taskId);
  }

  /**
   * Calculates canonical SHA-256 cryptographic provenance hash for a cognitive response.
   */
  public calculateProvenanceHash(params: {
    requestId: string;
    tenantId: string;
    providerType: string;
    modelName: string;
    timestamp: string;
    resultFingerprint: string;
  }): string {
    const canonicalStr = [
      params.requestId,
      params.tenantId,
      params.providerType,
      params.modelName,
      params.timestamp,
      params.resultFingerprint,
    ].join(':');

    return crypto.createHash('sha256').update(canonicalStr, 'utf8').digest('hex');
  }

  /**
   * Generates a deterministic fingerprint of a CognitiveResult object.
   */
  public fingerprintResult(result: CognitiveResult): string {
    return crypto.createHash('sha256').update(JSON.stringify(result), 'utf8').digest('hex');
  }

  /**
   * Master execution entrance for cognitive inference requests.
   */
  public async executeInference(
    request: CognitiveInferenceRequest,
    options?: { readonly signal?: AbortSignal }
  ): Promise<CognitiveInferenceResponse> {
    const nowIso = new Date().toISOString();
    const requestId = request.requestId;
    const tenantId = request.tenantId;
    const taskId = request.taskId;

    // 1. Validate request structure
    if (!request.tenantId?.trim()) {
      throw new CognitiveValidationError('tenantId is required');
    }
    if (!request.promptContext) {
      throw new CognitiveValidationError('promptContext is required');
    }
    if (!request.budget) {
      throw new CognitiveValidationError('budget specification is required');
    }

    // 2. Pre-execution USER_STOP gate
    if (this.isUserStopActive()) {
      this.recordAuditEvent('COGNITIVE_USER_STOP_ABORTED', tenantId, taskId, {
        requestId,
        stage: 'pre_execution_check',
      });
      throw new CognitiveUserStopError('executeInference_precheck');
    }

    // 3a. Check prompt token budget
    const promptLen =
      (request.promptContext.taskContext?.length || 0) +
      (request.promptContext.userContext?.length || 0) +
      (request.promptContext.systemPrompt?.length || 0);
    const estimatedPromptTokens = Math.ceil(promptLen / 4);
    if (estimatedPromptTokens > request.budget.maxPromptTokens) {
      this.recordAuditEvent('COGNITIVE_BUDGET_EXCEEDED', tenantId, taskId, {
        requestId,
        budgetType: 'prompt_tokens',
        limit: request.budget.maxPromptTokens,
        actual: estimatedPromptTokens,
      });
      throw new CognitiveBudgetExceededError(
        'prompt_tokens',
        request.budget.maxPromptTokens,
        estimatedPromptTokens,
        { taskId, requestId }
      );
    }

    // 3b. Check cumulative task cost budget
    if (taskId) {
      const currentTaskCost = this.getTaskCumulativeCost(taskId);
      if (currentTaskCost >= this.maxCumulativeTaskCostUsd) {
        this.recordAuditEvent('COGNITIVE_BUDGET_EXCEEDED', tenantId, taskId, {
          requestId,
          budgetType: 'cumulative_task_cost',
          limit: this.maxCumulativeTaskCostUsd,
          actual: currentTaskCost,
        });
        throw new CognitiveBudgetExceededError(
          'cumulative_task_cost',
          this.maxCumulativeTaskCostUsd,
          currentTaskCost,
          { taskId }
        );
      }
    }

    // 4. Setup cancellation controller combined with caller signal
    const internalAbort = new AbortController();
    this.activeControllers.add(internalAbort);
    if (options?.signal) {
      options.signal.addEventListener('abort', () => internalAbort.abort(), { once: true });
    }

    const stopMonitor = setInterval(() => {
      if (this.isUserStopActive()) {
        internalAbort.abort();
      }
    }, 10);

    let routed: RoutedInferenceResult;
    try {
      routed = await this.circuitBreaker.routeInference(request.promptContext, {
        preference: request.providerPreference,
        budget: request.budget,
        signal: internalAbort.signal,
        isUserStopActive: () => this.isUserStopActive(),
        onTierAttempt: (tier) => {
          if (this.isUserStopActive()) {
            internalAbort.abort();
            throw new CognitiveUserStopError(`route_attempt_${tier}`);
          }
        },
      });
    } catch (err: any) {
      if (this.isUserStopActive() || err.message === 'USER_STOP_PREEMPTED' || err instanceof CognitiveUserStopError) {
        this.recordAuditEvent('COGNITIVE_USER_STOP_ABORTED', tenantId, taskId, {
          requestId,
          stage: 'in_flight_aborted',
        });
        throw new CognitiveUserStopError('executeInference_in_flight');
      }
      throw err;
    } finally {
      clearInterval(stopMonitor);
      this.activeControllers.delete(internalAbort);
    }

    // 5. Post-execution USER_STOP re-verification
    if (this.isUserStopActive()) {
      this.recordAuditEvent('COGNITIVE_USER_STOP_ABORTED', tenantId, taskId, {
        requestId,
        stage: 'post_execution_discard',
      });
      throw new CognitiveUserStopError('executeInference_postcheck');
    }

    // 6. Track cumulative cost
    if (taskId) {
      const prevCost = this.getTaskCumulativeCost(taskId);
      this.taskCostLedger.set(taskId, Number((prevCost + routed.usage.estimatedCostUsd).toFixed(6)));
    }

    // 7. Calculate cryptographic SHA-256 provenance
    const resultFingerprint = this.fingerprintResult(routed.cognitiveResult);
    const provenanceHash = this.calculateProvenanceHash({
      requestId,
      tenantId,
      providerType: routed.providerType,
      modelName: routed.modelName,
      timestamp: nowIso,
      resultFingerprint,
    });

    const response: CognitiveInferenceResponse = {
      requestId,
      taskId,
      tenantId,
      providerType: routed.providerType,
      modelName: routed.modelName,
      cognitiveResult: routed.cognitiveResult,
      usage: routed.usage,
      fallbackOccurred: routed.fallbackOccurred,
      fallbackChain: routed.fallbackChain,
      provenanceHash,
      timestamp: nowIso,
    };

    // 8. Record audit events
    if (routed.fallbackOccurred) {
      this.recordAuditEvent('COGNITIVE_FALLBACK_TRIGGERED', tenantId, taskId, {
        requestId,
        targetProvider: routed.providerType,
        fallbackChain: routed.fallbackChain,
      });
    }

    this.recordAuditEvent('COGNITIVE_INFERENCE_COMPLETED', tenantId, taskId, {
      requestId,
      providerType: response.providerType,
      modelName: response.modelName,
      usage: response.usage,
      fallbackOccurred: response.fallbackOccurred,
      provenanceHash: response.provenanceHash,
    });

    return Object.freeze(response);
  }

  private recordAuditEvent(
    eventType: string,
    tenantId: string,
    taskId: string | undefined,
    metadata: Record<string, unknown>
  ): void {
    const sanitizedMeta = this.sanitizer.sanitize(metadata) as Record<string, unknown>;
    this.auditLedger.record({
      timestamp: new Date().toISOString(),
      eventType,
      action: eventType,
      domain: 'agent_cognitive_runtime',
      toolName: 'cognitive_inference',
      classification: 'OBSERVE',
      argumentsHash: '',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      resultHash: (metadata.provenanceHash as string) || '',
      actor: {
        userId: 'system',
        role: 'SYSTEM',
        channel: 'COGNITIVE_RUNTIME',
      },
      tenantId,
      metadata: {
        ...sanitizedMeta,
        taskId,
      },
    } as any);
  }
}

export const globalCognitiveProviderRuntime = new CognitiveProviderRuntime();
