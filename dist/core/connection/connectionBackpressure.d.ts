export declare const BACKPRESSURE_LEVELS: readonly ["NORMAL", "MODERATE", "HIGH", "CRITICAL", "OVERFLOW"];
export type BackpressureLevel = (typeof BACKPRESSURE_LEVELS)[number];
export declare const DEFAULT_MAX_QUEUE_CAPACITY = 1000;
/**
 * Evaluates queue backpressure level based on ratio to maxCapacity
 */
export declare function evaluateBackpressure(queueLength: number, maxCapacity?: number): BackpressureLevel;
/**
 * Checks whether a message can be admitted under the current backpressure level
 */
export declare function canAdmitMessage(level: BackpressureLevel, isCritical?: boolean): boolean;
/**
 * Asserts queue capacity, failing closed with typed error on OVERFLOW
 */
export declare function assertQueueCapacity(currentQueueLength: number, maxCapacity?: number, isCritical?: boolean): void;
