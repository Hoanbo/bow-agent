import type { AgentAnalyticsEvent } from '../monitoring/analyticsTypes.js';
import { type DeduplicatedKnowledgeGap } from './knowledgeGapDetector.js';
export interface KnowledgeGapCategoryBreakdown {
    policy: number;
    technical: number;
    support: number;
    troubleshooting: number;
    general: number;
    other: number;
}
export interface ObservabilitySummary {
    totalObservabilityEvents: number;
    geminiCallsCount: number;
    geminiFallbackCount: number;
    deterministicCallsCount: number;
    faqHitsCount: number;
    knowledgeGapsDetectedCount: number;
    averageLatencyMs: number;
    topKnowledgeGaps: DeduplicatedKnowledgeGap[];
    categoryBreakdown: KnowledgeGapCategoryBreakdown;
}
/**
 * Tổng hợp sự kiện Knowledge Gap từ Agent Analytics Events
 */
export declare function aggregateKnowledgeGapEvents(events: AgentAnalyticsEvent[], timeWindow?: {
    start: Date | null;
    end: Date | null;
}): ObservabilitySummary;
