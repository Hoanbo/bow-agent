import type { CapacityStatus, CapacityMetrics } from '../monitoring/analyticsTypes.js';
export declare function getCapacityStatus(requestsPerMinute: number): CapacityStatus;
export declare function acquireCapacitySlot(): {
    acquired: boolean;
    reason?: string;
};
export declare function releaseCapacitySlot(): void;
export declare function recordTimeout(): void;
export declare function getCapacityMetrics(requestsPerMinute?: number, avgLatencyMs?: number): CapacityMetrics;
export declare function resetCapacityCounters(): void;
