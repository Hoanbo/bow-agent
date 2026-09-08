import type { RemoteSessionRecord } from './relaySession.js';
export declare class RelayResumeError extends Error {
    constructor(message: string);
}
export declare class RelayResumeCoordinator {
    private readonly validTokens;
    /**
     * Generates a deterministic resume token for an active session.
     */
    generateResumeToken(session: RemoteSessionRecord, ttlMs?: number, now?: number): string;
    /**
     * Validates a resume request with sequence continuity checks.
     */
    validateResumeRequest(params: {
        sessionId: string;
        providedToken: string;
        clientLastAckSeq: number;
        clientNextSeq: number;
        now?: number;
    }): {
        valid: boolean;
        error?: string;
    };
    invalidateToken(sessionId: string): void;
    clear(): void;
}
