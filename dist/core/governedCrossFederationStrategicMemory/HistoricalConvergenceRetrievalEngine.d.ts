import { StrategicRetrievalQuery, StrategicRetrievalResult } from './GovernedStrategicMemoryTypes';
import { CrossFederationStrategicMemoryRegistry } from './CrossFederationStrategicMemoryRegistry';
export declare class HistoricalConvergenceRetrievalEngine {
    private readonly registry;
    private activeQueriesCount;
    constructor(registry: CrossFederationStrategicMemoryRegistry);
    query(query: StrategicRetrievalQuery): {
        queryHash: string;
        results: StrategicRetrievalResult[];
    };
    private computeRelevanceScore;
    private assertValidTenant;
}
