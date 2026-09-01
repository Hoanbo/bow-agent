import type { KnowledgeGovernanceScore, KnowledgeGovernanceHealthStatus, SlaSloMetrics, GovernanceDashboardSummary, LatencyPercentiles, NegativePolicy } from '../monitoring/analyticsTypes.js';
export declare function clearGovernanceDashboardCache(): void;
export declare function calculateKnowledgeGovernanceScore(params: {
    knowledgeIntegrity?: number;
    faqHealth?: number;
    coverage?: number;
    regressionSafety?: number;
    driftStability?: number;
    qaPassRate?: number;
    conflictHealth?: number;
    negativePolicyHealth?: number;
    actionResolution?: number;
    hasCriticalRegression?: boolean;
    hasTransactionBoundaryFailure?: boolean;
    hasUnauthorizedMutationAttempt?: boolean;
    hasPiiLeakage?: boolean;
    hasBrokenPolicyLoop?: boolean;
}): KnowledgeGovernanceScore;
export declare function evaluateGovernanceHealthStatus(score: number, isCapped?: boolean): KnowledgeGovernanceHealthStatus;
export declare function calculatePercentiles(latencies: number[]): LatencyPercentiles;
export declare function calculateSlaSloMetrics(events?: any[]): SlaSloMetrics;
export declare function getGovernanceDashboardSummary(providedFaqs?: Array<{
    id: string;
    question: string;
    answer: string;
    created_at?: string;
}>, providedPolicies?: NegativePolicy[], providedEvents?: any[], forceRefresh?: boolean): Promise<GovernanceDashboardSummary>;
