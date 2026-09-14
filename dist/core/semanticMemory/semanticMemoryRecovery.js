// src/core/semanticMemory/semanticMemoryRecovery.ts
// BOWCON V4.0 — MS-1.5.03: SEMANTIC MEMORY RECOVERY & REBUILD ENGINE
// Component 1006 — REAL
//
// Invariants:
// DETERMINISTIC_IDEMPOTENT_REBUILD == TRUE
// ZERO_DATA_INVENTION == TRUE
// CANONICAL_MEMORY_AUTHORITY == TRUE
// USER_STOP_SUPREMACY == TRUE
import { NativeVectorIndex } from './nativeVectorIndex.js';
import { SemanticMemoryPersistenceEngine } from './semanticMemoryPersistence.js';
import { SemanticMemoryProjectionEngine } from './semanticMemoryProjectionEngine.js';
import { SemanticMemoryUserStopError } from './semanticMemoryTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class SemanticMemoryRecoveryEngine {
    persistence;
    projection;
    userStopProvider;
    constructor(persistence, projection, userStopProvider) {
        this.persistence = persistence || new SemanticMemoryPersistenceEngine();
        this.projection = projection || new SemanticMemoryProjectionEngine();
        this.userStopProvider =
            userStopProvider || (() => globalMasterHumanAuthority.isUserStopActive);
    }
    /**
     * Rehydrates a NativeVectorIndex from disk, safely falling back to backup if canonical is corrupted.
     * If no partition exists, returns an empty clean index.
     */
    rehydrateIndex(tenantId, activeTenantId) {
        const doc = this.persistence.loadIndexDocument(tenantId, activeTenantId);
        const index = new NativeVectorIndex({
            tenantId,
            modelId: doc?.modelId,
            dimension: doc?.dimension,
        });
        if (doc && Array.isArray(doc.entries)) {
            for (const entry of doc.entries) {
                index.insert(entry, activeTenantId);
            }
        }
        return index;
    }
    /**
     * Deterministically and idempotently rebuilds the semantic vector index from canonical episodic memory records.
     * Never invents data; reads exclusively from authoritative canonical stores.
     */
    async rebuildFromEpisodicStore(tenantId, episodicStore, provider, activeTenantId, signal) {
        if (this.userStopProvider()) {
            throw new SemanticMemoryUserStopError('rebuild_from_episodic_store');
        }
        const canonicalRecords = episodicStore.listMemories(tenantId);
        const index = new NativeVectorIndex({ tenantId });
        let indexedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        for (const rec of canonicalRecords) {
            if (this.userStopProvider()) {
                throw new SemanticMemoryUserStopError('rebuild_loop_interrupted');
            }
            try {
                const textToEmbed = `${rec.toolName}: ${JSON.stringify(rec.stateDelta)}`;
                const projected = await this.projection.project({
                    memoryId: rec.memoryId,
                    tenantId: rec.tenantId,
                    sourceDomain: 'EPISODIC',
                    rawText: textToEmbed,
                    metadata: {
                        taskId: rec.taskId,
                        stepId: rec.stepId,
                        toolName: rec.toolName,
                        taskVersion: rec.taskVersion,
                    },
                }, provider, signal);
                index.insert(projected, activeTenantId);
                indexedCount++;
            }
            catch {
                errorCount++;
            }
        }
        // Persist rebuilt index atomically
        this.persistence.saveIndex(index, 1, activeTenantId);
        const report = Object.freeze({
            tenantId,
            canonicalRecordsScanned: canonicalRecords.length,
            indexedCount,
            skippedCount,
            errorCount,
            rebuiltAt: new Date().toISOString(),
        });
        return Object.freeze({ index, report });
    }
}
