// src/core/cognitiveState/cognitiveStateEngine.ts
// BOWCON V4.0 — MS-1.5.02: MASTER COGNITIVE STATE ENGINE FAÇADE
// Component 996 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// REASONING != AUTHORIZATION
// COGNITIVE_STATE != EXECUTION
// USER_STOP_SUPREMACY == TRUE
// OCC_ENFORCED_ON_ALL_MUTATIONS == TRUE
// ATOMIC_CRASH_SAFE_PERSISTENCE == TRUE
import { WorkingRegisterStore } from './workingRegisterStore.js';
import { AttentionStateManager } from './attentionStateManager.js';
import { CognitiveStatePersistenceEngine } from './cognitiveStatePersistence.js';
import { CognitiveStateRecoveryEngine } from './cognitiveStateRecovery.js';
import { CognitiveStatePromotionGate } from './cognitiveStatePromotionGate.js';
import { CognitiveStateExecutionGate, defaultCognitiveExecutionGate } from './cognitiveStateExecutionGate.js';
export class CognitiveStateEngine {
    store;
    attentionManager;
    persistence;
    recovery;
    gate;
    constructor(options) {
        this.gate = options?.executionGate || (options?.userStopProvider ? new CognitiveStateExecutionGate(options.userStopProvider) : defaultCognitiveExecutionGate);
        this.persistence = options?.persistenceEngine || new CognitiveStatePersistenceEngine(options);
        this.recovery = options?.recoveryEngine || new CognitiveStateRecoveryEngine(this.persistence);
        this.store = new WorkingRegisterStore();
        this.attentionManager = new AttentionStateManager();
    }
    /**
     * Initializes or rehydrates a tenant and session partition.
     * If state already exists on disk, recovers it safely; otherwise creates fresh genesis document.
     */
    initializeSession(tenantId, sessionId, activeTenantId) {
        this.gate.assertNoUserStop('initialize_session');
        this.gate.assertTenantIsolation(tenantId, activeTenantId);
        this.gate.assertSafeIdentity(sessionId, 'sessionId');
        const result = this.recovery.rehydrateStore(this.store, tenantId, sessionId, activeTenantId);
        if (result.document) {
            this.attentionManager.clear();
            if (result.document.attention) {
                this.attentionManager.setPrimaryTarget(result.document.attention.primaryTarget);
                this.attentionManager.setSecondaryTargets(result.document.attention.secondaryTargets || []);
            }
            // If newly initialized fresh document, persist it
            if (result.source === 'FRESH_INITIALIZED') {
                this.persistence.save(result.document, activeTenantId);
            }
        }
        this.gate.assertNoExecutionAuthority(result.document);
        return result;
    }
    /**
     * Returns current immutable cognitive state document.
     */
    getState() {
        const doc = this.store.snapshot();
        this.gate.assertNoExecutionAuthority(doc);
        return doc;
    }
    /**
     * Updates working registers under Optimistic Concurrency Control (OCC) and persists atomically.
     */
    updateRegisters(patch, options) {
        this.gate.assertNoUserStop('update_registers');
        this.gate.assertTenantIsolation(this.store.tenantId, options.activeTenantId);
        // 1. Update registers in in-memory store (increments stateVersion, checks OCC, checks size)
        const updatedDoc = this.store.updateRegisters(patch, {
            expectedVersion: options.expectedVersion,
            mutatedBy: options.mutatedBy,
            mutationReason: options.mutationReason,
        });
        // 2. Synchronize attention target if modified in patch
        if (patch.attention_target !== undefined) {
            this.attentionManager.setPrimaryTarget(patch.attention_target);
            this.store.updateAttention(this.attentionManager.currentState, {
                expectedVersion: updatedDoc.stateVersion,
                mutatedBy: options.mutatedBy,
                mutationReason: 'sync_attention_target',
            });
        }
        // 3. Atomically persist to disk
        const finalDoc = this.store.snapshot();
        this.persistence.save(finalDoc, options.activeTenantId);
        this.gate.assertNoExecutionAuthority(finalDoc);
        return finalDoc;
    }
    /**
     * Sets primary attention target and synchronizes working registers.
     */
    setAttentionTarget(target, options) {
        this.gate.assertNoUserStop('set_attention_target');
        this.gate.assertTenantIsolation(this.store.tenantId, options.activeTenantId);
        this.attentionManager.setPrimaryTarget(target);
        const updatedDoc = this.store.updateAttention(this.attentionManager.currentState, options);
        // Sync into working registers
        const finalDoc = this.store.updateRegisters({ attention_target: target }, {
            expectedVersion: updatedDoc.stateVersion,
            mutatedBy: options.mutatedBy,
            mutationReason: 'sync_registers_attention',
        });
        this.persistence.save(finalDoc, options.activeTenantId);
        this.gate.assertNoExecutionAuthority(finalDoc);
        return finalDoc;
    }
    /**
     * Interrupts current attention with a higher-priority target, pushing current attention to stack.
     */
    interruptAttention(newTarget, interruptedBy, activePriority, options) {
        this.gate.assertNoUserStop('interrupt_attention');
        this.gate.assertTenantIsolation(this.store.tenantId, options.activeTenantId);
        this.attentionManager.interrupt(newTarget, interruptedBy, activePriority);
        const doc1 = this.store.transitionLifecycle('INTERRUPTED', {
            expectedVersion: options.expectedVersion,
            mutatedBy: interruptedBy,
            mutationReason: options.mutationReason,
        });
        const doc2 = this.store.updateAttention(this.attentionManager.currentState, {
            expectedVersion: doc1.stateVersion,
            mutatedBy: interruptedBy,
            mutationReason: 'push_attention_stack',
        });
        const finalDoc = this.store.updateRegisters({
            attention_target: newTarget,
            cognitive_priority: activePriority,
        }, {
            expectedVersion: doc2.stateVersion,
            mutatedBy: interruptedBy,
            mutationReason: 'apply_interrupt_registers',
        });
        this.persistence.save(finalDoc, options.activeTenantId);
        this.gate.assertNoExecutionAuthority(finalDoc);
        return finalDoc;
    }
    /**
     * Resumes previous attention frame from attention stack.
     */
    resumeAttention(options) {
        this.gate.assertNoUserStop('resume_attention');
        this.gate.assertTenantIsolation(this.store.tenantId, options.activeTenantId);
        const { resumed, state: nextAttention, restoredFrame } = this.attentionManager.resume();
        if (!resumed) {
            return { resumed: false, document: this.getState() };
        }
        const doc1 = this.store.updateAttention(nextAttention, options);
        const doc2 = this.store.updateRegisters({
            attention_target: nextAttention.primaryTarget,
            cognitive_priority: restoredFrame?.activePriority ?? 0.5,
        }, {
            expectedVersion: doc1.stateVersion,
            mutatedBy: options.mutatedBy,
            mutationReason: 'sync_resumed_registers',
        });
        const finalDoc = this.store.transitionLifecycle('ACTIVE', {
            expectedVersion: doc2.stateVersion,
            mutatedBy: options.mutatedBy,
            mutationReason: 'resume_lifecycle_active',
        });
        this.persistence.save(finalDoc, options.activeTenantId);
        this.gate.assertNoExecutionAuthority(finalDoc);
        return { resumed: true, document: finalDoc };
    }
    /**
     * Transitions lifecycle state and persists to disk.
     */
    transitionLifecycle(targetState, options) {
        this.gate.assertNoUserStop('transition_lifecycle');
        this.gate.assertTenantIsolation(this.store.tenantId, options.activeTenantId);
        const finalDoc = this.store.transitionLifecycle(targetState, options);
        this.persistence.save(finalDoc, options.activeTenantId);
        this.gate.assertNoExecutionAuthority(finalDoc);
        return finalDoc;
    }
    /**
     * Evaluates memory promotion candidate via CognitiveStatePromotionGate.
     */
    evaluatePromotion(request) {
        this.gate.assertNoUserStop('evaluate_promotion');
        return CognitiveStatePromotionGate.evaluatePromotion(request);
    }
}
export const globalCognitiveStateEngine = new CognitiveStateEngine();
