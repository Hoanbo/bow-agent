import type { AgentContext, AgentMessage } from './types.js';
export type BrainMode = 'auto' | 'cloud_preferred' | 'local_preferred' | 'local_only' | 'deterministic_only';
export interface BrainProviderStatus {
    cloudGeminiOnline: boolean;
    localOllamaOnline: boolean;
    activeMode: BrainMode;
    lastRoutingDecision: 'cloud_gemini' | 'local_ollama' | 'deterministic_engine';
    totalCloudCalls: number;
    totalLocalCalls: number;
    totalFallbackEvents: number;
}
export declare class HybridModelRouter {
    private mode;
    private localEndpoint;
    private localModel;
    private stats;
    constructor();
    setMode(newMode: BrainMode): void;
    getStatus(): BrainProviderStatus;
    /**
     * Kiểm tra xem máy chủ Ollama / Local Open-Weights có đang hoạt động trên máy không
     */
    checkLocalOllamaHealth(): Promise<boolean>;
    /**
     * Bộ định tuyến thông minh: Quyết định gọi Cloud Gemini, Local Ollama, hay Deterministic Engine
     */
    routeMessage(userText: string, context: AgentContext, cloudCaller: (text: string, ctx: AgentContext) => Promise<AgentMessage>, deterministicCaller: (text: string, ctx: AgentContext) => Promise<AgentMessage>): Promise<AgentMessage>;
    private executeLocalOrDeterministic;
    /**
     * Gọi mô hình Local Open-Weights qua Ollama API
     */
    private callLocalOllama;
}
export declare const globalHybridRouter: HybridModelRouter;
