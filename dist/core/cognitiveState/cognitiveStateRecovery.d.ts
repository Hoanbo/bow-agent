import { type CognitiveStateDocument } from './cognitiveStateTypes.js';
import { CognitiveStatePersistenceEngine } from './cognitiveStatePersistence.js';
import { WorkingRegisterStore } from './workingRegisterStore.js';
export interface CognitiveStateRecoveryResult {
    readonly recovered: boolean;
    readonly document: CognitiveStateDocument | null;
    readonly source: 'CANONICAL' | 'BACKUP' | 'FRESH_INITIALIZED' | 'NOT_FOUND';
    readonly message: string;
}
export declare class CognitiveStateRecoveryEngine {
    private readonly persistence;
    constructor(persistence?: CognitiveStatePersistenceEngine);
    /**
     * Recovers a persisted cognitive state document, strictly validating integrity and provenance.
     * If the canonical file is corrupted or tampered, attempts safe recovery from backup.
     */
    recover(tenantId: string, sessionId: string, activeTenantId?: string): CognitiveStateRecoveryResult;
    /**
     * Rehydrates an existing WorkingRegisterStore from disk, or initializes fresh state if none exists.
     */
    rehydrateStore(store: WorkingRegisterStore, tenantId: string, sessionId: string, activeTenantId?: string): CognitiveStateRecoveryResult;
    /**
     * Safely loads, parses, and validates a state document from a given file path.
     */
    private loadAndValidateFile;
}
