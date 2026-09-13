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
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { CognitiveUserStopError, CognitiveBudgetExceededError, CognitiveValidationError, } from './cognitiveTypes.js';
import { CognitiveCircuitBreaker, } from './cognitiveCircuitBreaker.js';
export class CognitiveProviderRuntime {
    circuitBreaker;
    auditLedger;
    sanitizer;
    externalUserStopFn;
    internalUserStop = false;
    maxCumulativeTaskCostUsd;
    taskCostLedger = new Map();
    activeControllers = new Set();
    constructor(options) {
        this.circuitBreaker = new CognitiveCircuitBreaker(options);
        this.auditLedger = options?.auditLedger ?? globalAuditLedger;
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
        this.maxCumulativeTaskCostUsd = options?.maxCumulativeTaskCostUsd ?? 0.5; // $0.50 default task budget cap
        this.externalUserStopFn =
            options?.isUserStopActive ??
                (() => {
                    try {
                        return globalMasterHumanAuthority.isUserStopActive;
                    }
                    catch {
                        return false;
                    }
                });
    }
    setUserStopActive(active) {
        this.internalUserStop = active;
        if (active) {
            for (const ctrl of this.activeControllers) {
                try {
                    ctrl.abort();
                }
                catch { }
            }
        }
    }
    setUserStop(active) {
        this.setUserStopActive(active);
    }
    isUserStopActive() {
        if (this.internalUserStop)
            return true;
        if (this.externalUserStopFn && this.externalUserStopFn())
            return true;
        return false;
    }
    assertUserStopInactive(operation) {
        if (this.isUserStopActive()) {
            throw new CognitiveUserStopError(operation);
        }
    }
    getCircuitBreaker() {
        return this.circuitBreaker;
    }
    getTaskCumulativeCost(taskId) {
        return this.taskCostLedger.get(taskId) || 0.0;
    }
    resetTaskCost(taskId) {
        this.taskCostLedger.delete(taskId);
    }
    /**
     * Calculates canonical SHA-256 cryptographic provenance hash for a cognitive response.
     */
    calculateProvenanceHash(params) {
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
    fingerprintResult(result) {
        return crypto.createHash('sha256').update(JSON.stringify(result), 'utf8').digest('hex');
    }
    /**
     * Master execution entrance for cognitive inference requests.
     */
    async executeInference(request, options) {
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
        const promptLen = (request.promptContext.taskContext?.length || 0) +
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
            throw new CognitiveBudgetExceededError('prompt_tokens', request.budget.maxPromptTokens, estimatedPromptTokens, { taskId, requestId });
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
                throw new CognitiveBudgetExceededError('cumulative_task_cost', this.maxCumulativeTaskCostUsd, currentTaskCost, { taskId });
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
        let routed;
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
        }
        catch (err) {
            if (this.isUserStopActive() || err.message === 'USER_STOP_PREEMPTED' || err instanceof CognitiveUserStopError) {
                this.recordAuditEvent('COGNITIVE_USER_STOP_ABORTED', tenantId, taskId, {
                    requestId,
                    stage: 'in_flight_aborted',
                });
                throw new CognitiveUserStopError('executeInference_in_flight');
            }
            throw err;
        }
        finally {
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
        const response = {
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
    recordAuditEvent(eventType, tenantId, taskId, metadata) {
        const sanitizedMeta = this.sanitizer.sanitize(metadata);
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
            resultHash: metadata.provenanceHash || '',
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
        });
    }
}
export const globalCognitiveProviderRuntime = new CognitiveProviderRuntime();
