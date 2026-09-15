import { StrategicDriftSnapshot, StrategicMemoryRecord } from './GovernedStrategicMemoryTypes';
export declare class StrategicDriftGovernanceEngine {
    private readonly tenantConsecutiveFailures;
    evaluateDrift(tenantId: string, sessionId: string, records: StrategicMemoryRecord[]): StrategicDriftSnapshot;
    clear(): void;
    private computeCategoryDriftScores;
    private computeAggregateScore;
    private classifySeverity;
    private assertValidTenant;
}
