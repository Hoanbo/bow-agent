export interface WebhookVerificationResult {
    valid: boolean;
    reason?: string;
}
export declare class WebhookVerifier {
    private secret;
    private maxAgeSeconds;
    private seenNonces;
    constructor(secret: string, maxAgeSeconds?: number);
    /**
     * Verify HMAC-SHA256 signature with constant-time equality and nonce replay protection
     */
    verify(params: {
        rawBody: string;
        signatureHeader?: string;
        timestampHeader?: string;
        nonceHeader?: string;
    }): WebhookVerificationResult;
    /**
     * Helper to generate valid headers for webhook dispatch / test simulation
     */
    generateHeaders(rawBody: string, nonce?: string): {
        'x-bow-signature': string;
        'x-bow-timestamp': string;
        'x-bow-nonce': string;
    };
    private purgeExpiredNonces;
}
export declare const globalWebhookVerifier: WebhookVerifier;
