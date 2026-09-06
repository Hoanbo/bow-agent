export interface RateLimitStatus {
    allowed: boolean;
    remaining: number;
    resetMs: number;
}
export declare class RequestGuard {
    private rateLimitWindowMs;
    private maxRequestsPerWindow;
    private clientWindows;
    private allowedOrigins;
    private maxBodyBytes;
    constructor(options?: {
        rateLimitWindowMs?: number;
        maxRequestsPerWindow?: number;
        allowedOrigins?: string[];
        maxBodyBytes?: number;
    });
    /**
     * Check rate limit for a client identifier (e.g. IP or User ID)
     */
    checkRateLimit(clientId: string): RateLimitStatus;
    /**
     * Validate CORS Origin against configured trusted origins
     */
    isOriginAllowed(origin?: string): boolean;
    /**
     * Validate request body size does not exceed limit
     */
    isBodySizeSafe(byteLength: number): boolean;
    /**
     * Generate or preserve unique request correlation ID
     */
    getOrCreateCorrelationId(existingId?: string): string;
    /**
     * Constant-time comparison for authentication tokens
     */
    static timingSafeCompare(a: string, b: string): boolean;
}
export declare const globalRequestGuard: RequestGuard;
