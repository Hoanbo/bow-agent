import type { BrainQueueStatus, BrainServiceRequestEnvelope, BrainServiceResponseEnvelope } from './brainServiceTypes.js';
export interface QueueItem {
    readonly request: BrainServiceRequestEnvelope;
    readonly resolve: (res: BrainServiceResponseEnvelope) => void;
    readonly reject: (err: unknown) => void;
    readonly queuedAt: number;
}
export declare class BrainServiceQueue {
    private readonly _queue;
    private readonly _maxSize;
    private _status;
    private _activeItem;
    constructor(maxSize?: number);
    get status(): BrainQueueStatus;
    get statusAfterActive(): BrainQueueStatus;
    get depth(): number;
    get isProcessing(): boolean;
    setStatus(status: BrainQueueStatus): void;
    enqueue(request: BrainServiceRequestEnvelope, resolve: (res: BrainServiceResponseEnvelope) => void, reject: (err: unknown) => void): void;
    dequeue(): QueueItem | null;
    completeActive(): void;
    clear(reason: string): void;
    private _updateStatus;
}
