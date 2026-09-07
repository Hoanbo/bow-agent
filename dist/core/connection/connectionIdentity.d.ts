export interface PeerSeed {
    readonly userId: string;
    readonly surfaceId: string;
    readonly deviceId?: string;
    readonly role?: string;
}
export interface ConnectionSeed {
    readonly peerId: string;
    readonly surfaceId: string;
    readonly transportId: string;
    readonly adapterId: string;
    readonly gatewayId: string;
    readonly sequenceSeed?: number;
}
export interface SessionSeed {
    readonly connectionId: string;
    readonly peerId: string;
    readonly brainId: string;
    readonly sessionId: string;
}
/**
 * Creates deterministic peer identity: peer_<fingerprint>
 */
export declare function createDeterministicPeerId(seed: PeerSeed): string;
/**
 * Creates deterministic connection identity: conn_<fingerprint>
 */
export declare function createDeterministicConnectionId(seed: ConnectionSeed): string;
/**
 * Creates deterministic connection session identity: csess_<fingerprint>
 */
export declare function createDeterministicSessionId(seed: SessionSeed): string;
/**
 * Validates connection ID format: conn_[0-9a-f]{8}
 */
export declare function isConnectionId(id: string): boolean;
/**
 * Validates session ID format: csess_[0-9a-f]{8}
 */
export declare function isConnectionSessionId(id: string): boolean;
/**
 * Validates peer ID format: peer_[0-9a-f]{8}
 */
export declare function isPeerId(id: string): boolean;
