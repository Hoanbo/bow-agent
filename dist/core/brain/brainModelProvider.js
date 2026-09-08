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
import { CognitivePipeline, } from '../cognitive/cognitivePipeline.js';
import { DeterministicFallbackProvider, } from '../cognitive/deterministicFallbackProvider.js';
import { OllamaProvider, } from '../cognitive/ollamaProvider.js';
/**
 * Adapter converting structured CognitiveResult into BrainModelOutput.
 */
function cognitiveResultToBrainOutput(result, originalInput) {
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
export class DeterministicBrainModelProvider {
    providerName = 'deterministic';
    fallback = new DeterministicFallbackProvider();
    async understand(input, context) {
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
    async reason(plan, observations, _context) {
        const allMet = observations.every(o => o.toLowerCase().includes('met') ||
            o.toLowerCase().includes('pass') ||
            o.toLowerCase().includes('ok') ||
            o.toLowerCase().includes('exists'));
        return allMet
            ? `All ${observations.length} observation(s) satisfied. Plan "${plan}" may proceed to commit.`
            : `One or more observations unmet. Recovery may be required.`;
    }
    async summarize(taskSummary) {
        return this.fallback.summarize(taskSummary);
    }
    async isAvailable() {
        return true;
    }
}
// ---------------------------------------------------------------------------
// Ollama Local Model Provider (MS-1.3.30 & MS-1.3.32)
// ---------------------------------------------------------------------------
export class OllamaModelProvider {
    providerName = 'ollama-local';
    ollama;
    fallback = new DeterministicBrainModelProvider();
    constructor(endpoint, model) {
        this.ollama = new OllamaProvider({
            baseUrl: endpoint,
            model,
        });
    }
    async isAvailable() {
        const health = await this.ollama.healthCheck();
        return health.isAvailable;
    }
    async understand(input, context) {
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
        }
        catch {
            // Degrade gracefully to deterministic fallback
            return this.fallback.understand(input, context);
        }
    }
    async reason(plan, observations, context) {
        return this.fallback.reason(plan, observations, context);
    }
    async summarize(taskSummary) {
        try {
            return await this.ollama.summarize(taskSummary);
        }
        catch {
            return this.fallback.summarize(taskSummary);
        }
    }
}
// ---------------------------------------------------------------------------
// Real Cognitive Brain Model Provider (MS-1.3.32 Pipeline Bridge)
// ---------------------------------------------------------------------------
export class CognitiveBrainModelProvider {
    providerName = 'cognitive-pipeline';
    pipeline;
    fallback = new DeterministicBrainModelProvider();
    constructor(preferred = 'auto') {
        this.pipeline = new CognitivePipeline({
            providerPreference: preferred === 'deterministic' ? 'deterministic-fallback' : preferred === 'ollama' ? 'ollama' : 'auto',
        });
    }
    async understand(input, context) {
        const sessionId = typeof context?.sessionId === 'string' ? context.sessionId : undefined;
        const res = await this.pipeline.execute({
            input,
            sessionId,
            memoryContext: typeof context?.memory === 'string' ? context.memory : undefined,
            taskContext: typeof context?.task === 'string' ? context.task : undefined,
        });
        return cognitiveResultToBrainOutput(res, input);
    }
    async reason(plan, observations, context) {
        return this.fallback.reason(plan, observations, context);
    }
    async summarize(taskSummary) {
        return this.fallback.summarize(taskSummary);
    }
    async isAvailable() {
        return true;
    }
}
// ---------------------------------------------------------------------------
// Provider Factory
// ---------------------------------------------------------------------------
export function createBrainModelProvider(preferred = 'auto') {
    if (preferred === 'deterministic')
        return new DeterministicBrainModelProvider();
    if (preferred === 'ollama')
        return new OllamaModelProvider();
    return new CognitiveBrainModelProvider('auto');
}
