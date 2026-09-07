export interface TransportCheckpoint {
    readonly checkpointId: string;
    readonly connectionId: string;
    readonly scopeKey: string;
    readonly lastSequence: number;
    readonly lastAcknowledgedSequence: number;
    readonly sessionFingerprint: string;
    readonly pendingMessageIds: readonly string[];
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable TransportCheckpoint.
 * VI: Khởi tạo một TransportCheckpoint bất biến.
 */
export declare function createTransportCheckpoint(params: {
    readonly connectionId: string;
    readonly scopeKey: string;
    readonly lastSequence: number;
    readonly lastAcknowledgedSequence: number;
    readonly sessionFingerprint: string;
    readonly pendingMessageIds?: readonly string[];
    readonly timestamp?: number;
}): Readonly<TransportCheckpoint>;
