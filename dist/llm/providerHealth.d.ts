export type ProviderStatus = 'healthy' | 'degraded' | 'unavailable';
export interface ProviderHealthReport {
    provider: 'cloud_gemini' | 'local_slm_rx580';
    status: ProviderStatus;
    lastChecked: string;
    latencyMs: number;
    successRate: number;
    consecutiveFailures: number;
    lastError?: string;
}
export declare class ProviderHealthMonitor {
    private geminiHealth;
    private localSlmHealth;
    private probeTimeoutMs;
    constructor(probeTimeoutMs?: number);
    /**
     * Quick non-blocking sync check based on current configuration and failure counts
     */
    updateStaticHealth(): void;
    /**
     * Active probe ping to verify local Ollama / SLM endpoint responsiveness
     */
    probeLocalEndpoint(): Promise<ProviderHealthReport>;
    /**
     * Record real-time runtime execution feedback from hybrid router
     */
    recordSuccess(provider: 'cloud_gemini' | 'local_slm_rx580', latencyMs: number): void;
    recordFailure(provider: 'cloud_gemini' | 'local_slm_rx580', error: string, latencyMs?: number): void;
    getStatus(provider: 'cloud_gemini' | 'local_slm_rx580'): ProviderHealthReport;
    getAllStatuses(): {
        cloud_gemini: ProviderHealthReport;
        local_slm_rx580: ProviderHealthReport;
    };
}
export declare const globalProviderHealth: ProviderHealthMonitor;
