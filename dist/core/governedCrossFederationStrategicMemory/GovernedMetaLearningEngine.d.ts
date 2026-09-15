import { MetaLearningRound, MetaLearningRecommendation, StrategicMemoryRecord } from './GovernedStrategicMemoryTypes';
export declare class GovernedMetaLearningEngine {
    private readonly sessionRoundsCount;
    executeMetaLearningRound(tenantId: string, sessionId: string, records: StrategicMemoryRecord[]): {
        round: MetaLearningRound;
        recommendations: MetaLearningRecommendation[];
    };
    clear(): void;
    private synthesizeAdvisoryRecommendations;
    private assertValidTenant;
}
