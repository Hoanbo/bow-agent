// src/llm/hybridLlmRouter.ts
// BOW AGENT V3.4 — HYBRID EDGE-CLOUD SMART FAILOVER ROUTER
//
// Automatically balances and fails over between Google Gemini (Cloud)
// and Local Qwen 2.5 on AMD RX 580 (Vulkan Edge).
// Ensures ZERO single-point-of-failure for the entire ecosystem.
import { isGeminiConfigured } from '../gemini/config.js';
import { localLlmProvider } from './localLlmProvider.js';
export class HybridLlmRouter {
    /**
     * Check health and availability of both backends
     */
    getHealthStatus() {
        const cloudAvailable = isGeminiConfigured();
        const localAvailable = localLlmProvider.isConfigured();
        return {
            activeBackend: cloudAvailable ? 'cloud_gemini' : 'local_slm_rx580',
            cloudAvailable,
            localAvailable,
            preferLocal: false, // Default to Cloud when available, failover to Local
            status: 'operational',
        };
    }
    /**
     * Route user message with automatic smart failover to local engine
     */
    async routeMessage(userText, history, functionDeclarations, forceLocal = false) {
        const startTime = Date.now();
        // 1. If forced local or Gemini is not configured, execute via Local SLM immediately
        if (forceLocal || !isGeminiConfigured()) {
            const localRes = await localLlmProvider.sendMessage(userText, history, functionDeclarations);
            return {
                ...localRes,
                activeBackend: 'local_slm_rx580',
                latencyMs: Date.now() - startTime,
                failoverTriggered: !forceLocal,
            };
        }
        // 2. Attempt Cloud Gemini execution with failover guard
        try {
            const { processAgentMessageWithGemini } = await import('../gemini/geminiClient.js');
            const geminiRes = await processAgentMessageWithGemini(userText, {
                userId: 'owner',
                role: 'owner',
                channel: 'ROBOT',
                isAuthenticated: true,
            });
            return {
                success: geminiRes.success,
                text: geminiRes.message?.content || '',
                activeBackend: 'cloud_gemini',
                latencyMs: Date.now() - startTime,
                failoverTriggered: false,
                rawResponse: geminiRes,
            };
        }
        catch {
            // 3. Cloud failed (network loss, API limit, DNS timeout) -> Seamless 0ms Failover to Local SLM!
            const fallbackRes = await localLlmProvider.sendMessage(userText, history, functionDeclarations);
            return {
                ...fallbackRes,
                activeBackend: 'local_slm_rx580',
                latencyMs: Date.now() - startTime,
                failoverTriggered: true,
            };
        }
    }
}
export const hybridLlmRouter = new HybridLlmRouter();
