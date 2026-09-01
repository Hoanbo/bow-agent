import type { ProductionRequestMetric, ProductionRolloutStage } from '../monitoring/analyticsTypes.js';
export declare function sanitizeProductionTelemetryText(raw: string): string;
export declare function detectPiiInText(text: string): boolean;
export interface IngestTelemetryParams {
    requestId?: string;
    route: string;
    intent: string;
    latencyMs: number;
    success: boolean;
    errorType?: string;
    fallbackUsed: boolean;
    knowledgeHit: boolean;
    negativePolicyHit: boolean;
    transactionBoundaryHit: boolean;
    warrantyBoundaryHit: boolean;
    productDemandHit: boolean;
    rawQuery?: string;
    rolloutStage?: ProductionRolloutStage;
}
export declare function recordProductionMetric(params: IngestTelemetryParams): ProductionRequestMetric;
export declare function getProductionMetrics(windowMinutes?: number): ProductionRequestMetric[];
export declare function clearProductionTelemetryCache(): void;
export declare function calculateTrafficStats(windowMinutes?: number): {
    requestsPerMin: number;
    totalRequestsInWindow: number;
    successCount: number;
    errorCount: number;
    fallbackCount: number;
    activeUsers: number;
    concurrentRequests: number;
};
export declare function calculateLatencyStats(windowMinutes?: number): {
    p50: number;
    p95: number;
    p99: number;
    max: number;
    isInsufficientData: boolean;
};
export declare function calculateReliabilityStats(windowMinutes?: number): {
    total: number;
    successRate: number;
    errorRate: number;
    fallbackRate: number;
    isInsufficientData: boolean;
};
