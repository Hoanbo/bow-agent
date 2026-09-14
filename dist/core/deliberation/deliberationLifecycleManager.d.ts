import { type DeliberationSessionDocument, type DeliberationSessionStatus, type DeliberationOrigin, type HypothesisProposalInput, type SymbolicConstraintPolarity } from './deliberationTypes.js';
import { type HypothesisEngine } from './hypothesisEngine.js';
import { type EvidenceBindingEngine } from './evidenceBindingEngine.js';
import { type SymbolicConstraintEngine } from './symbolicConstraintEngine.js';
import { type DeliberationSearchEngine } from './deliberationSearchEngine.js';
import { type ContradictionResolver } from './contradictionResolver.js';
import { WorkingRegisterStore } from '../cognitiveState/workingRegisterStore.js';
export declare const LEGAL_DELIBERATION_TRANSITIONS: Readonly<Record<DeliberationSessionStatus, readonly DeliberationSessionStatus[]>>;
export interface LifecycleManagerOptions {
    readonly hypothesisEngine?: HypothesisEngine;
    readonly evidenceEngine?: EvidenceBindingEngine;
    readonly constraintEngine?: SymbolicConstraintEngine;
    readonly searchEngine?: DeliberationSearchEngine;
    readonly contradictionResolver?: ContradictionResolver;
    readonly workingRegisterStore?: WorkingRegisterStore;
    readonly userStopProvider?: () => boolean;
}
export declare class DeliberationLifecycleManager {
    private readonly hypothesisEngine;
    private readonly evidenceEngine;
    private readonly constraintEngine;
    private readonly searchEngine;
    private readonly contradictionResolver;
    private readonly workingRegisterStore?;
    private readonly userStopProvider;
    constructor(options?: LifecycleManagerOptions);
    /**
     * Initializes a brand new DeliberationSessionDocument in status 'INITIALIZING'.
     */
    createSession(tenantId: string, origin: DeliberationOrigin, targetGoalId?: string, customCreatedAt?: string): DeliberationSessionDocument;
    /**
     * Adds an untrusted hypothesis proposal to the session with OCC check.
     */
    addHypothesis(doc: DeliberationSessionDocument, proposal: HypothesisProposalInput, expectedVersion: number): DeliberationSessionDocument;
    /**
     * Binds evidence into the deliberation session with OCC check.
     */
    addEvidence(doc: DeliberationSessionDocument, evidenceInput: Parameters<EvidenceBindingEngine['bindEvidence']>[0], expectedVersion: number): DeliberationSessionDocument;
    /**
     * Adds a symbolic constraint to the session with OCC check.
     */
    addConstraint(doc: DeliberationSessionDocument, constraintInput: {
        constraintId: string;
        predicate: string;
        polarity: SymbolicConstraintPolarity;
        sourceGoalId?: string;
        description?: string;
    }, expectedVersion: number): DeliberationSessionDocument;
    /**
     * Transitions session from INITIALIZING to DELIBERATING.
     */
    startDeliberation(doc: DeliberationSessionDocument, expectedVersion: number): DeliberationSessionDocument;
    /**
     * Evaluates contradictions, runs bounded search, and advances the session.
     */
    evaluateAndAdvance(doc: DeliberationSessionDocument, expectedVersion: number): DeliberationSessionDocument;
    /**
     * Finalizes a CONVERGED deliberation into an immutable RESOLVED DeliberationResult.
     */
    resolveSession(doc: DeliberationSessionDocument, expectedVersion: number, recommendedAction?: string): DeliberationSessionDocument;
    /**
     * Governed abort of a deliberation session.
     */
    abortSession(doc: DeliberationSessionDocument, expectedVersion: number, reason: string): DeliberationSessionDocument;
    private assertMutationPreconditions;
    private assertLegalTransition;
    /**
     * Transient projection to working registers (NOT durable source of truth).
     */
    private projectTransientRegisters;
}
export declare const globalDeliberationLifecycleManager: DeliberationLifecycleManager;
