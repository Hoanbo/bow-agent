// src/core/wire/wireBackpressure.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Priority-Based Wire Backpressure and Bounded Buffering Controller.
//
// States:
// - NORMAL: Queue within nominal thresholds
// - ELEVATED: Queue processing slower than ingress; notify senders
// - HIGH: Queue nearing bounds; throttling applied
// - OVERFLOW: Queue exceeded; shedding non-critical observational frames
//
// INVARIANT:
// During OVERFLOW, control signals, security frames, and admission events
// are STRICTLY PRESERVED. Only low-priority telemetry frames are shed.
export const DEFAULT_WIRE_BACKPRESSURE_THRESHOLDS = Object.freeze({
    elevatedFrameCount: 100,
    highFrameCount: 500,
    overflowFrameCount: 1000,
    maxQueueBytes: 2 * 1024 * 1024, // 2MB
});
export class WireBackpressureController {
    queue = [];
    totalQueuedBytes = 0;
    droppedFrameCount = 0;
    thresholds;
    constructor(thresholds) {
        this.thresholds = Object.freeze({
            ...DEFAULT_WIRE_BACKPRESSURE_THRESHOLDS,
            ...thresholds,
        });
    }
    getLevel() {
        const count = this.queue.length;
        const bytes = this.totalQueuedBytes;
        if (count >= this.thresholds.overflowFrameCount || bytes >= this.thresholds.maxQueueBytes) {
            return 'OVERFLOW';
        }
        if (count >= this.thresholds.highFrameCount || bytes >= this.thresholds.maxQueueBytes * 0.75) {
            return 'HIGH';
        }
        if (count >= this.thresholds.elevatedFrameCount || bytes >= this.thresholds.maxQueueBytes * 0.5) {
            return 'ELEVATED';
        }
        return 'NORMAL';
    }
    enqueue(frame, priority = 'NORMAL') {
        const sizeBytes = frame.payloadLength;
        const currentLevel = this.getLevel();
        if (currentLevel === 'OVERFLOW') {
            // In OVERFLOW state: CRITICAL and HIGH priority frames are strictly preserved
            if (priority === 'CRITICAL' || priority === 'HIGH') {
                // Drop oldest LOW or NORMAL frame to make room
                this.shedNonCriticalFrame();
            }
            else {
                // Shed this non-critical frame
                this.droppedFrameCount++;
                return false;
            }
        }
        this.queue.push(Object.freeze({
            frame,
            priority,
            queuedAt: Date.now(),
            sizeBytes,
        }));
        this.totalQueuedBytes += sizeBytes;
        return true;
    }
    dequeue() {
        const item = this.queue.shift();
        if (item) {
            this.totalQueuedBytes = Math.max(0, this.totalQueuedBytes - item.sizeBytes);
        }
        return item;
    }
    peek() {
        return this.queue[0];
    }
    size() {
        return this.queue.length;
    }
    getQueuedBytes() {
        return this.totalQueuedBytes;
    }
    getDroppedCount() {
        return this.droppedFrameCount;
    }
    clear() {
        this.queue = [];
        this.totalQueuedBytes = 0;
    }
    shedNonCriticalFrame() {
        // Find first LOW or NORMAL frame to shed
        const indexToDrop = this.queue.findIndex((item) => item.priority === 'LOW' || item.priority === 'NORMAL');
        if (indexToDrop !== -1) {
            const dropped = this.queue.splice(indexToDrop, 1)[0];
            this.totalQueuedBytes = Math.max(0, this.totalQueuedBytes - dropped.sizeBytes);
            this.droppedFrameCount++;
        }
    }
}
