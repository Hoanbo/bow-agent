import type { RemoteSession, RelaySessionState, RelayId, RelaySurfaceType as SurfaceType } from './relayTypes.js';
export declare class RelaySessionError extends Error {
    constructor(message: string);
}
/**
 * Mutable operational state wrapper for an active Remote Session.
 */
export declare class RemoteSessionRecord {
    readonly sessionId: string;
    readonly deviceId: string;
    readonly relayId: RelayId;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly surfaceType: SurfaceType;
    readonly tenantId: string;
    readonly userId: string;
    readonly connectionId: string;
    readonly gatewayId: string;
    readonly createdAt: number;
    private state;
    private lastActivityAt;
    private resumedAt?;
    private sequenceNumber;
    private ackSequenceNumber;
    private admissionState;
    private trustState;
    private resumeToken?;
    constructor(params: {
        sessionId: string;
        deviceId: string;
        relayId: RelayId;
        brainId: string;
        surfaceId: string;
        surfaceType: SurfaceType;
        tenantId: string;
        userId: string;
        connectionId: string;
        gatewayId: string;
        createdAt?: number;
        initialState?: RelaySessionState;
    });
    getState(): RelaySessionState;
    transitionTo(nextState: RelaySessionState): void;
    incrementSequence(): number;
    getSequenceNumber(): number;
    acknowledgeSequence(seq: number): void;
    getAckSequenceNumber(): number;
    setAdmissionState(admission: 'PENDING' | 'ADMITTED' | 'REJECTED'): void;
    getAdmissionState(): 'PENDING' | 'ADMITTED' | 'REJECTED';
    setTrustState(trust: 'PENDING' | 'TRUSTED' | 'REVOKED'): void;
    getTrustState(): 'PENDING' | 'TRUSTED' | 'REVOKED';
    setResumeToken(token: string): void;
    getResumeToken(): string | undefined;
    markResumed(now?: number): void;
    getLastActivityAt(): number;
    updateActivity(now?: number): void;
    /**
     * Produces an immutable snapshot of this remote session.
     */
    toImmutable(): RemoteSession;
}
/**
 * Asserts complete isolation between two distinct remote sessions.
 */
export declare function assertSessionIsolation(a: RemoteSession, b: RemoteSession): void;
