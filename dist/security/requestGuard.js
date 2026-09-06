// src/security/requestGuard.ts
// BOWCON V4.0 — REQUEST PERIMETER GUARD, RATE LIMITER & CORRELATION ENGINE
// Compliant with NIST AI RMF & ISO/IEC 42001
import crypto from 'node:crypto';
export class RequestGuard {
    rateLimitWindowMs;
    maxRequestsPerWindow;
    clientWindows = new Map();
    allowedOrigins;
    maxBodyBytes;
    constructor(options) {
        this.rateLimitWindowMs = options?.rateLimitWindowMs || 60_000; // 1 minute
        this.maxRequestsPerWindow = options?.maxRequestsPerWindow || 120; // 120 req/min
        this.allowedOrigins = new Set(options?.allowedOrigins || []);
        this.maxBodyBytes = options?.maxBodyBytes || 1024 * 1024; // 1MB
    }
    /**
     * Check rate limit for a client identifier (e.g. IP or User ID)
     */
    checkRateLimit(clientId) {
        const now = Date.now();
        let client = this.clientWindows.get(clientId);
        if (!client || now - client.windowStart >= this.rateLimitWindowMs) {
            client = { count: 1, windowStart: now };
            this.clientWindows.set(clientId, client);
            return {
                allowed: true,
                remaining: this.maxRequestsPerWindow - 1,
                resetMs: this.rateLimitWindowMs,
            };
        }
        client.count++;
        const remaining = Math.max(0, this.maxRequestsPerWindow - client.count);
        const resetMs = Math.max(0, this.rateLimitWindowMs - (now - client.windowStart));
        return {
            allowed: client.count <= this.maxRequestsPerWindow,
            remaining,
            resetMs,
        };
    }
    /**
     * Validate CORS Origin against configured trusted origins
     */
    isOriginAllowed(origin) {
        if (!origin)
            return true; // Direct/same-origin/server-to-server requests
        if (this.allowedOrigins.size === 0)
            return true; // Permissive if unconfigured
        return this.allowedOrigins.has(origin.trim().toLowerCase());
    }
    /**
     * Validate request body size does not exceed limit
     */
    isBodySizeSafe(byteLength) {
        return byteLength <= this.maxBodyBytes;
    }
    /**
     * Generate or preserve unique request correlation ID
     */
    getOrCreateCorrelationId(existingId) {
        if (existingId && existingId.trim().length > 0) {
            return existingId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
        }
        return 'req_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
    }
    /**
     * Constant-time comparison for authentication tokens
     */
    static timingSafeCompare(a, b) {
        if (!a || !b)
            return false;
        const bufA = Buffer.from(a, 'utf8');
        const bufB = Buffer.from(b, 'utf8');
        if (bufA.length !== bufB.length) {
            return false;
        }
        return crypto.timingSafeEqual(bufA, bufB);
    }
}
export const globalRequestGuard = new RequestGuard();
