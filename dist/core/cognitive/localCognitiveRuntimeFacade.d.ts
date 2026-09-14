import { LocalFirstRouterEngine, type RoutedCognitiveResult, type LocalFirstRouterOptions } from './localFirstRouterEngine.js';
import { ModelCapabilityRegistry } from './modelCapabilityRegistry.js';
import { type SanitizedContextResult } from './cloudEscalationSanitizer.js';
import type { CognitiveActionProposal, ModelCapabilities, CognitiveProviderHealthReport } from './providerNeutralContracts.js';
import type { CognitivePromptContext, CognitiveInferenceBudget } from './cognitiveTypes.js';
export interface LocalCognitiveFacadeOptions extends LocalFirstRouterOptions {
    readonly capabilityRegistry?: ModelCapabilityRegistry;
}
export declare class LocalCognitiveRuntimeFacade {
    readonly router: LocalFirstRouterEngine;
    readonly capabilityRegistry: ModelCapabilityRegistry;
    constructor(options?: LocalCognitiveFacadeOptions);
    /**
     * Proposes a cognitive action based on structured context.
     *
     * CRITICAL SECURITY INVARIANT:
     * The returned CognitiveActionProposal is an UNTRUSTED PROPOSAL.
     * It confers ZERO execution authority.
     * It MUST pass through Policy Decision Point (PDP) and Policy Enforcement Point (PEP)
     * before any system side-effect or tool invocation can take place.
     */
    propose(context: CognitivePromptContext, options?: {
        readonly budget?: CognitiveInferenceBudget;
        readonly signal?: AbortSignal;
        readonly isUserStopActive?: () => boolean;
        readonly forceTier?: 'local-slm' | 'cloud-escalation' | 'deterministic-fallback';
        readonly onTierAttempt?: (tier: string) => void;
    }): Promise<RoutedCognitiveResult>;
    /**
     * Probes health status across all cognitive tiers.
     */
    probeAllTiers(): Promise<readonly CognitiveProviderHealthReport[]>;
    /**
     * Lists registered model capabilities.
     */
    listModelCapabilities(): readonly ModelCapabilities[];
    /**
     * Sanitizes a context prior to any cloud transmission.
     */
    sanitizeContext(context: CognitivePromptContext): SanitizedContextResult;
    /**
     * Validates raw JSON string into a verified proposal.
     */
    validateRawOutput(rawText: string, context: {
        readonly tier: 'local-slm' | 'cloud-escalation' | 'deterministic-fallback';
        readonly providerName: string;
        readonly modelName: string;
    }): CognitiveActionProposal;
}
export declare const globalLocalCognitiveRuntime: LocalCognitiveRuntimeFacade;
