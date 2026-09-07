import type { ScopedConnectionIdentity, HandshakeStage, ConnectionCapability } from './connectionTypes.js';
export interface HandshakePayload {
    readonly stage: HandshakeStage;
    readonly scope: string;
    readonly protocolVersion: string;
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly fingerprint: string;
}
export declare const HANDSHAKE_LIFECYCLE_ORDER: readonly HandshakeStage[];
/**
 * Validates whether transition from currentStage to nextStage is valid in the handshake sequence
 */
export declare function evaluateHandshakeSequence(currentStage: HandshakeStage, nextStage: HandshakeStage): boolean;
export declare function createHandshakeHello(identity: ScopedConnectionIdentity, clientVersion?: string): Readonly<HandshakePayload>;
export declare function createCapabilityOffer(identity: ScopedConnectionIdentity, requestedCapabilities: readonly ConnectionCapability[]): Readonly<HandshakePayload>;
export declare function createCapabilityAccept(identity: ScopedConnectionIdentity, acceptedCapabilities: readonly ConnectionCapability[]): Readonly<HandshakePayload>;
export declare function createAuthRequest(identity: ScopedConnectionIdentity, authPayload: Record<string, unknown>): Readonly<HandshakePayload>;
export declare function createAuthResult(identity: ScopedConnectionIdentity, authenticated: boolean, peerId: string, error?: string): Readonly<HandshakePayload>;
export declare function createSessionEstablished(identity: ScopedConnectionIdentity, sessionId: string): Readonly<HandshakePayload>;
export declare function createHandshakeReady(identity: ScopedConnectionIdentity): Readonly<HandshakePayload>;
