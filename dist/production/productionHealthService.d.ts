import type { ProductionHealthScore, ProductionControlCenterSummary } from '../monitoring/analyticsTypes.js';
export interface HealthScoreInput {
    reliability?: number;
    latency?: number;
    errorHealth?: number;
    routingHealth?: number;
    knowledgeHealth?: number;
    securityHealth?: number;
    capacityHealth?: number;
    sloCompliance?: number;
    incidentHealth?: number;
    hasTransactionBoundaryBreach?: boolean;
    hasDurationRegression?: boolean;
    hasWarrantyBreach?: boolean;
    hasProductDemandAutoCreation?: boolean;
    hasNegativePolicyLoop?: boolean;
    hasUnauthorizedMutationAttempt?: boolean;
    hasPiiLeakage?: boolean;
    hasCriticalSecurityIncident?: boolean;
}
export declare function calculateProductionHealthScore(input: HealthScoreInput): ProductionHealthScore;
export declare function getProductionControlCenterSummary(forceRefresh?: boolean): ProductionControlCenterSummary;
export declare function clearProductionSummaryCache(): void;
