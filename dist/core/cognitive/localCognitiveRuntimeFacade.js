// src/core/cognitive/localCognitiveRuntimeFacade.ts
// BOWCON V4.0 — MS-1.5.01: MASTER LOCAL COGNITIVE RUNTIME FAÇADE
// Component 987 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// REASONING != AUTHORIZATION
// LLM_PROPOSE != EXECUTE
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// LOCAL_FIRST_BY_DEFAULT == TRUE
// FAIL_CLOSED_SECURITY == TRUE
import { LocalFirstRouterEngine } from './localFirstRouterEngine.js';
import { defaultModelCapabilityRegistry } from './modelCapabilityRegistry.js';
import { CloudEscalationSanitizer } from './cloudEscalationSanitizer.js';
import { StructuredCognitiveValidator } from './structuredCognitiveValidator.js';
export class LocalCognitiveRuntimeFacade {
    router;
    capabilityRegistry;
    constructor(options) {
        this.router = new LocalFirstRouterEngine(options);
        this.capabilityRegistry = options?.capabilityRegistry || defaultModelCapabilityRegistry;
    }
    /**
     * Proposes a cognitive action based on structured context.
     *
     * CRITICAL SECURITY INVARIANT:
     * The returned CognitiveActionProposal is an UNTRUSTED PROPOSAL.
     * It confers ZERO execution authority.
     * It MUST pass through Policy Decision Point (PDP) and Policy Enforcement Point (PEP)
     * before any system side-effect or tool invocation can take place.
     */
    async propose(context, options) {
        return this.router.route(context, options);
    }
    /**
     * Probes health status across all cognitive tiers.
     */
    async probeAllTiers() {
        const reports = [];
        // 1. Probe Local Ollama
        const localHealth = await this.router.localRuntime.probeHealth();
        reports.push(localHealth);
        // 2. Probe Cloud Gemini
        const geminiHealth = await this.router.geminiProvider.healthCheck();
        reports.push({
            providerName: this.router.geminiProvider.providerName,
            tier: 'cloud-escalation',
            isHealthy: geminiHealth.isAvailable,
            activeModel: this.router.geminiProvider.modelName,
            availableModels: [this.router.geminiProvider.modelName],
            latencyMs: geminiHealth.latencyMs || 0,
            checkedAt: new Date().toISOString(),
            lastError: geminiHealth.error,
        });
        // 3. Probe Deterministic Fallback (Guaranteed available)
        const fallbackHealth = await this.router.fallbackProvider.healthCheck();
        reports.push({
            providerName: this.router.fallbackProvider.providerName,
            tier: 'deterministic-fallback',
            isHealthy: fallbackHealth.isAvailable,
            activeModel: this.router.fallbackProvider.modelName,
            availableModels: [this.router.fallbackProvider.modelName],
            latencyMs: fallbackHealth.latencyMs || 0,
            checkedAt: new Date().toISOString(),
        });
        return Object.freeze(reports);
    }
    /**
     * Lists registered model capabilities.
     */
    listModelCapabilities() {
        return this.capabilityRegistry.listModels();
    }
    /**
     * Sanitizes a context prior to any cloud transmission.
     */
    sanitizeContext(context) {
        return CloudEscalationSanitizer.sanitize(context);
    }
    /**
     * Validates raw JSON string into a verified proposal.
     */
    validateRawOutput(rawText, context) {
        return StructuredCognitiveValidator.parseAndValidate(rawText, context);
    }
}
export const globalLocalCognitiveRuntime = new LocalCognitiveRuntimeFacade();
