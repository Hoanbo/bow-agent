import { type GoalGraphDocument, type GoalConflictDescriptor } from './goalTypes.js';
import { PriorityGraphEngine } from './priorityGraphEngine.js';
export interface GoalPersistenceOptions {
    readonly partitionBaseDir?: string;
    readonly baseDir?: string;
    readonly userStopProvider?: () => boolean;
}
export declare class GoalPersistenceEngine {
    readonly baseDir: string;
    private readonly userStopProvider;
    constructor(options?: GoalPersistenceOptions);
    private ensureBaseDir;
    /**
     * Resolves safe partition file path for a tenant's goal graph.
     */
    resolvePartitionFilePath(tenantId: string): string;
    /**
     * Saves a PriorityGraphEngine partition to disk atomically with OCC verification.
     */
    saveGraph(graph: PriorityGraphEngine, expectedGraphVersion?: number, conflicts?: readonly GoalConflictDescriptor[], activeTenantId?: string): {
        readonly filePath: string;
        readonly bytesWritten: number;
        readonly graphVersion: number;
    };
    /**
     * Loads and validates a GoalGraphDocument from disk partition.
     * If primary file is corrupted, attempts fallback to .bak snapshot.
     */
    loadGraphDocument(tenantId: string, activeTenantId?: string): GoalGraphDocument | null;
}
export declare const globalGoalPersistenceEngine: GoalPersistenceEngine;
