// src/llm/hybridLlmRouter.ts
// BOW AGENT V3.4 — HYBRID EDGE-CLOUD SMART FAILOVER ROUTER
//
// Automatically balances and fails over between Google Gemini (Cloud)
// and Local Qwen 2.5 on AMD RX 580 (Vulkan Edge).
// Ensures ZERO single-point-of-failure for the entire ecosystem.
import { isGeminiConfigured } from '../gemini/config.js';
import { localLlmProvider } from './localLlmProvider.js';
import { globalProviderHealth } from './providerHealth.js';
import { globalCircuitBreaker } from './resilience.js';
export * from './providerHealth.js';
export * from './resilience.js';
export class HybridLlmRouter {
    /**
     * Check health and availability of both backends
     */
    getHealthStatus() {
        const cloudHealth = globalProviderHealth.getStatus('cloud_gemini');
        const localHealth = globalProviderHealth.getStatus('local_slm_rx580');
        const breakerCanExecute = globalCircuitBreaker.canExecute();
        const breakerState = globalCircuitBreaker.getState();
        const cloudAvailable = cloudHealth.status !== 'unavailable' && breakerCanExecute;
        const localAvailable = localHealth.status !== 'unavailable';
        let overallStatus = 'degraded';
        if (cloudAvailable && localAvailable) {
            overallStatus = 'operational';
        }
        else if (!cloudAvailable && !localAvailable) {
            overallStatus = 'unavailable';
        }
        return {
            activeBackend: cloudAvailable ? 'cloud_gemini' : 'local_slm_rx580',
            cloudAvailable,
            localAvailable,
            circuitBreakerState: breakerState,
            cloudHealth,
            localHealth,
            preferLocal: false,
            status: overallStatus,
        };
    }
    /**
     * Route user message with bounded timeout, circuit breaker guard, and automatic failover
     */
    async routeMessage(userText, history, functionDeclarations, forceLocal = false) {
        const startTime = Date.now();
        const cloudHealth = globalProviderHealth.getStatus('cloud_gemini');
        const canUseCloud = !forceLocal && isGeminiConfigured() && cloudHealth.status !== 'unavailable' && globalCircuitBreaker.canExecute();
        // 1. If forced local or cloud is not available/breaker tripped, route to Local SLM directly
        if (!canUseCloud) {
            const localStart = Date.now();
            try {
                const localRes = await localLlmProvider.sendMessage(userText, history, functionDeclarations);
                globalProviderHealth.recordSuccess('local_slm_rx580', Date.now() - localStart);
                return {
                    ...localRes,
                    activeBackend: 'local_slm_rx580',
                    latencyMs: Date.now() - startTime,
                    failoverTriggered: !forceLocal,
                };
            }
            catch (err) {
                globalProviderHealth.recordFailure('local_slm_rx580', err?.message || 'LOCAL_EXECUTION_ERROR', Date.now() - localStart);
                throw err;
            }
        }
        // 2. Attempt Cloud Gemini execution with Circuit Breaker and bounded timeout
        try {
            const geminiRes = await globalCircuitBreaker.execute(async () => {
                let timeoutTimer;
                const timeoutPromise = new Promise((_, reject) => {
                    timeoutTimer = setTimeout(() => reject(new Error('GEMINI_TIMEOUT_5000MS')), 5000);
                });
                const executionPromise = (async () => {
                    const { processAgentMessageWithGemini } = await import('../gemini/geminiClient.js');
                    return await processAgentMessageWithGemini(userText, {
                        userId: 'owner',
                        role: 'owner',
                        channel: 'ROBOT',
                        isAuthenticated: true,
                    });
                })();
                try {
                    const res = await Promise.race([executionPromise, timeoutPromise]);
                    if (!res.success || !res.message) {
                        throw new Error(res.error || 'GEMINI_EMPTY_RESPONSE');
                    }
                    return res;
                }
                finally {
                    clearTimeout(timeoutTimer);
                }
            }, async () => {
                return null; // Signals circuit breaker tripped or fallback needed
            });
            if (geminiRes && geminiRes.success && geminiRes.message) {
                const latencyMs = Date.now() - startTime;
                globalProviderHealth.recordSuccess('cloud_gemini', latencyMs);
                return {
                    success: true,
                    text: geminiRes.message.content || '',
                    activeBackend: 'cloud_gemini',
                    latencyMs,
                    failoverTriggered: false,
                    rawResponse: geminiRes,
                };
            }
        }
        catch (err) {
            const latencyMs = Date.now() - startTime;
            globalProviderHealth.recordFailure('cloud_gemini', err?.message || 'GEMINI_FAIL', latencyMs);
        }
        // 3. Cloud failed or timed out -> Fast failover to Local SLM with telemetry
        const localStart = Date.now();
        try {
            const fallbackRes = await localLlmProvider.sendMessage(userText, history, functionDeclarations);
            globalProviderHealth.recordSuccess('local_slm_rx580', Date.now() - localStart);
            return {
                ...fallbackRes,
                activeBackend: 'local_slm_rx580',
                latencyMs: Date.now() - startTime,
                failoverTriggered: true,
            };
        }
        catch (localErr) {
            globalProviderHealth.recordFailure('local_slm_rx580', localErr?.message || 'LOCAL_FAIL', Date.now() - localStart);
            throw localErr;
        }
    }
}
export const hybridLlmRouter = new HybridLlmRouter();
