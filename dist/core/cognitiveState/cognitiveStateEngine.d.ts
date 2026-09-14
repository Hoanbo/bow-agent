import { type CognitiveStateDocument, type WorkingRegisters, type AttentionTargetDescriptor, type CognitiveLifecycleState } from './cognitiveStateTypes.js';
import { WorkingRegisterStore } from './workingRegisterStore.js';
import { AttentionStateManager } from './attentionStateManager.js';
import { CognitiveStatePersistenceEngine, type CognitivePersistenceOptions } from './cognitiveStatePersistence.js';
import { CognitiveStateRecoveryEngine, type CognitiveStateRecoveryResult } from './cognitiveStateRecovery.js';
import { type CognitivePromotionRequest, type CognitivePromotionApproval } from './cognitiveStatePromotionGate.js';
import { CognitiveStateExecutionGate } from './cognitiveStateExecutionGate.js';
export interface CognitiveStateEngineOptions extends CognitivePersistenceOptions {
    readonly executionGate?: CognitiveStateExecutionGate;
    readonly persistenceEngine?: CognitiveStatePersistenceEngine;
    readonly recoveryEngine?: CognitiveStateRecoveryEngine;
    readonly userStopProvider?: () => boolean;
}
export declare class CognitiveStateEngine {
    readonly store: WorkingRegisterStore;
    readonly attentionManager: AttentionStateManager;
    readonly persistence: CognitiveStatePersistenceEngine;
    readonly recovery: CognitiveStateRecoveryEngine;
    readonly gate: CognitiveStateExecutionGate;
    constructor(options?: CognitiveStateEngineOptions);
    /**
     * Initializes or rehydrates a tenant and session partition.
     * If state already exists on disk, recovers it safely; otherwise creates fresh genesis document.
     */
    initializeSession(tenantId: string, sessionId: string, activeTenantId?: string): CognitiveStateRecoveryResult;
    /**
     * Returns current immutable cognitive state document.
     */
    getState(): CognitiveStateDocument;
    /**
     * Updates working registers under Optimistic Concurrency Control (OCC) and persists atomically.
     */
    updateRegisters(patch: Partial<WorkingRegisters>, options: {
        readonly expectedVersion: number;
        readonly mutatedBy: string;
        readonly mutationReason: string;
        readonly activeTenantId?: string;
    }): CognitiveStateDocument;
    /**
     * Sets primary attention target and synchronizes working registers.
     */
    setAttentionTarget(target: AttentionTargetDescriptor | null, options: {
        readonly expectedVersion: number;
        readonly mutatedBy: string;
        readonly mutationReason: string;
        readonly activeTenantId?: string;
    }): CognitiveStateDocument;
    /**
     * Interrupts current attention with a higher-priority target, pushing current attention to stack.
     */
    interruptAttention(newTarget: AttentionTargetDescriptor, interruptedBy: string, activePriority: number, options: {
        readonly expectedVersion: number;
        readonly mutationReason: string;
        readonly activeTenantId?: string;
    }): CognitiveStateDocument;
    /**
     * Resumes previous attention frame from attention stack.
     */
    resumeAttention(options: {
        readonly expectedVersion: number;
        readonly mutatedBy: string;
        readonly mutationReason: string;
        readonly activeTenantId?: string;
    }): {
        readonly resumed: boolean;
        readonly document: CognitiveStateDocument;
    };
    /**
     * Transitions lifecycle state and persists to disk.
     */
    transitionLifecycle(targetState: CognitiveLifecycleState, options: {
        readonly expectedVersion: number;
        readonly mutatedBy: string;
        readonly mutationReason: string;
        readonly activeTenantId?: string;
    }): CognitiveStateDocument;
    /**
     * Evaluates memory promotion candidate via CognitiveStatePromotionGate.
     */
    evaluatePromotion(request: CognitivePromotionRequest): CognitivePromotionApproval;
}
export declare const globalCognitiveStateEngine: CognitiveStateEngine;
