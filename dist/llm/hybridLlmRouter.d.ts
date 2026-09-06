import type { LlmResponse, LlmChatMessage } from '../contracts/llmProvider.js';
export * from './providerHealth.js';
export * from './resilience.js';
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
        circuitBreakerState: import("./resilience.js").CircuitState;
        cloudHealth: import("./providerHealth.js").ProviderHealthReport;
        localHealth: import("./providerHealth.js").ProviderHealthReport;
        preferLocal: boolean;
        status: "degraded" | "unavailable" | "operational";
    };
    /**
     * Route user message with bounded timeout, circuit breaker guard, and automatic failover
     */
    routeMessage(userText: string, history?: LlmChatMessage[], functionDeclarations?: any[], forceLocal?: boolean): Promise<HybridRoutingResult>;
}
export declare const hybridLlmRouter: HybridLlmRouter;
