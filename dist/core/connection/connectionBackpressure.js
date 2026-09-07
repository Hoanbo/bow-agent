// src/core/connection/connectionBackpressure.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Authoritative backpressure management and flow control.
// Zero silent drops. At OVERFLOW, non-critical messages fail closed with explicit typed error.
export const BACKPRESSURE_LEVELS = [
    'NORMAL',
    'MODERATE',
    'HIGH',
    'CRITICAL',
    'OVERFLOW',
];
export const DEFAULT_MAX_QUEUE_CAPACITY = 1000;
/**
 * Evaluates queue backpressure level based on ratio to maxCapacity
 */
export function evaluateBackpressure(queueLength, maxCapacity = DEFAULT_MAX_QUEUE_CAPACITY) {
    if (queueLength <= 0)
        return 'NORMAL';
    const ratio = queueLength / maxCapacity;
    if (ratio >= 1.0)
        return 'OVERFLOW';
    if (ratio >= 0.8)
        return 'CRITICAL';
    if (ratio >= 0.6)
        return 'HIGH';
    if (ratio >= 0.3)
        return 'MODERATE';
    return 'NORMAL';
}
/**
 * Checks whether a message can be admitted under the current backpressure level
 */
export function canAdmitMessage(level, isCritical = false) {
    if (level === 'OVERFLOW') {
        // Only critical control messages can be evaluated; normal data messages rejected
        return isCritical;
    }
    return true;
}
/**
 * Asserts queue capacity, failing closed with typed error on OVERFLOW
 */
export function assertQueueCapacity(currentQueueLength, maxCapacity = DEFAULT_MAX_QUEUE_CAPACITY, isCritical = false) {
    const level = evaluateBackpressure(currentQueueLength, maxCapacity);
    if (!canAdmitMessage(level, isCritical)) {
        throw new Error(`[CONNECTION_BACKPRESSURE_OVERFLOW] Queue capacity exceeded (${currentQueueLength}/${maxCapacity}); non-critical message rejected`);
    }
}
