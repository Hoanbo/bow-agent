// src/core/relay/relayBackpressure.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Backpressure management and priority buffer overflow shedding.
//
// INVARIANTS:
// - States: NORMAL, ELEVATED, HIGH, OVERFLOW
// - Non-critical traffic may be dropped during OVERFLOW.
// - Critical security/control traffic MUST NEVER be silently dropped.
// - No silent message loss.
export const DEFAULT_BACKPRESSURE_LIMITS = Object.freeze({
    elevatedThreshold: 50,
    highThreshold: 100,
    overflowThreshold: 150,
});
export class RelayBackpressureError extends Error {
    constructor(message) {
        super(`RELAY_BACKPRESSURE_ERROR: ${message}`);
        this.name = 'RelayBackpressureError';
    }
}
export class RelayBackpressureController {
    queue = [];
    limits;
    droppedLowPriorityCount = 0;
    constructor(limits) {
        this.limits = Object.freeze({
            ...DEFAULT_BACKPRESSURE_LIMITS,
            ...limits,
        });
    }
    getState() {
        const depth = this.queue.length;
        if (depth >= this.limits.overflowThreshold)
            return 'OVERFLOW';
        if (depth >= this.limits.highThreshold)
            return 'HIGH';
        if (depth >= this.limits.elevatedThreshold)
            return 'ELEVATED';
        return 'NORMAL';
    }
    getQueueDepth() {
        return this.queue.length;
    }
    getDroppedCount() {
        return this.droppedLowPriorityCount;
    }
    /**
     * Enqueues an incoming message.
     * If in OVERFLOW state:
     * - Critical / High priority messages are ALWAYS accepted or prioritized.
     * - Normal / Low priority messages are explicitly rejected with an error (not silently dropped).
     */
    enqueue(message) {
        const state = this.getState();
        if (state === 'OVERFLOW') {
            // Critical security / control messages MUST NOT be dropped
            if (message.priority === 'CRITICAL' || message.category === 'CONTROL' || message.category === 'ERROR') {
                this.queue.push(message);
                return true;
            }
            // Non-critical traffic is rejected with typed failure (no silent loss)
            this.droppedLowPriorityCount++;
            throw new RelayBackpressureError(`BACKPRESSURE_OVERFLOW: Buffer full (${this.queue.length}). Non-critical message ${message.messageId} rejected.`);
        }
        this.queue.push(message);
        return true;
    }
    dequeue() {
        return this.queue.shift();
    }
    clear() {
        this.queue.length = 0;
        this.droppedLowPriorityCount = 0;
    }
}
