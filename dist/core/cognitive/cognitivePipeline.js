// src/core/cognitive/cognitivePipeline.ts
// BOWCON V4.0 — MS-1.3.32: COMPLETE COGNITIVE RUNTIME PIPELINE
//
// Invariants:
// COGNITIVE_PIPELINE != EXECUTION_AUTHORITY
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// HIGH_CONFIDENCE != EXECUTION_AUTHORITY
// ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// FAILURE != BRAIN_DEATH
import { PromptBuilder } from './promptBuilder.js';
import { ContextReconstructor } from './contextReconstructor.js';
import { IntentClassifier } from './intentClassifier.js';
import { CognitiveRegistry } from './cognitiveRegistry.js';
import { makeCognitiveRequestId, } from './cognitiveTypes.js';
import { CognitiveError, classifyCognitiveError, } from './cognitiveFailure.js';
export class CognitivePipeline {
    registry;
    contextReconstructor;
    idempotencyCache = new Map();
    constructor(config) {
        this.registry = new CognitiveRegistry(config);
        this.contextReconstructor = new ContextReconstructor();
    }
    getRegistry() {
        return this.registry;
    }
    getContextReconstructor() {
        return this.contextReconstructor;
    }
    /**
     * Executes the 7-stage cognitive pipeline.
     * Returns a structured CognitiveResult proposal.
     * Does NOT execute any tools directly.
     */
    async execute(req) {
        const startedAt = Date.now();
        const requestId = req.requestId || makeCognitiveRequestId();
        const sessionId = req.sessionId || 'default_session';
        // 1. IDEMPOTENCY CHECK
        const cached = this.idempotencyCache.get(requestId);
        if (cached) {
            return cached;
        }
        const stages = [];
        // 2. INPUT NORMALIZATION
        const normStart = Date.now();
        const rawInput = req.input || '';
        const sanitizedInput = PromptBuilder.sanitizeText(rawInput);
        stages.push({
            stage: 'input_normalization',
            startedAt: normStart,
            completedAt: Date.now(),
            durationMs: Date.now() - normStart,
        });
        // 3. CONTEXT RECONSTRUCTION (Multi-turn pronoun & entity resolution)
        const reconStart = Date.now();
        const resolution = this.contextReconstructor.resolveContext(sessionId, sanitizedInput);
        const resolvedInput = resolution.resolvedInput;
        stages.push({
            stage: 'context_reconstruction',
            startedAt: reconStart,
            completedAt: Date.now(),
            durationMs: Date.now() - reconStart,
            metadata: {
                isReferential: resolution.isReferential,
                referencedEntity: resolution.referencedEntity,
            },
        });
        // 4. INTENT UNDERSTANDING
        const intentStart = Date.now();
        const classification = IntentClassifier.classify(resolvedInput);
        stages.push({
            stage: 'intent_understanding',
            startedAt: intentStart,
            completedAt: Date.now(),
            durationMs: Date.now() - intentStart,
            metadata: {
                intent: classification.intent,
                confidence: classification.confidence,
            },
        });
        // 5. PROMPT & CONTEXT CONSTRUCTION
        const promptStart = Date.now();
        const sessionState = this.contextReconstructor.getOrCreateSession(sessionId);
        const promptContext = {
            systemContext: req.systemContext || 'You are BOWCON Brain, an authoritative local cognitive intelligence.',
            userContext: resolvedInput,
            memoryContext: req.memoryContext || 'None.',
            taskContext: req.taskContext || `Intent: ${classification.intent}; Capability: ${classification.recommendedCapability}`,
            capabilitiesContext: req.capabilitiesContext || 'brain_fs_write, brain_fs_read, brain_fs_append, brain_fs_list, brain_fs_delete, brain_echo',
            policyConstraints: req.policyConstraints || 'All mutations require PDP verification. Never execute directly.',
            previousTurns: sessionState.turns,
        };
        stages.push({
            stage: 'prompt_construction',
            startedAt: promptStart,
            completedAt: Date.now(),
            durationMs: Date.now() - promptStart,
        });
        // 6. COGNITIVE PROVIDER SELECTION & INVOCATION
        const provStart = Date.now();
        const selection = await this.registry.selectActiveProvider();
        let cognitiveResult;
        try {
            cognitiveResult = await selection.provider.process(promptContext, {
                sessionId,
                correlationId: requestId,
            });
            this.registry.recordProviderSuccess(selection.providerType);
            stages.push({
                stage: 'provider_execution',
                startedAt: provStart,
                completedAt: Date.now(),
                durationMs: Date.now() - provStart,
                metadata: {
                    providerType: selection.providerType,
                    isFallback: selection.isFallback,
                },
            });
        }
        catch (err) {
            // PROVIDER FAILURE RECOVERY: FAILURE != BRAIN_DEATH
            this.registry.recordProviderFailure(selection.providerType);
            const provErrCode = classifyCognitiveError(err);
            stages.push({
                stage: 'provider_execution_failed',
                startedAt: provStart,
                completedAt: Date.now(),
                durationMs: Date.now() - provStart,
                metadata: {
                    error: err instanceof Error ? err.message : String(err),
                    code: provErrCode,
                },
            });
            // Fallback to deterministic provider
            const fallbackProvider = this.registry.getProvider('deterministic-fallback');
            if (!fallbackProvider) {
                throw new CognitiveError('PROVIDER_INTERNAL_ERROR', 'No deterministic fallback provider registered.');
            }
            cognitiveResult = await fallbackProvider.process(promptContext, {
                sessionId,
                correlationId: requestId,
            });
        }
        // 7. GOVERNANCE BOUNDARY CHECK (CONFIDENCE != AUTHORIZATION)
        // Enforce that even if confidence score is 1.0, high-risk actions require approval
        const isDangerous = cognitiveResult.riskLevel === 'HIGH' ||
            cognitiveResult.riskLevel === 'CRITICAL' ||
            resolvedInput.toLowerCase().includes('delete') ||
            resolvedInput.toLowerCase().includes('destroy');
        const finalResult = {
            ...cognitiveResult,
            requestId,
            requiresApproval: cognitiveResult.requiresApproval || isDangerous,
            decision: {
                ...cognitiveResult.decision,
                requiresApproval: cognitiveResult.decision.requiresApproval || isDangerous,
                executionEligibility: cognitiveResult.decision.executionEligibility &&
                    cognitiveResult.confidence.meetsExecutionThreshold,
            },
        };
        // 8. DURABLE CONTEXT UPDATE
        const candidateTool = finalResult.toolCandidates[0];
        const candidateTarget = typeof candidateTool?.toolArgs?.path === 'string'
            ? candidateTool.toolArgs.path
            : resolution.referencedEntity || classification.targetEntity;
        this.contextReconstructor.recordTurn(sessionId, {
            role: 'user',
            content: sanitizedInput,
            timestamp: new Date().toISOString(),
            targetEntity: candidateTarget,
        }, {
            targetFile: candidateTarget,
            toolName: candidateTool?.toolName,
            action: candidateTool?.intent,
        });
        // 9. IDEMPOTENT CACHING
        this.idempotencyCache.set(requestId, finalResult);
        return finalResult;
    }
}
