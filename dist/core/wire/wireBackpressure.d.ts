import type { WireBackpressureLevel, WireFrame, WireMessagePriority } from './wireTypes.js';
export interface BackpressureThresholds {
    readonly elevatedFrameCount: number;
    readonly highFrameCount: number;
    readonly overflowFrameCount: number;
    readonly maxQueueBytes: number;
}
export declare const DEFAULT_WIRE_BACKPRESSURE_THRESHOLDS: BackpressureThresholds;
export interface BufferedWireFrame {
    readonly frame: WireFrame;
    readonly priority: WireMessagePriority;
    readonly queuedAt: number;
    readonly sizeBytes: number;
}
export declare class WireBackpressureController {
    private queue;
    private totalQueuedBytes;
    private droppedFrameCount;
    private readonly thresholds;
    constructor(thresholds?: Partial<BackpressureThresholds>);
    getLevel(): WireBackpressureLevel;
    enqueue(frame: WireFrame, priority?: WireMessagePriority): boolean;
    dequeue(): BufferedWireFrame | undefined;
    peek(): BufferedWireFrame | undefined;
    size(): number;
    getQueuedBytes(): number;
    getDroppedCount(): number;
    clear(): void;
    private shedNonCriticalFrame;
}
