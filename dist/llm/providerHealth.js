// src/llm/providerHealth.ts
// BOWCON V4.0 — LLM PROVIDER HEALTH MONITOR & ACTIVE PROBER
// Compliant with NIST AI RMF & ISO/IEC 42001
import { CONFIG } from '../config.js';
import { isGeminiConfigured } from '../gemini/config.js';
export class ProviderHealthMonitor {
    geminiHealth = {
        provider: 'cloud_gemini',
        status: 'unavailable',
        lastChecked: new Date().toISOString(),
        latencyMs: 0,
        successRate: 1.0,
        consecutiveFailures: 0,
    };
    localSlmHealth = {
        provider: 'local_slm_rx580',
        status: 'unavailable',
        lastChecked: new Date().toISOString(),
        latencyMs: 0,
        successRate: 1.0,
        consecutiveFailures: 0,
    };
    probeTimeoutMs;
    constructor(probeTimeoutMs = 2000) {
        this.probeTimeoutMs = probeTimeoutMs;
        this.updateStaticHealth();
    }
    /**
     * Quick non-blocking sync check based on current configuration and failure counts
     */
    updateStaticHealth() {
        const geminiConfigured = isGeminiConfigured();
        if (!geminiConfigured) {
            this.geminiHealth.status = 'unavailable';
            this.geminiHealth.lastError = 'API_KEY_NOT_CONFIGURED';
        }
        else if (this.geminiHealth.consecutiveFailures >= 3) {
            this.geminiHealth.status = 'unavailable';
        }
        else if (this.geminiHealth.consecutiveFailures > 0) {
            this.geminiHealth.status = 'degraded';
        }
        else {
            this.geminiHealth.status = 'healthy';
        }
        const localConfigured = Boolean(CONFIG.localLlmUrl);
        if (!localConfigured) {
            this.localSlmHealth.status = 'unavailable';
            this.localSlmHealth.lastError = 'LOCAL_URL_NOT_CONFIGURED';
        }
        else if (this.localSlmHealth.consecutiveFailures >= 3) {
            this.localSlmHealth.status = 'unavailable';
        }
        else if (this.localSlmHealth.consecutiveFailures > 0) {
            this.localSlmHealth.status = 'degraded';
        }
        else {
            this.localSlmHealth.status = 'healthy';
        }
    }
    /**
     * Active probe ping to verify local Ollama / SLM endpoint responsiveness
     */
    async probeLocalEndpoint() {
        const startTime = Date.now();
        const endpoint = `${CONFIG.localLlmUrl.replace(/\/$/, '')}/models`;
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.probeTimeoutMs);
            const res = await fetch(endpoint, {
                method: 'GET',
                signal: controller.signal,
            });
            clearTimeout(timer);
            const latencyMs = Date.now() - startTime;
            if (res.ok) {
                this.recordSuccess('local_slm_rx580', latencyMs);
            }
            else {
                this.recordFailure('local_slm_rx580', `HTTP_${res.status}`, latencyMs);
            }
        }
        catch (err) {
            const latencyMs = Date.now() - startTime;
            this.recordFailure('local_slm_rx580', err.message || 'PROBE_TIMEOUT', latencyMs);
        }
        return this.localSlmHealth;
    }
    /**
     * Record real-time runtime execution feedback from hybrid router
     */
    recordSuccess(provider, latencyMs) {
        const report = provider === 'cloud_gemini' ? this.geminiHealth : this.localSlmHealth;
        report.consecutiveFailures = 0;
        report.latencyMs = latencyMs;
        report.lastChecked = new Date().toISOString();
        report.status = latencyMs > 2000 ? 'degraded' : 'healthy';
        delete report.lastError;
    }
    recordFailure(provider, error, latencyMs = 0) {
        const report = provider === 'cloud_gemini' ? this.geminiHealth : this.localSlmHealth;
        report.consecutiveFailures++;
        report.latencyMs = latencyMs;
        report.lastChecked = new Date().toISOString();
        report.lastError = error;
        if (report.consecutiveFailures >= 3) {
            report.status = 'unavailable';
        }
        else {
            report.status = 'degraded';
        }
    }
    getStatus(provider) {
        this.updateStaticHealth();
        return provider === 'cloud_gemini' ? { ...this.geminiHealth } : { ...this.localSlmHealth };
    }
    getAllStatuses() {
        this.updateStaticHealth();
        return {
            cloud_gemini: { ...this.geminiHealth },
            local_slm_rx580: { ...this.localSlmHealth },
        };
    }
}
export const globalProviderHealth = new ProviderHealthMonitor();
