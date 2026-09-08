import { type InternetAdmissionDecision, type InternetAdmissionToken, type InternetEdgeSessionId, type InternetTlsVersion, type InternetCipherSuite } from './internetTypes.js';
import { type InternetAuditLedger } from './internetAudit.js';
export interface AdmissionBridgeConfig {
    readonly tokenTtlMs?: number;
    readonly maxPendingTokens?: number;
}
export declare class InternetAdmissionBridge {
    private readonly _pendingTokens;
    private readonly _ledger;
    private readonly _ttlMs;
    private readonly _maxPending;
    constructor(config?: AdmissionBridgeConfig, ledger?: InternetAuditLedger);
    /** Number of tokens currently pending consumption. */
    get pendingCount(): number;
    /**
     * Issues a single-use admission token for a successfully validated TLS session.
     *
     * INVARIANT: Token issuance requires INTERNET_ADMITTED state (enforced by caller).
     * INVARIANT: Token is NOT an authorization grant.
     * Throws InternetEdgeError if the pending token limit is reached.
     */
    issueToken(params: {
        sessionId: InternetEdgeSessionId;
        tlsVersion: InternetTlsVersion;
        cipherSuite: InternetCipherSuite;
        certFingerprint: string;
    }): InternetAdmissionToken;
    /**
     * Consumes a pending admission token to bind the session to the relay fabric.
     * Token is single-use — removed from the bridge on consumption.
     *
     * Returns the admission decision:
     *  - ADMIT: token valid and consumed
     *  - REJECT_TLS / REJECT_CERT: token integrity check failed
     *  - REJECT_POLICY: token expired
     */
    consumeToken(sessionId: InternetEdgeSessionId, expectedFingerprint: string): {
        decision: InternetAdmissionDecision;
        token?: InternetAdmissionToken;
        reason?: string;
    };
    /**
     * Removes all tokens that have exceeded their TTL.
     * Called automatically before issuance and consumption.
     */
    private evictExpiredTokens;
    /** Snapshot for testing and AgentLoop observation. */
    getSnapshot(): {
        pendingCount: number;
        ttlMs: number;
        maxPending: number;
    };
}
