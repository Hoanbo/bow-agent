import type { ModelCapabilities } from './providerNeutralContracts.js';
export declare class ModelCapabilityRegistry {
    private readonly registry;
    constructor();
    private registerDefaultModels;
    register(capabilities: ModelCapabilities): void;
    get(modelId: string): ModelCapabilities | undefined;
    has(modelId: string): boolean;
    listModels(): readonly ModelCapabilities[];
    listLocalModels(): readonly ModelCapabilities[];
    listCloudModels(): readonly ModelCapabilities[];
    /**
     * Dynamically ingests models discovered from local Ollama endpoint.
     */
    ingestOllamaTags(tagsData: {
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
    }): number;
}
export declare const defaultModelCapabilityRegistry: ModelCapabilityRegistry;
