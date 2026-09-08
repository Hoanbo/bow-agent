import type { RelayBackpressureState, RelayMessage } from './relayTypes.js';
export interface BackpressureLimits {
    readonly elevatedThreshold: number;
    readonly highThreshold: number;
    readonly overflowThreshold: number;
}
export declare const DEFAULT_BACKPRESSURE_LIMITS: BackpressureLimits;
export declare class RelayBackpressureError extends Error {
    constructor(message: string);
}
export declare class RelayBackpressureController {
    private readonly queue;
    private readonly limits;
    private droppedLowPriorityCount;
    constructor(limits?: Partial<BackpressureLimits>);
    getState(): RelayBackpressureState;
    getQueueDepth(): number;
    getDroppedCount(): number;
    /**
     * Enqueues an incoming message.
     * If in OVERFLOW state:
     * - Critical / High priority messages are ALWAYS accepted or prioritized.
     * - Normal / Low priority messages are explicitly rejected with an error (not silently dropped).
     */
    enqueue(message: RelayMessage): boolean;
    dequeue(): RelayMessage | undefined;
    clear(): void;
}
