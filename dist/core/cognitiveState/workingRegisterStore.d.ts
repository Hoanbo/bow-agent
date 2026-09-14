import { type CognitiveStateDocument, type WorkingRegisters, type AttentionState, type CognitiveLifecycleState } from './cognitiveStateTypes.js';
export interface RegisterStoreMutationOptions {
    readonly expectedVersion: number;
    readonly mutatedBy: string;
    readonly mutationReason: string;
    readonly timestamp?: string;
}
export declare class WorkingRegisterStore {
    private currentDoc;
    constructor(initialDoc?: CognitiveStateDocument);
    /**
     * Creates a default genesis cognitive state document.
     */
    createDefaultDocument(tenantId: string, sessionId: string, stateVersion?: number, previousHash?: string): CognitiveStateDocument;
    /**
     * Initializes store with specific tenant and session identity.
     */
    initialize(tenantId: string, sessionId: string): CognitiveStateDocument;
    /**
     * Returns a defensive immutable snapshot of the current state document.
     */
    snapshot(): CognitiveStateDocument;
    get stateVersion(): number;
    get lifecycleState(): CognitiveLifecycleState;
    get tenantId(): string;
    get sessionId(): string;
    /**
     * Transitions lifecycle state, validating legal transition rules.
     */
    transitionLifecycle(targetState: CognitiveLifecycleState, options: RegisterStoreMutationOptions): CognitiveStateDocument;
    /**
     * Patches working registers using an update object.
     * Performs structural CoT checks, enforces observation ring buffer limits (<= 10),
     * validates size ceiling (<= 512 KB), and increments version by exactly 1.
     */
    updateRegisters(patch: Partial<WorkingRegisters>, options: RegisterStoreMutationOptions): CognitiveStateDocument;
    /**
     * Updates attention state directly.
     */
    updateAttention(attention: AttentionState, options: RegisterStoreMutationOptions): CognitiveStateDocument;
    /**
     * Loads an existing rehydrated state document into the store.
     */
    loadDocument(doc: CognitiveStateDocument): void;
    /**
     * Internal mutation helper executing OCC, size bounds, and provenance chaining.
     */
    private applyMutation;
    private verifyExpectedVersion;
}
