// src/core/cognitiveState/workingRegisterStore.ts
// BOWCON V4.0 — MS-1.5.02: WORKING REGISTER STORE
// Component 990 — REAL
//
// Invariants:
// STALE_WRITE_MUST_NEVER_OVERWRITE_NEWER_STATE == TRUE
// FAIL_CLOSED_ON_CONCURRENCY_VIOLATION == TRUE
// NO_RAW_CHAIN_OF_THOUGHT_PERSISTENCE == TRUE
// MAX_512KB_PARTITION_SIZE_ENFORCED == TRUE
// RECENT_OBSERVATIONS_RING_BUFFER_CAPPED_AT_10 == TRUE

import {
  COGNITIVE_STATE_SCHEMA_VERSION,
  MAX_COGNITIVE_STATE_BYTES,
  MAX_RECENT_OBSERVATIONS,
  GENESIS_PREVIOUS_HASH,
  type CognitiveStateDocument,
  type WorkingRegisters,
  type AttentionState,
  type CognitiveLifecycleState,
  LEGAL_LIFECYCLE_TRANSITIONS,
  CognitiveStateValidationError,
  CognitiveStateConcurrencyError,
  CognitiveStateSizeLimitError,
  CognitiveStateTransitionError,
  computeCognitiveStateHash,
  canonicalizeStateValue,
} from './cognitiveStateTypes.js';

export interface RegisterStoreMutationOptions {
  readonly expectedVersion: number;
  readonly mutatedBy: string;
  readonly mutationReason: string;
  readonly timestamp?: string;
}

export class WorkingRegisterStore {
  private currentDoc: CognitiveStateDocument;

  constructor(initialDoc?: CognitiveStateDocument) {
    if (initialDoc) {
      this.currentDoc = initialDoc;
    } else {
      this.currentDoc = this.createDefaultDocument('default_tenant', 'default_session');
    }
  }

  /**
   * Creates a default genesis cognitive state document.
   */
  public createDefaultDocument(
    tenantId: string,
    sessionId: string,
    stateVersion = 1,
    previousHash = GENESIS_PREVIOUS_HASH
  ): CognitiveStateDocument {
    const timestamp = new Date().toISOString();
    const registers: WorkingRegisters = Object.freeze({
      current_focus: null,
      active_intent: null,
      active_goal_ref: null,
      attention_target: null,
      active_constraints: Object.freeze([]),
      active_entities: Object.freeze({}),
      unresolved_questions: Object.freeze([]),
      hypotheses: Object.freeze([]),
      pending_decisions: Object.freeze([]),
      recent_observations: Object.freeze([]),
      current_environment: Object.freeze({}),
      active_task_ref: null,
      cognitive_priority: 0.5,
      uncertainty_state: Object.freeze({}),
      last_verified_state: null,
    });

    const attention: AttentionState = Object.freeze({
      primaryTarget: null,
      secondaryTargets: Object.freeze([]),
      stack: Object.freeze([]),
    });

    const candidateDoc: CognitiveStateDocument = {
      schemaVersion: COGNITIVE_STATE_SCHEMA_VERSION,
      tenantId: tenantId.trim(),
      sessionId: sessionId.trim(),
      stateVersion,
      lifecycleState: 'ACTIVE',
      registers,
      attention,
      provenance: {
        stateHash: '',
        previousStateHash: previousHash,
        stateVersion,
        mutatedBy: 'genesis',
        mutationReason: 'initial_state_creation',
        timestamp,
      },
    };

    const stateHash = computeCognitiveStateHash(candidateDoc);
    return Object.freeze({
      ...candidateDoc,
      provenance: Object.freeze({
        ...candidateDoc.provenance,
        stateHash,
      }),
    });
  }

  /**
   * Initializes store with specific tenant and session identity.
   */
  public initialize(tenantId: string, sessionId: string): CognitiveStateDocument {
    this.currentDoc = this.createDefaultDocument(tenantId, sessionId);
    return this.snapshot();
  }

  /**
   * Returns a defensive immutable snapshot of the current state document.
   */
  public snapshot(): CognitiveStateDocument {
    return Object.freeze({
      ...this.currentDoc,
      registers: Object.freeze({ ...this.currentDoc.registers }),
      attention: Object.freeze({ ...this.currentDoc.attention }),
      provenance: Object.freeze({ ...this.currentDoc.provenance }),
    });
  }

  public get stateVersion(): number {
    return this.currentDoc.stateVersion;
  }

  public get lifecycleState(): CognitiveLifecycleState {
    return this.currentDoc.lifecycleState;
  }

  public get tenantId(): string {
    return this.currentDoc.tenantId;
  }

  public get sessionId(): string {
    return this.currentDoc.sessionId;
  }

  /**
   * Transitions lifecycle state, validating legal transition rules.
   */
  public transitionLifecycle(
    targetState: CognitiveLifecycleState,
    options: RegisterStoreMutationOptions
  ): CognitiveStateDocument {
    this.verifyExpectedVersion(options.expectedVersion);

    const fromState = this.currentDoc.lifecycleState;
    const allowed = LEGAL_LIFECYCLE_TRANSITIONS[fromState] || [];
    if (!allowed.includes(targetState)) {
      throw new CognitiveStateTransitionError(fromState, targetState, options.mutationReason);
    }

    return this.applyMutation((prevDoc) => ({
      ...prevDoc,
      lifecycleState: targetState,
    }), options);
  }

  /**
   * Patches working registers using an update object.
   * Performs structural CoT checks, enforces observation ring buffer limits (<= 10),
   * validates size ceiling (<= 512 KB), and increments version by exactly 1.
   */
  public updateRegisters(
    patch: Partial<WorkingRegisters>,
    options: RegisterStoreMutationOptions
  ): CognitiveStateDocument {
    this.verifyExpectedVersion(options.expectedVersion);

    // Verify no prototype pollution or CoT tokens in patch
    canonicalizeStateValue(patch);

    return this.applyMutation((prevDoc) => {
      let nextObservations = patch.recent_observations !== undefined
        ? patch.recent_observations
        : prevDoc.registers.recent_observations;

      // Enforce ring buffer ceiling (max 10 recent observations)
      if (nextObservations && nextObservations.length > MAX_RECENT_OBSERVATIONS) {
        nextObservations = nextObservations.slice(nextObservations.length - MAX_RECENT_OBSERVATIONS);
      }

      // Validate priority range
      let priority = patch.cognitive_priority !== undefined ? patch.cognitive_priority : prevDoc.registers.cognitive_priority;
      if (typeof priority === 'number') {
        priority = Math.max(0.0, Math.min(1.0, priority));
      }

      const mergedRegisters: WorkingRegisters = Object.freeze({
        ...prevDoc.registers,
        ...patch,
        recent_observations: Object.freeze([...(nextObservations || [])]),
        cognitive_priority: priority,
      });

      return {
        ...prevDoc,
        registers: mergedRegisters,
      };
    }, options);
  }

  /**
   * Updates attention state directly.
   */
  public updateAttention(
    attention: AttentionState,
    options: RegisterStoreMutationOptions
  ): CognitiveStateDocument {
    this.verifyExpectedVersion(options.expectedVersion);
    canonicalizeStateValue(attention);

    return this.applyMutation((prevDoc) => ({
      ...prevDoc,
      attention: Object.freeze({
        primaryTarget: attention.primaryTarget || null,
        secondaryTargets: Object.freeze([...(attention.secondaryTargets || [])]),
        stack: Object.freeze([...(attention.stack || [])]),
      }),
    }), options);
  }

  /**
   * Loads an existing rehydrated state document into the store.
   */
  public loadDocument(doc: CognitiveStateDocument): void {
    if (!doc || typeof doc !== 'object') {
      throw new CognitiveStateValidationError('Document to load must be an object', ['INVALID_DOC']);
    }
    this.currentDoc = Object.freeze({ ...doc });
  }

  /**
   * Internal mutation helper executing OCC, size bounds, and provenance chaining.
   */
  private applyMutation(
    transformer: (prev: CognitiveStateDocument) => Omit<CognitiveStateDocument, 'stateVersion' | 'provenance'>,
    options: RegisterStoreMutationOptions
  ): CognitiveStateDocument {
    const prevVersion = this.currentDoc.stateVersion;
    const nextVersion = prevVersion + 1;
    const previousStateHash = this.currentDoc.provenance.stateHash;
    const timestamp = options.timestamp || new Date().toISOString();

    const transformed = transformer(this.currentDoc);

    const draftDoc: CognitiveStateDocument = {
      ...transformed,
      stateVersion: nextVersion,
      provenance: {
        stateHash: '',
        previousStateHash,
        stateVersion: nextVersion,
        mutatedBy: options.mutatedBy.trim(),
        mutationReason: options.mutationReason.trim(),
        timestamp,
      },
    };

    // Calculate canonical size
    const serialized = JSON.stringify(canonicalizeStateValue(draftDoc));
    const byteLength = Buffer.byteLength(serialized, 'utf8');
    if (byteLength > MAX_COGNITIVE_STATE_BYTES) {
      throw new CognitiveStateSizeLimitError(byteLength, MAX_COGNITIVE_STATE_BYTES);
    }

    const stateHash = computeCognitiveStateHash(draftDoc);
    const finalDoc: CognitiveStateDocument = Object.freeze({
      ...draftDoc,
      provenance: Object.freeze({
        ...draftDoc.provenance,
        stateHash,
      }),
    });

    this.currentDoc = finalDoc;
    return this.snapshot();
  }

  private verifyExpectedVersion(expectedVersion: number): void {
    if (this.currentDoc.stateVersion !== expectedVersion) {
      throw new CognitiveStateConcurrencyError(expectedVersion, this.currentDoc.stateVersion);
    }
  }
}
