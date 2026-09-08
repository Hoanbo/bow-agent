import type { InternetEdgeState } from './internetStates.js';
import { type InternetEdgeSessionId, type InternetEdgeSessionInfo, type InternetEdgeSnapshot, type InternetEndpointDescriptor } from './internetTypes.js';
import type { InternetCertDescriptor } from './internetCertificate.js';
import { type InternetAuditLedger } from './internetAudit.js';
export interface InternetEdgeConfig {
    /** Pin set for certificate pinning. If empty, pinning is skipped. */
    readonly pinSet?: readonly string[];
    /** Allow TLS 1.2 in non-production / test stubs (default: false). */
    readonly allowTls12?: boolean;
    /** Whether to require mTLS (default: true). */
    readonly requireMtls?: boolean;
    /** Handshake timeout override in ms. */
    readonly handshakeTimeoutMs?: number;
}
/**
 * InternetEdge — manages one TLS internet connection lifecycle.
 *
 * State machine: INTERNET_OFFLINE → INTERNET_RESOLVING → INTERNET_CONNECTING
 *   → INTERNET_TLS_HANDSHAKING → INTERNET_CERT_VALIDATING → INTERNET_ADMITTED
 *   → INTERNET_RELAY_BINDING → INTERNET_ACTIVE ↔ INTERNET_DEGRADED / ROAMING
 *   → INTERNET_DRAINING → INTERNET_CLOSED
 *   (any step can → INTERNET_REJECTED on security violation)
 */
export declare class InternetEdge {
    private _state;
    private _sessionId?;
    private _sessionInfo?;
    private _roamingCount;
    private _reconnectCount;
    private _totalTlsRejections;
    private _totalDowngradeAttempts;
    private _establishedAt?;
    private _lastActivityAt?;
    private readonly _auditLedger;
    private readonly _config;
    constructor(config?: InternetEdgeConfig, auditLedger?: InternetAuditLedger);
    get state(): InternetEdgeState;
    get sessionId(): InternetEdgeSessionId | undefined;
    get sessionInfo(): Readonly<InternetEdgeSessionInfo> | undefined;
    get isActive(): boolean;
    get isTerminal(): boolean;
    /** Step 1: Move from OFFLINE to RESOLVING. */
    beginResolve(endpoint: InternetEndpointDescriptor): void;
    /** Step 2: Move from RESOLVING to CONNECTING. */
    beginConnect(): void;
    /** Step 3: Move to TLS_HANDSHAKING. */
    beginTlsHandshake(): void;
    /**
     * Step 4: Validate TLS parameters after handshake completes.
     * On failure → INTERNET_REJECTED (fail-closed).
     */
    completeTlsHandshake(params: {
        negotiatedVersion: string;
        negotiatedCipher: string;
        isMtls: boolean;
        durationMs: number;
    }): void;
    /**
     * Step 5: Validate the peer certificate.
     * On failure → INTERNET_REJECTED (fail-closed).
     */
    completeCertValidation(cert: InternetCertDescriptor): void;
    /** Step 6: Begin relay binding. */
    beginRelayBinding(): void;
    /** Step 7: Mark as fully active. */
    markActive(): void;
    /** Signal that the connection has degraded (elevated latency / loss). */
    markDegraded(reason?: string): void;
    /** Signal a network roaming event (IP / interface change). */
    markRoaming(reason?: string): void;
    /** Begin graceful reconnect attempt. */
    beginReconnect(): void;
    /** Drain and close gracefully. */
    drain(): Promise<void>;
    /** Immediately close (e.g. security violation detected externally). */
    reject(reason: string): void;
    /** Snapshot for AgentLoop observation. */
    getSnapshot(): InternetEdgeSnapshot;
    private transition;
}
