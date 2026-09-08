export declare class AdmissionReplayTracker {
    private readonly seenNonces;
    private readonly seenProofDigests;
    /**
     * Checks if a nonce has already been seen or used.
     */
    isNonceReplayed(nonce: string, now?: number): boolean;
    isNonceSeen(nonce: string, now?: number): boolean;
    /**
     * Registers a nonce as consumed with an expiration timestamp.
     * Throws if nonce has already been used.
     */
    registerNonce(nonce: string, ttlMs?: number, now?: number): void;
    /**
     * Registers a verified proof signature digest to block mutated proof replays.
     */
    registerProofDigest(digest: string): void;
    isProofDigestSeen(digest: string): boolean;
    prune(now?: number): number;
    size(): number;
    clear(): void;
}
