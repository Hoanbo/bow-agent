import { type ArchivedIncidentRecord, type CrossIncidentCorrelationCluster } from './crossIncidentTypes.js';
export interface CorrelationEngineOptions {
    /**
     * Sliding temporal window in minutes.
     * Provisional heuristic parameter: must remain between 15 and 60 minutes.
     */
    readonly windowMinutes?: number;
    /**
     * Minimum correlation score threshold for emitting a cluster.
     * Default 0.3, strictly capped at 0.95.
     */
    readonly minScoreThreshold?: number;
}
export declare class CrossIncidentCorrelationEngine {
    static readonly MIN_TEMPORAL_WINDOW_MINUTES = 15;
    static readonly MAX_TEMPORAL_WINDOW_MINUTES = 60;
    static readonly DEFAULT_TEMPORAL_WINDOW_MINUTES = 30;
    static readonly MAX_CORRELATION_CEILING = 0.95;
    private readonly windowMs;
    private readonly minScoreThreshold;
    constructor(options?: CorrelationEngineOptions);
    /**
     * Correlates a set of archived incidents into temporal and topological clusters.
     * Preserves explicit epistemic caveat: CORRELATION != CAUSATION.
     * Tương quan một tập hợp các sự cố đã lưu trữ thành các cụm thời gian và topo.
     * Bảo toàn cảnh báo nhận thức rõ ràng: TƯƠNG QUAN != NHÂN QUẢ.
     */
    correlate(records: readonly ArchivedIncidentRecord[]): readonly CrossIncidentCorrelationCluster[];
}
