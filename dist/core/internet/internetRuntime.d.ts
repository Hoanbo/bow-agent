import { type InternetEdgeSnapshot, type InternetEndpointDescriptor } from './internetTypes.js';
import { type InternetEdgeConfig } from './internetEdge.js';
import { type InternetAuditEvent } from './internetAudit.js';
import type { InternetCertDescriptor } from './internetCertificate.js';
export interface InternetRuntimeConfig {
    readonly edgeConfig?: InternetEdgeConfig;
    readonly allowInsecureEndpoints?: boolean;
}
/**
 * A full snapshot of the InternetRuntime for AgentLoop observation.
 * All fields are value types — no mutable references escape.
 */
export interface InternetRuntimeSnapshot {
    readonly version: string;
    readonly edge: InternetEdgeSnapshot;
    readonly pendingAdmissionTokens: number;
    readonly activeRelayBindings: number;
    readonly health: {
        level: string;
        probeCount: number;
        consecutiveMisses: number;
    };
    readonly reconnect: {
        attemptCount: number;
        isExhausted: boolean;
    };
    readonly roaming: {
        roamingCount: number;
    };
    readonly totalAuditEvents: number;
    readonly capturedAt: number;
}
/**
 * InternetRuntime — the top-level orchestrator for the Internet Edge & TLS Relay subsystem.
 *
 * Typical happy path:
 *   1. connect(endpoint)        → OFFLINE → RESOLVING → CONNECTING
 *   2. onTlsHandshakeComplete() → CERT_VALIDATING (after TLS validation passes)
 *   3. onCertValidated()        → ADMITTED (after cert check passes)
 *   4. bindToRelay()            → ACTIVE (token issued, consumed, relay bound)
 *
 * All failure paths → INTERNET_REJECTED (fail-closed).
 */
export declare class InternetRuntime {
    private readonly _edge;
    private readonly _admissionBridge;
    private readonly _relayBridge;
    private readonly _health;
    private readonly _reconnect;
    private readonly _roaming;
    private readonly _ledger;
    private readonly _config;
    private _endpoint?;
    constructor(config?: InternetRuntimeConfig);
    get state(): import("./internetStates.js").InternetEdgeState;
    get isActive(): boolean;
    get isTerminal(): boolean;
    get sessionId(): import("./internetTypes.js").InternetEdgeSessionId | undefined;
    /**
     * Step 1: Begin connecting to an internet endpoint.
     * Validates the endpoint and advances the Edge state machine.
     */
    connect(endpoint: InternetEndpointDescriptor): void;
    /**
     * Step 2: Called once the TLS handshake completes.
     * Validates TLS version and cipher; advances to CERT_VALIDATING or REJECTED.
     */
    completeTls(params: {
        negotiatedVersion: string;
        negotiatedCipher: string;
        isMtls: boolean;
        durationMs: number;
    }): void;
    /**
     * Step 3: Called once the peer certificate has been inspected.
     * Validates cert and issues admission token; advances to ADMITTED or REJECTED.
     */
    completeCert(cert: InternetCertDescriptor): void;
    /**
     * Step 4: Binds the admitted session to the relay fabric.
     * Issues an admission token, consumes it, and creates a relay binding.
     * Advances to ACTIVE on success; REJECTED on any failure.
     */
    bindToRelay(): void;
    /**
     * Records a health probe result (RTT in ms; negative = missed probe).
     */
    recordHealthProbe(rttMs: number): void;
    /**
     * Reports a network roaming event.
     * INVARIANT: Roaming does NOT change identity or re-execute tasks.
     */
    reportRoaming(reason: 'INTERFACE_CHANGE' | 'IP_CHANGE' | 'NETWORK_SWITCH' | 'DNS_CHANGE' | 'FORCED_ROAM'): void;
    /**
     * Schedules a reconnect attempt.
     * Throws InternetEdgeError if max attempts are exhausted.
     * INVARIANT: Reconnect does NOT re-execute any agent task.
     */
    scheduleReconnect(): number;
    /**
     * Signals that a reconnect succeeded; resets the reconnect counter.
     */
    onReconnectSucceeded(): void;
    /**
     * Gracefully drains and closes the Edge session.
     */
    shutdown(): Promise<void>;
    /**
     * Returns an immutable runtime snapshot for AgentLoop observation.
     */
    getSnapshot(): InternetRuntimeSnapshot;
    /**
     * Returns a frozen copy of all audit events for inspection.
     */
    getAuditEvents(): readonly InternetAuditEvent[];
}
export declare function getInternetRuntime(): InternetRuntime;
/** Replaces the global runtime — used only in tests. */
export declare function setInternetRuntimeForTest(runtime: InternetRuntime): void;
