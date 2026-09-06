export * from '../security/webhookVerifier.js';
export * from '../security/requestGuard.js';
export interface SecurityScanResult {
    isSafe: boolean;
    containsPii: boolean;
    containsPromptInjection: boolean;
    piiTypes: string[];
    sanitizedText: string;
    violations: string[];
}
export declare function detectPii(text: string): boolean;
export declare function redactPii(text: string): string;
export declare function detectPromptInjection(text: string): boolean;
/**
 * Comprehensive Security Scan
 */
export declare function scanSecurity(text: string): SecurityScanResult;
/**
 * Authentication & Channel Access Guard
 */
export type ChannelType = 'WEB' | 'ROBOT' | 'DESKTOP' | 'SYSTEM';
export interface AuthContext {
    channel: ChannelType;
    userId?: string;
    role?: string;
    authToken?: string;
    isAuthenticated?: boolean;
}
export declare function verifyChannelAccess(auth: AuthContext, requiredPrivilege: 'READ' | 'WRITE' | 'DESKTOP_EXEC' | 'ADMIN'): boolean;
/**
 * Zero Auto-Mutation: Generate Cryptographic Decision Fingerprint (SHA-256)
 */
export declare function generateDecisionFingerprint(actionType: string, payload: any): string;
/**
 * Verify a versioned HMAC webhook signature and reject stale requests.
 * Signature format: `v1=<hex sha256 of timestamp + '.' + raw body>`.
 */
export declare function verifyShopWebhookSignature(rawBody: string, timestamp?: string, signature?: string): boolean;
/**
 * Generate authenticated HMAC headers for outgoing or test webhooks.
 */
export declare function createShopWebhookHeaders(rawBody: string, secret?: string): Record<string, string>;
