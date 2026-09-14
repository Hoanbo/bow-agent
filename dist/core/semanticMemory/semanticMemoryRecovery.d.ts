import { NativeVectorIndex } from './nativeVectorIndex.js';
import { SemanticMemoryPersistenceEngine } from './semanticMemoryPersistence.js';
import { SemanticMemoryProjectionEngine } from './semanticMemoryProjectionEngine.js';
import { type LocalEmbeddingProvider } from './localEmbeddingProvider.js';
import { type EpisodicMemoryStore } from '../episodicMemory/episodicMemoryStore.js';
export interface RebuildReport {
    readonly tenantId: string;
    readonly canonicalRecordsScanned: number;
    readonly indexedCount: number;
    readonly skippedCount: number;
    readonly errorCount: number;
    readonly rebuiltAt: string;
}
export declare class SemanticMemoryRecoveryEngine {
    private readonly persistence;
    private readonly projection;
    private readonly userStopProvider;
    constructor(persistence?: SemanticMemoryPersistenceEngine, projection?: SemanticMemoryProjectionEngine, userStopProvider?: () => boolean);
    /**
     * Rehydrates a NativeVectorIndex from disk, safely falling back to backup if canonical is corrupted.
     * If no partition exists, returns an empty clean index.
     */
    rehydrateIndex(tenantId: string, activeTenantId?: string): NativeVectorIndex;
    /**
     * Deterministically and idempotently rebuilds the semantic vector index from canonical episodic memory records.
     * Never invents data; reads exclusively from authoritative canonical stores.
     */
    rebuildFromEpisodicStore(tenantId: string, episodicStore: EpisodicMemoryStore, provider: LocalEmbeddingProvider, activeTenantId?: string, signal?: AbortSignal): Promise<{
        readonly index: NativeVectorIndex;
        readonly report: RebuildReport;
    }>;
}
