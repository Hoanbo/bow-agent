// src/core/deliberation/deliberationLifecycleManager.ts
// BOWCON V4.0 — MS-1.5.05: DELIBERATION LIFECYCLE MANAGER
// Component 1025 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// DELIBERATION != AUTHORIZATION
// DELIBERATION != EXECUTION
// HYPOTHESIS != FACT
// EVIDENCE != PROOF
// VECTOR MATCH != TRUTH
// PRIORITY != AUTHORIZATION
// USER_STOP > ALL MUTATION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// WORKING STATE != DURABLE TRUTH

import crypto from 'node:crypto';
import {
  type DeliberationSessionDocument,
  type DeliberationSessionStatus,
  type DeliberationOrigin,
  type DeliberationResult,
  type HypothesisProposalInput,
  type EvidenceBinding,
  type SymbolicConstraint,
  type SymbolicConstraintPolarity,
  DELIBERATION_SCHEMA_VERSION,
  DELIBERATION_BOUNDS,
  DeliberationUserStopError,
  DeliberationTransitionError,
  DeliberationConcurrencyError,
  CrossTenantDeliberationError,
  DeliberationCapacityError,
  DeliberationValidationError,
  computeSessionProvenanceHash,
  computeResultHash,
} from './deliberationTypes.js';
import { DeliberationValidator } from './deliberationValidator.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalHypothesisEngine, type HypothesisEngine } from './hypothesisEngine.js';
import { globalEvidenceBindingEngine, type EvidenceBindingEngine } from './evidenceBindingEngine.js';
import { globalSymbolicConstraintEngine, type SymbolicConstraintEngine } from './symbolicConstraintEngine.js';
import { globalDeliberationSearchEngine, type DeliberationSearchEngine } from './deliberationSearchEngine.js';
import { globalContradictionResolver, type ContradictionResolver } from './contradictionResolver.js';
import { WorkingRegisterStore } from '../cognitiveState/workingRegisterStore.js';

export const LEGAL_DELIBERATION_TRANSITIONS: Readonly<Record<DeliberationSessionStatus, readonly DeliberationSessionStatus[]>> = Object.freeze({
  INITIALIZING: Object.freeze(['DELIBERATING', 'ABORTED'] as DeliberationSessionStatus[]),
  DELIBERATING: Object.freeze(['CONVERGED', 'INCONCLUSIVE', 'CONTRADICTED', 'ABORTED'] as DeliberationSessionStatus[]),
  CONVERGED: Object.freeze(['RESOLVED', 'CONTRADICTED', 'ABORTED'] as DeliberationSessionStatus[]),
  RESOLVED: Object.freeze(['ABORTED'] as DeliberationSessionStatus[]),
  INCONCLUSIVE: Object.freeze(['DELIBERATING', 'ABORTED'] as DeliberationSessionStatus[]),
  CONTRADICTED: Object.freeze(['ABORTED'] as DeliberationSessionStatus[]),
  ABORTED: Object.freeze([] as DeliberationSessionStatus[]),
});

export interface LifecycleManagerOptions {
  readonly hypothesisEngine?: HypothesisEngine;
  readonly evidenceEngine?: EvidenceBindingEngine;
  readonly constraintEngine?: SymbolicConstraintEngine;
  readonly searchEngine?: DeliberationSearchEngine;
  readonly contradictionResolver?: ContradictionResolver;
  readonly workingRegisterStore?: WorkingRegisterStore;
  readonly userStopProvider?: () => boolean;
}

export class DeliberationLifecycleManager {
  private readonly hypothesisEngine: HypothesisEngine;
  private readonly evidenceEngine: EvidenceBindingEngine;
  private readonly constraintEngine: SymbolicConstraintEngine;
  private readonly searchEngine: DeliberationSearchEngine;
  private readonly contradictionResolver: ContradictionResolver;
  private readonly workingRegisterStore?: WorkingRegisterStore;
  private readonly userStopProvider: () => boolean;

  constructor(options?: LifecycleManagerOptions) {
    this.hypothesisEngine = options?.hypothesisEngine ?? globalHypothesisEngine;
    this.evidenceEngine = options?.evidenceEngine ?? globalEvidenceBindingEngine;
    this.constraintEngine = options?.constraintEngine ?? globalSymbolicConstraintEngine;
    this.searchEngine = options?.searchEngine ?? globalDeliberationSearchEngine;
    this.contradictionResolver = options?.contradictionResolver ?? globalContradictionResolver;
    this.workingRegisterStore = options?.workingRegisterStore;
    this.userStopProvider =
      options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * Initializes a brand new DeliberationSessionDocument in status 'INITIALIZING'.
   */
  public createSession(
    tenantId: string,
    origin: DeliberationOrigin,
    targetGoalId?: string,
    customCreatedAt?: string
  ): DeliberationSessionDocument {
    if (this.userStopProvider()) {
      throw new DeliberationUserStopError('create_deliberation_session');
    }

    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      throw new DeliberationValidationError('Tenant ID must be a non-empty string', ['invalid_tenantId']);
    }

    const cleanTenant = tenantId.trim();
    const createdAt = customCreatedAt || new Date().toISOString();
    const sessionId = `delib_${crypto.createHash('sha256').update(`${cleanTenant}:${origin}:${createdAt}`).digest('hex').slice(0, 16)}`;

    const draft = {
      schemaVersion: DELIBERATION_SCHEMA_VERSION,
      sessionId,
      tenantId: cleanTenant,
      sessionVersion: 1,
      status: 'INITIALIZING' as DeliberationSessionStatus,
      origin,
      targetGoalId: targetGoalId?.trim(),
      hypotheses: Object.freeze([]),
      evidenceBindings: Object.freeze([]),
      constraints: Object.freeze([]),
      contradictions: Object.freeze([]),
      result: null,
      createdAt,
      updatedAt: createdAt,
    };

    const provenanceHash = computeSessionProvenanceHash(draft);
    const session: DeliberationSessionDocument = Object.freeze({
      ...draft,
      provenanceHash,
    });

    DeliberationValidator.validateSession(session);
    return session;
  }

  /**
   * Adds an untrusted hypothesis proposal to the session with OCC check.
   */
  public addHypothesis(
    doc: DeliberationSessionDocument,
    proposal: HypothesisProposalInput,
    expectedVersion: number
  ): DeliberationSessionDocument {
    this.assertMutationPreconditions(doc, expectedVersion, 'add_hypothesis');

    if (doc.status !== 'INITIALIZING' && doc.status !== 'DELIBERATING') {
      throw new DeliberationTransitionError(doc.status, doc.status, 'Cannot add hypothesis outside INITIALIZING or DELIBERATING');
    }

    if (doc.hypotheses.length >= DELIBERATION_BOUNDS.MAX_HYPOTHESES_PER_SESSION) {
      throw new DeliberationCapacityError(
        doc.hypotheses.length,
        DELIBERATION_BOUNDS.MAX_HYPOTHESES_PER_SESSION,
        'hypotheses per session'
      );
    }

    const newHypo = this.hypothesisEngine.createHypothesis(proposal, doc.sessionId, doc.tenantId);
    const nextHypotheses = Object.freeze([...doc.hypotheses, newHypo]);
    const updatedAt = new Date().toISOString();

    const nextDocDraft = {
      ...doc,
      sessionVersion: doc.sessionVersion + 1,
      hypotheses: nextHypotheses,
      updatedAt,
    };

    const provenanceHash = computeSessionProvenanceHash(nextDocDraft);
    const updated = Object.freeze({ ...nextDocDraft, provenanceHash });
    DeliberationValidator.validateSession(updated);
    this.projectTransientRegisters(updated);
    return updated;
  }

  /**
   * Binds evidence into the deliberation session with OCC check.
   */
  public addEvidence(
    doc: DeliberationSessionDocument,
    evidenceInput: Parameters<EvidenceBindingEngine['bindEvidence']>[0],
    expectedVersion: number
  ): DeliberationSessionDocument {
    this.assertMutationPreconditions(doc, expectedVersion, 'add_evidence');

    if (doc.status !== 'INITIALIZING' && doc.status !== 'DELIBERATING') {
      throw new DeliberationTransitionError(doc.status, doc.status, 'Cannot add evidence outside INITIALIZING or DELIBERATING');
    }

    const bound = this.evidenceEngine.bindEvidence(
      { ...evidenceInput, tenantId: doc.tenantId, sessionId: doc.sessionId },
      doc.tenantId
    );

    const nextEvidence = Object.freeze([...doc.evidenceBindings, bound]);
    const updatedAt = new Date().toISOString();

    const nextDocDraft = {
      ...doc,
      sessionVersion: doc.sessionVersion + 1,
      evidenceBindings: nextEvidence,
      updatedAt,
    };

    const provenanceHash = computeSessionProvenanceHash(nextDocDraft);
    const updated = Object.freeze({ ...nextDocDraft, provenanceHash });
    DeliberationValidator.validateSession(updated);
    return updated;
  }

  /**
   * Adds a symbolic constraint to the session with OCC check.
   */
  public addConstraint(
    doc: DeliberationSessionDocument,
    constraintInput: {
      constraintId: string;
      predicate: string;
      polarity: SymbolicConstraintPolarity;
      sourceGoalId?: string;
      description?: string;
    },
    expectedVersion: number
  ): DeliberationSessionDocument {
    this.assertMutationPreconditions(doc, expectedVersion, 'add_constraint');

    if (doc.constraints.length >= DELIBERATION_BOUNDS.MAX_CONSTRAINTS_PER_SESSION) {
      throw new DeliberationCapacityError(
        doc.constraints.length,
        DELIBERATION_BOUNDS.MAX_CONSTRAINTS_PER_SESSION,
        'constraints per session'
      );
    }

    const constraint = this.constraintEngine.createConstraint(constraintInput);
    const nextConstraints = Object.freeze([...doc.constraints, constraint]);
    const updatedAt = new Date().toISOString();

    const nextDocDraft = {
      ...doc,
      sessionVersion: doc.sessionVersion + 1,
      constraints: nextConstraints,
      updatedAt,
    };

    const provenanceHash = computeSessionProvenanceHash(nextDocDraft);
    const updated = Object.freeze({ ...nextDocDraft, provenanceHash });
    DeliberationValidator.validateSession(updated);
    return updated;
  }

  /**
   * Transitions session from INITIALIZING to DELIBERATING.
   */
  public startDeliberation(
    doc: DeliberationSessionDocument,
    expectedVersion: number
  ): DeliberationSessionDocument {
    this.assertMutationPreconditions(doc, expectedVersion, 'start_deliberation');
    this.assertLegalTransition(doc.status, 'DELIBERATING');

    const updatedAt = new Date().toISOString();
    const nextDocDraft = {
      ...doc,
      sessionVersion: doc.sessionVersion + 1,
      status: 'DELIBERATING' as DeliberationSessionStatus,
      updatedAt,
    };

    const provenanceHash = computeSessionProvenanceHash(nextDocDraft);
    const updated = Object.freeze({ ...nextDocDraft, provenanceHash });
    DeliberationValidator.validateSession(updated);
    this.projectTransientRegisters(updated);
    return updated;
  }

  /**
   * Evaluates contradictions, runs bounded search, and advances the session.
   */
  public evaluateAndAdvance(
    doc: DeliberationSessionDocument,
    expectedVersion: number
  ): DeliberationSessionDocument {
    this.assertMutationPreconditions(doc, expectedVersion, 'evaluate_and_advance');

    if (doc.status !== 'DELIBERATING') {
      throw new DeliberationTransitionError(doc.status, 'DELIBERATING', 'Evaluation requires DELIBERATING status');
    }

    // 1. Contradiction Analysis
    const contradictionAnalysis = this.contradictionResolver.detectAndAnalyze(
      doc.hypotheses,
      doc.constraints,
      doc.evidenceBindings,
      doc.targetGoalId
    );

    // If critical unresolved contradictions exist -> transition to CONTRADICTED
    if (contradictionAnalysis.hasCriticalContradiction) {
      this.assertLegalTransition(doc.status, 'CONTRADICTED');
      const updatedAt = new Date().toISOString();
      const nextDocDraft = {
        ...doc,
        sessionVersion: doc.sessionVersion + 1,
        status: 'CONTRADICTED' as DeliberationSessionStatus,
        contradictions: contradictionAnalysis.contradictions,
        updatedAt,
      };
      const provenanceHash = computeSessionProvenanceHash(nextDocDraft);
      const updated = Object.freeze({ ...nextDocDraft, provenanceHash });
      DeliberationValidator.validateSession(updated);
      this.projectTransientRegisters(updated);
      return updated;
    }

    // 2. Bounded Search & Ranking
    const searchOutcome = this.searchEngine.searchAndRank(
      doc.hypotheses,
      doc.constraints,
      doc.evidenceBindings
    );

    let nextStatus: DeliberationSessionStatus = 'DELIBERATING';
    if (searchOutcome.isConverged) {
      nextStatus = 'CONVERGED';
    } else if (searchOutcome.isExhausted) {
      nextStatus = 'INCONCLUSIVE';
    }

    this.assertLegalTransition(doc.status, nextStatus);

    const updatedAt = new Date().toISOString();
    const nextDocDraft = {
      ...doc,
      sessionVersion: doc.sessionVersion + 1,
      status: nextStatus,
      hypotheses: searchOutcome.evaluatedHypotheses,
      contradictions: contradictionAnalysis.contradictions,
      updatedAt,
    };

    const provenanceHash = computeSessionProvenanceHash(nextDocDraft);
    const updated = Object.freeze({ ...nextDocDraft, provenanceHash });
    DeliberationValidator.validateSession(updated);
    this.projectTransientRegisters(updated);
    return updated;
  }

  /**
   * Finalizes a CONVERGED deliberation into an immutable RESOLVED DeliberationResult.
   */
  public resolveSession(
    doc: DeliberationSessionDocument,
    expectedVersion: number,
    recommendedAction?: string
  ): DeliberationSessionDocument {
    this.assertMutationPreconditions(doc, expectedVersion, 'resolve_session');
    this.assertLegalTransition(doc.status, 'RESOLVED');

    if (doc.hypotheses.length === 0) {
      throw new DeliberationValidationError('Cannot resolve deliberation session with zero hypotheses', ['zero_hypotheses']);
    }

    // Find winning hypothesis
    const supported = doc.hypotheses.filter((h) => h.status === 'SUPPORTED');
    const winningHypo = supported.length > 0
      ? [...supported].sort((a, b) => b.combinedConfidence - a.combinedConfidence)[0]
      : null;

    if (!winningHypo) {
      throw new DeliberationValidationError('Cannot resolve deliberation session without a SUPPORTED winning hypothesis', ['no_winning_hypothesis']);
    }

    const completedAt = new Date().toISOString();
    const nextVersion = doc.sessionVersion + 1;

    const resultDraft = {
      sessionId: doc.sessionId,
      tenantId: doc.tenantId,
      targetGoalId: doc.targetGoalId,
      winningHypothesisId: winningHypo.hypothesisId,
      topHypotheses: doc.hypotheses.slice(0, 5),
      status: 'RESOLVED' as DeliberationSessionStatus,
      summaryRationale: `Deliberation converged on hypothesis '${winningHypo.title}' with confidence ${winningHypo.combinedConfidence}. Validity: ${winningHypo.validityScore}, Plausibility: ${winningHypo.plausibilityScore}.`,
      recommendedAction: recommendedAction?.trim(),
      requiresHumanReview: false,
      sessionVersion: nextVersion,
      completedAt,
    };

    const resultHash = computeResultHash(resultDraft);
    const finalResult: DeliberationResult = Object.freeze({
      ...resultDraft,
      provenanceHash: resultHash,
    });

    const nextDocDraft = {
      ...doc,
      sessionVersion: nextVersion,
      status: 'RESOLVED' as DeliberationSessionStatus,
      result: finalResult,
      updatedAt: completedAt,
    };

    const provenanceHash = computeSessionProvenanceHash(nextDocDraft);
    const updated = Object.freeze({ ...nextDocDraft, provenanceHash });
    DeliberationValidator.validateSession(updated);
    this.projectTransientRegisters(updated);
    return updated;
  }

  /**
   * Governed abort of a deliberation session.
   */
  public abortSession(
    doc: DeliberationSessionDocument,
    expectedVersion: number,
    reason: string
  ): DeliberationSessionDocument {
    this.assertMutationPreconditions(doc, expectedVersion, 'abort_session');
    this.assertLegalTransition(doc.status, 'ABORTED');

    const updatedAt = new Date().toISOString();
    const nextDocDraft = {
      ...doc,
      sessionVersion: doc.sessionVersion + 1,
      status: 'ABORTED' as DeliberationSessionStatus,
      updatedAt,
    };

    const provenanceHash = computeSessionProvenanceHash(nextDocDraft);
    const updated = Object.freeze({ ...nextDocDraft, provenanceHash });
    DeliberationValidator.validateSession(updated);
    this.projectTransientRegisters(updated);
    return updated;
  }

  private assertMutationPreconditions(
    doc: DeliberationSessionDocument,
    expectedVersion: number,
    checkpoint: string
  ): void {
    if (this.userStopProvider()) {
      throw new DeliberationUserStopError(checkpoint);
    }

    if (doc.sessionVersion !== expectedVersion) {
      throw new DeliberationConcurrencyError(expectedVersion, doc.sessionVersion, { checkpoint, sessionId: doc.sessionId });
    }
  }

  private assertLegalTransition(from: DeliberationSessionStatus, to: DeliberationSessionStatus): void {
    const legal = LEGAL_DELIBERATION_TRANSITIONS[from] || [];
    if (!legal.includes(to)) {
      throw new DeliberationTransitionError(from, to);
    }
  }

  /**
   * Transient projection to working registers (NOT durable source of truth).
   */
  private projectTransientRegisters(doc: DeliberationSessionDocument): void {
    if (!this.workingRegisterStore) return;
    try {
      this.workingRegisterStore.updateRegisters(
        {
          current_focus: {
            subject: `deliberation_${doc.sessionId}`,
            domain: 'deliberation',
            establishedAt: new Date().toISOString(),
            rationale: `Deliberation session is in status ${doc.status}`,
          },
          active_goal_ref: doc.targetGoalId ?? null,
        },
        {
          expectedVersion: this.workingRegisterStore.stateVersion,
          mutatedBy: 'deliberationLifecycleManager',
          mutationReason: `project_deliberation_${doc.status.toLowerCase()}`,
        }
      );
    } catch {
      // Non-blocking: working registers are transient
    }
  }
}

export const globalDeliberationLifecycleManager = new DeliberationLifecycleManager();
