import type { FaqHealthDetail, DomainCoverageReport, KnowledgeDomain, QueryCluster, EmergingTopic, NegativePolicyIntelligenceItem, KnowledgeConflictItem, AdminRecommendation, KnowledgeRegressionReport, KnowledgeRegressionDetail, IntelligenceDashboardSummary, NegativePolicy } from '../monitoring/analyticsTypes.js';
export declare function clearKnowledgeIntelligenceCache(): void;
export declare function calculateFaqHealthScores(faqs: Array<{
    id: string;
    question: string;
    answer?: string;
    created_at?: string;
}>, events?: Array<{
    event_type: string;
    metadata?: any;
    created_at?: string;
}>, gaps?: Array<{
    canonical_question?: string;
    question?: string;
    occurrence_count?: number;
}>, conflicts?: KnowledgeConflictItem[]): FaqHealthDetail[];
export declare function inferQueryDomain(normalizedText: string): KnowledgeDomain;
export declare function calculateKnowledgeCoverage(faqs: Array<{
    id: string;
    question: string;
}>, policies?: NegativePolicy[], events?: Array<{
    event_type: string;
    intent?: string;
    metadata?: any;
}>, gaps?: Array<{
    canonical_question?: string;
    occurrence_count?: number;
}>): DomainCoverageReport;
export declare function clusterKnowledgeQueries(rawQueries: Array<{
    query: string;
    userId?: string;
    createdAt?: string;
}>, faqs?: Array<{
    id: string;
    question: string;
}>, policies?: NegativePolicy[]): QueryCluster[];
export declare function detectEmergingTopics(_events: Array<{
    event_type: string;
    metadata?: any;
    created_at?: string;
}>, gaps?: Array<{
    canonical_question?: string;
    occurrence_count?: number;
    first_seen_at?: string;
    last_seen_at?: string;
}>): EmergingTopic[];
export declare function analyzeNegativePolicyIntelligence(policies: NegativePolicy[], events?: Array<{
    event_type: string;
    metadata?: any;
    created_at?: string;
}>, conflicts?: KnowledgeConflictItem[]): NegativePolicyIntelligenceItem[];
export declare function detectKnowledgeConflicts(faqs: Array<{
    id: string;
    question: string;
    answer?: string;
}>, policies?: NegativePolicy[]): KnowledgeConflictItem[];
export declare function generateKnowledgeRecommendations(faqHealths: FaqHealthDetail[], coverage: DomainCoverageReport, emergingTopics: EmergingTopic[], conflicts: KnowledgeConflictItem[], policyIntel: NegativePolicyIntelligenceItem[], regression?: KnowledgeRegressionReport): AdminRecommendation[];
export declare function analyzeKnowledgeRegression(faqId: string, question: string, beforeSupportedVariants: number, afterSupportedVariants: number, sampleQueries?: string[]): KnowledgeRegressionDetail;
export declare function getIntelligenceDashboardSummary(forceRefresh?: boolean): Promise<IntelligenceDashboardSummary>;
