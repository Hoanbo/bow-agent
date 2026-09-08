import { ContextReconstructor } from './contextReconstructor.js';
import { CognitiveRegistry } from './cognitiveRegistry.js';
import type { CognitiveResult, CognitiveProviderConfig } from './cognitiveTypes.js';
export interface CognitivePipelineRequest {
    readonly input: string;
    readonly requestId?: string;
    readonly sessionId?: string;
    readonly systemContext?: string;
    readonly memoryContext?: string;
    readonly taskContext?: string;
    readonly capabilitiesContext?: string;
    readonly policyConstraints?: string;
}
export declare class CognitivePipeline {
    private readonly registry;
    private readonly contextReconstructor;
    private readonly idempotencyCache;
    constructor(config?: CognitiveProviderConfig);
    getRegistry(): CognitiveRegistry;
    getContextReconstructor(): ContextReconstructor;
    /**
     * Executes the 7-stage cognitive pipeline.
     * Returns a structured CognitiveResult proposal.
     * Does NOT execute any tools directly.
     */
    execute(req: CognitivePipelineRequest): Promise<CognitiveResult>;
}
