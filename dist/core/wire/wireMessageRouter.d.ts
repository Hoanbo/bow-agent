import type { WireEnvelope } from './wireTypes.js';
export interface RouteOptions {
    readonly enforceSequenceContinuity?: boolean;
}
export declare class WireMessageRouter {
    private lastSeenSequence;
    private seenMessageIds;
    private readonly maxSeenIds;
    constructor(maxSeenIds?: number);
    /**
     * Routes an incoming or outbound envelope through the wire gateway.
     * Preserves all semantic properties while verifying sequence integrity.
     */
    route<T = unknown>(envelope: WireEnvelope<T>, options?: RouteOptions): WireEnvelope<T>;
    getLastSequence(sessionId: string, deviceId: string): number | undefined;
    reset(sessionId?: string, deviceId?: string): void;
}
