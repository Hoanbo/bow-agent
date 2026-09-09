import { PersonalOperatingModel } from './partnershipTypes';
import { PersonalMemoryStore } from './personalMemoryStore';
import { PersonalKnowledgeGraph } from './personalKnowledgeGraph';
import { ContradictionEngine } from './contradictionEngine';
export declare class PersonalOperatingModelManager {
    private currentModel?;
    private readonly storageFilePath?;
    constructor(storageFilePath?: string);
    /**
     * Reconstruct the operating model from underlying stores.
     */
    reconstructModel(context: {
        memoryStore: PersonalMemoryStore;
        knowledgeGraph: PersonalKnowledgeGraph;
        contradictionEngine: ContradictionEngine;
        availableCapabilities?: string[];
        pendingAuthorizations?: number;
        currentObjective?: string;
        currentTask?: string;
        lastVerifiedOutcome?: string;
    }): PersonalOperatingModel;
    /**
     * Format the current world model as structured text (Section 17).
     */
    formatWorldModel(model?: PersonalOperatingModel): string;
    /**
     * Save model to disk.
     */
    saveToDisk(): void;
    /**
     * Load model from disk after restart.
     */
    loadFromDisk(): PersonalOperatingModel | null;
    /**
     * Retrieve current model in memory.
     */
    getCurrentModel(): PersonalOperatingModel | undefined;
}
