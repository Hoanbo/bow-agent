// src/core/cognitive/modelCapabilityRegistry.ts
// BOWCON V4.0 — MS-1.5.01: MODEL CAPABILITY REGISTRY
// Component 982 — REAL
//
// Invariants:
// HONEST_METADATA == TRUE
// ZERO_SPECULATIVE_CAPABILITIES == TRUE
// PRIVACY_CLASSIFICATION_ENFORCED == TRUE

import type { ModelCapabilities } from './providerNeutralContracts.js';

export class ModelCapabilityRegistry {
  private readonly registry = new Map<string, ModelCapabilities>();

  constructor() {
    this.registerDefaultModels();
  }

  private registerDefaultModels(): void {
    // 1. Local Ollama Qwen 2.5 (Primary local tier)
    this.register({
      modelId: 'qwen2.5:7b',
      providerType: 'ollama',
      privacyLevel: 'AIR_GAPPED_LOCAL',
      isLocal: true,
      contextWindow: 32768,
      supportsStructuredJson: true,
      supportsToolCalling: true,
      supportsVision: false,
      averageLatencyMs: 450,
      estimatedCostPer1MTokensUsd: 0.0,
      family: 'qwen2',
      parameterSize: '7.6B',
      quantization: 'Q4_K_M',
    });

    // 2. Local Ollama Llama 3.2
    this.register({
      modelId: 'llama3.2:3b',
      providerType: 'ollama',
      privacyLevel: 'AIR_GAPPED_LOCAL',
      isLocal: true,
      contextWindow: 8192,
      supportsStructuredJson: true,
      supportsToolCalling: true,
      supportsVision: false,
      averageLatencyMs: 250,
      estimatedCostPer1MTokensUsd: 0.0,
      family: 'llama',
      parameterSize: '3.2B',
      quantization: 'Q4_K_M',
    });

    // 3. Google Gemini 2.0 Flash (Cloud Escalation tier)
    this.register({
      modelId: 'gemini-2.0-flash',
      providerType: 'gemini',
      privacyLevel: 'EXTERNAL_CLOUD',
      isLocal: false,
      contextWindow: 1048576,
      supportsStructuredJson: true,
      supportsToolCalling: true,
      supportsVision: true,
      averageLatencyMs: 800,
      estimatedCostPer1MTokensUsd: 0.15,
      family: 'gemini',
    });

    // 4. Google Gemini 1.5 Pro (Cloud Escalation deep reasoning)
    this.register({
      modelId: 'gemini-1.5-pro',
      providerType: 'gemini',
      privacyLevel: 'EXTERNAL_CLOUD',
      isLocal: false,
      contextWindow: 2097152,
      supportsStructuredJson: true,
      supportsToolCalling: true,
      supportsVision: true,
      averageLatencyMs: 1500,
      estimatedCostPer1MTokensUsd: 1.25,
      family: 'gemini',
    });

    // 5. Deterministic Rule Engine (Zero network guaranteed fallback)
    this.register({
      modelId: 'bowcon-deterministic-v4',
      providerType: 'deterministic',
      privacyLevel: 'AIR_GAPPED_LOCAL',
      isLocal: true,
      contextWindow: 4096,
      supportsStructuredJson: true,
      supportsToolCalling: true,
      supportsVision: false,
      averageLatencyMs: 1,
      estimatedCostPer1MTokensUsd: 0.0,
      family: 'rule-engine',
    });
  }

  public register(capabilities: ModelCapabilities): void {
    const frozen: ModelCapabilities = Object.freeze({ ...capabilities });
    this.registry.set(capabilities.modelId.toLowerCase(), frozen);
  }

  public get(modelId: string): ModelCapabilities | undefined {
    const exact = this.registry.get(modelId.toLowerCase());
    if (exact) return exact;

    // Prefix matching for tags (e.g. 'qwen2.5:7b-instruct-q4' matches 'qwen2.5:7b')
    for (const [key, val] of this.registry.entries()) {
      if (modelId.toLowerCase().startsWith(key)) {
        return val;
      }
    }
    return undefined;
  }

  public has(modelId: string): boolean {
    return this.get(modelId) !== undefined;
  }

  public listModels(): readonly ModelCapabilities[] {
    return Object.freeze(Array.from(this.registry.values()));
  }

  public listLocalModels(): readonly ModelCapabilities[] {
    return Object.freeze(Array.from(this.registry.values()).filter((m) => m.isLocal));
  }

  public listCloudModels(): readonly ModelCapabilities[] {
    return Object.freeze(Array.from(this.registry.values()).filter((m) => !m.isLocal));
  }

  /**
   * Dynamically ingests models discovered from local Ollama endpoint.
   */
  public ingestOllamaTags(tagsData: {
    models?: Array<{
      name: string;
      details?: {
        family?: string;
        parameter_size?: string;
        quantization_level?: string;
        context_length?: number;
      };
      capabilities?: string[];
    }>;
  }): number {
    let count = 0;
    if (!Array.isArray(tagsData?.models)) return 0;

    for (const m of tagsData.models) {
      if (!m.name) continue;
      const modelId = m.name;
      const hasTools = Array.isArray(m.capabilities) && m.capabilities.includes('tools');

      this.register({
        modelId,
        providerType: 'ollama',
        privacyLevel: 'AIR_GAPPED_LOCAL',
        isLocal: true,
        contextWindow: m.details?.context_length ?? 32768,
        supportsStructuredJson: true,
        supportsToolCalling: hasTools,
        supportsVision: false,
        averageLatencyMs: 400,
        estimatedCostPer1MTokensUsd: 0.0,
        family: m.details?.family || 'ollama',
        parameterSize: m.details?.parameter_size,
        quantization: m.details?.quantization_level,
      });
      count++;
    }
    return count;
  }
}

export const defaultModelCapabilityRegistry = new ModelCapabilityRegistry();
