import { StrategicIndexEntry, StrategicMemoryRecord } from './GovernedStrategicMemoryTypes';
export declare class StrategicKnowledgeIndexingEngine {
    private readonly indexEntries;
    private readonly tenantMissionIndex;
    private readonly tenantFederationIndex;
    private readonly lineageGraph;
    indexRecord(record: StrategicMemoryRecord, parentRecordIds?: string[]): StrategicIndexEntry;
    findRecordsByMission(tenantId: string, missionId: string): string[];
    findRecordsByFederation(tenantId: string, federationId: string): string[];
    clear(): void;
    private validateLineageAndDetectCycles;
    private reachesNode;
    private computeAncestorDepth;
    private extractKeywords;
    private assertValidTenant;
}
