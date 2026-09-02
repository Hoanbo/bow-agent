import type { LlmResponse, LlmChatMessage } from '../contracts/llmProvider.js';
export interface HybridRoutingResult extends LlmResponse {
    activeBackend: 'cloud_gemini' | 'local_slm_rx580';
    latencyMs: number;
    failoverTriggered: boolean;
}
export declare class HybridLlmRouter {
    /**
     * Check health and availability of both backends
     */
    getHealthStatus(): {
        activeBackend: string;
        cloudAvailable: boolean;
        localAvailable: boolean;
        preferLocal: boolean;
        status: string;
    };
    /**
     * Route user message with automatic smart failover to local engine
     */
    routeMessage(userText: string, history?: LlmChatMessage[], functionDeclarations?: any[], forceLocal?: boolean): Promise<HybridRoutingResult>;
}
export declare const hybridLlmRouter: HybridLlmRouter;
