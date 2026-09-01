import type { FaqDriftDetail, NegativePolicyDriftDetail, QueryDriftDetail, CoverageDriftDetail, KnowledgeDriftReport, DriftSeverity, DriftStatus, NegativePolicy, DomainCoverageReport } from '../monitoring/analyticsTypes.js';
export declare function clearKnowledgeDriftCache(): void;
export declare function scoreToDriftSeverity(score: number): DriftSeverity;
export declare function scoreToDriftStatus(score: number): DriftStatus;
export declare function detectFaqDrift(faq: {
    id: string;
    question: string;
    created_at?: string;
    usageCount?: number;
}, recentEvents?: any[], baselineUsageCount?: number, conflictCount?: number): FaqDriftDetail;
export declare function detectNegativePolicyDrift(policy: NegativePolicy, recentEvents?: any[], conflictCount?: number): NegativePolicyDriftDetail;
export declare function detectIntentDrift(currentEvents?: any[], baselineEvents?: any[]): {
    intent: string;
    changePercent: number;
    isDrift: boolean;
}[];
export declare function detectQueryDistributionDrift(currentEvents?: any[], baselineEvents?: any[]): QueryDriftDetail[];
export declare function detectCoverageDrift(currentCoverage: DomainCoverageReport, baselineCoverage?: DomainCoverageReport): CoverageDriftDetail[];
export declare function detectMatchRateDrift(baselineMatchRate: number, currentMatchRate: number): {
    drop: number;
    driftSeverity: DriftSeverity;
};
export declare function detectConflictDrift(currentConflictCount: number, baselineConflictCount: number): {
    surge: number;
    driftSeverity: DriftSeverity;
};
export declare function detectResponseBehaviorDrift(events?: any[]): {
    shiftedCount: number;
    severity: DriftSeverity;
    details: string[];
};
export declare function calculateDriftScore(params: {
    faqDrifts: FaqDriftDetail[];
    policyDrifts: NegativePolicyDriftDetail[];
    queryDrifts: QueryDriftDetail[];
    coverageDrifts: CoverageDriftDetail[];
}): {
    score: number;
    status: DriftStatus;
    severity: DriftSeverity;
};
export declare function detectKnowledgeDrift(providedFaqs?: Array<{
    id: string;
    question: string;
    answer?: string;
    created_at?: string;
}>, providedPolicies?: NegativePolicy[], providedEvents?: any[], forceRefresh?: boolean): Promise<KnowledgeDriftReport>;
