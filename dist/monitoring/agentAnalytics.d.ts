import type { AgentAnalyticsEvent, NormalizedDemandMetadata } from './analyticsTypes.js';
/**
 * Chuẩn hóa nhu cầu người dùng và phân loại thành 4 trạng thái:
 * SUPPORTED | NEAR_MATCH | UNSUPPORTED | AMBIGUOUS
 */
export declare function normalizeUserDemand(rawText: string, matchedProducts?: Array<{
    name: string;
    categoryName?: string | null;
    description?: string | null;
    features?: string[] | null;
}>, isAmbiguous?: boolean): NormalizedDemandMetadata;
/**
 * Lớp AgentAnalytics wrapper giúp Agent Core giao tiếp với Analytics API
 * mà không bao giờ block hoặc làm crash Agent (Fail-silent).
 */
export declare const agentAnalytics: {
    track: (event: AgentAnalyticsEvent) => void;
};
