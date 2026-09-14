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

import { LocalFirstRouterEngine, type RoutedCognitiveResult, type LocalFirstRouterOptions } from './localFirstRouterEngine.js';
import { ModelCapabilityRegistry, defaultModelCapabilityRegistry } from './modelCapabilityRegistry.js';
import { CloudEscalationSanitizer, type SanitizedContextResult } from './cloudEscalationSanitizer.js';
import { StructuredCognitiveValidator } from './structuredCognitiveValidator.js';
import type {
  CognitiveActionProposal,
  ModelCapabilities,
  CognitiveProviderHealthReport,
} from './providerNeutralContracts.js';
import type {
  CognitivePromptContext,
  CognitiveInferenceBudget,
} from './cognitiveTypes.js';

export interface LocalCognitiveFacadeOptions extends LocalFirstRouterOptions {
  readonly capabilityRegistry?: ModelCapabilityRegistry;
}

export class LocalCognitiveRuntimeFacade {
  public readonly router: LocalFirstRouterEngine;
  public readonly capabilityRegistry: ModelCapabilityRegistry;

  constructor(options?: LocalCognitiveFacadeOptions) {
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
  public async propose(
    context: CognitivePromptContext,
    options?: {
      readonly budget?: CognitiveInferenceBudget;
      readonly signal?: AbortSignal;
      readonly isUserStopActive?: () => boolean;
      readonly forceTier?: 'local-slm' | 'cloud-escalation' | 'deterministic-fallback';
      readonly onTierAttempt?: (tier: string) => void;
    }
  ): Promise<RoutedCognitiveResult> {
    return this.router.route(context, options);
  }

  /**
   * Probes health status across all cognitive tiers.
   */
  public async probeAllTiers(): Promise<readonly CognitiveProviderHealthReport[]> {
    const reports: CognitiveProviderHealthReport[] = [];

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
  public listModelCapabilities(): readonly ModelCapabilities[] {
    return this.capabilityRegistry.listModels();
  }

  /**
   * Sanitizes a context prior to any cloud transmission.
   */
  public sanitizeContext(context: CognitivePromptContext): SanitizedContextResult {
    return CloudEscalationSanitizer.sanitize(context);
  }

  /**
   * Validates raw JSON string into a verified proposal.
   */
  public validateRawOutput(
    rawText: string,
    context: {
      readonly tier: 'local-slm' | 'cloud-escalation' | 'deterministic-fallback';
      readonly providerName: string;
      readonly modelName: string;
    }
  ): CognitiveActionProposal {
    return StructuredCognitiveValidator.parseAndValidate(rawText, context);
  }
}

export const globalLocalCognitiveRuntime = new LocalCognitiveRuntimeFacade();
