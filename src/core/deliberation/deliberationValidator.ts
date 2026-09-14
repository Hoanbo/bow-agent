// src/core/deliberation/deliberationValidator.ts
// BOWCON V4.0 — MS-1.5.05: DELIBERATION VALIDATOR (FAILS-CLOSED)
// Component 1019 — REAL
//
// Invariants:
// FAIL_CLOSED_ON_MALFORMED_PROPOSAL == TRUE
// PROTOTYPE_POLLUTION_DEFENSE == TRUE
// NO_RAW_CHAIN_OF_THOUGHT_PERSISTENCE == TRUE
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// COGNITION != AUTHORITY

import {
  DELIBERATION_BOUNDS,
  type HypothesisProposalInput,
  type DeliberationHypothesis,
  type EvidenceBinding,
  type SymbolicConstraint,
  DeliberationValidationError,
  DeliberationSecurityError,
  assertNoDeliberationCoT,
} from './deliberationTypes.js';

const WINDOWS_RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

export class DeliberationValidator {
  /**
   * Validates an untrusted HypothesisProposalInput.
   * Fails closed on any schema, boundary, CoT, or security violation.
   */
  public static validateProposal(proposal: unknown): asserts proposal is HypothesisProposalInput {
    if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
      throw new DeliberationValidationError('Hypothesis proposal must be a non-null object', ['INVALID_OBJECT']);
    }

    // 1. Prototype pollution & CoT checks
    assertNoDeliberationCoT(proposal, 'proposal');

    const p = proposal as Record<string, unknown>;
    const errors: string[] = [];

    // 2. Tenant ID validation
    if (typeof p.tenantId !== 'string' || !p.tenantId.trim()) {
      errors.push('tenantId must be a non-empty string');
    } else {
      const cleanTenant = p.tenantId.trim().toLowerCase();
      if (
        cleanTenant.includes('..') ||
        cleanTenant.includes('/') ||
        cleanTenant.includes('\\') ||
        cleanTenant.includes('\0') ||
        WINDOWS_RESERVED_NAMES.has(cleanTenant)
      ) {
        throw new DeliberationSecurityError(`Illegal tenant identifier: '${p.tenantId}'`, {
          tenantId: p.tenantId,
        });
      }
    }

    // 3. Session ID validation (if provided)
    if (p.sessionId !== undefined && p.sessionId !== null) {
      if (typeof p.sessionId !== 'string' || !p.sessionId.trim()) {
        errors.push('sessionId must be a non-empty string if provided');
      } else {
        const cleanSession = p.sessionId.trim().toLowerCase();
        if (
          cleanSession.includes('..') ||
          cleanSession.includes('/') ||
          cleanSession.includes('\\') ||
          cleanSession.includes('\0') ||
          WINDOWS_RESERVED_NAMES.has(cleanSession)
        ) {
          throw new DeliberationSecurityError(`Illegal session identifier: '${p.sessionId}'`, {
            sessionId: p.sessionId,
          });
        }
      }
    }

    // 4. Title validation
    if (typeof p.title !== 'string' || !p.title.trim()) {
      errors.push('title must be a non-empty string');
    } else if (p.title.trim().length > DELIBERATION_BOUNDS.MAX_TITLE_LENGTH) {
      errors.push(`title exceeds maximum length of ${DELIBERATION_BOUNDS.MAX_TITLE_LENGTH} characters`);
    }

    // 5. Premise validation
    if (typeof p.premise !== 'string' || !p.premise.trim()) {
      errors.push('premise must be a non-empty string');
    } else if (p.premise.trim().length > DELIBERATION_BOUNDS.MAX_PREMISE_LENGTH) {
      errors.push(`premise exceeds maximum length of ${DELIBERATION_BOUNDS.MAX_PREMISE_LENGTH} characters`);
    }

    // 6. Plausibility score validation (if provided)
    if (p.plausibilityScore !== undefined && p.plausibilityScore !== null) {
      const score = p.plausibilityScore;
      if (typeof score !== 'number' || !Number.isFinite(score) || score < 0.0 || score > 1.0) {
        errors.push('plausibilityScore must be a finite number between 0.0 and 1.0');
      }
    }

    // 7. Supporting and refuting evidence IDs (if provided)
    if (p.supportingEvidenceIds !== undefined && p.supportingEvidenceIds !== null) {
      if (!Array.isArray(p.supportingEvidenceIds)) {
        errors.push('supportingEvidenceIds must be an array of strings if provided');
      }
    }
    if (p.refutingEvidenceIds !== undefined && p.refutingEvidenceIds !== null) {
      if (!Array.isArray(p.refutingEvidenceIds)) {
        errors.push('refutingEvidenceIds must be an array of strings if provided');
      }
    }

    if (errors.length > 0) {
      throw new DeliberationValidationError('Hypothesis proposal validation failed', errors, { proposal });
    }
  }

  /**
   * Validates a constructed DeliberationHypothesis.
   */
  public static validateHypothesis(hypo: DeliberationHypothesis): void {
    if (!hypo || typeof hypo !== 'object') {
      throw new DeliberationValidationError('Hypothesis must be a non-null object');
    }

    assertNoDeliberationCoT(hypo, 'hypothesis');

    const errors: string[] = [];
    if (!hypo.hypothesisId || typeof hypo.hypothesisId !== 'string') errors.push('Missing hypothesisId');
    if (!hypo.sessionId || typeof hypo.sessionId !== 'string') errors.push('Missing sessionId');
    if (!hypo.tenantId || typeof hypo.tenantId !== 'string') errors.push('Missing tenantId');
    if (!hypo.title || typeof hypo.title !== 'string') errors.push('Missing title');
    if (!hypo.premise || typeof hypo.premise !== 'string') errors.push('Missing premise');
    if (!hypo.provenanceHash || hypo.provenanceHash.length !== 64) errors.push('Invalid provenanceHash length');

    for (const [name, val] of [
      ['plausibilityScore', hypo.plausibilityScore],
      ['validityScore', hypo.validityScore],
      ['combinedConfidence', hypo.combinedConfidence],
    ] as const) {
      if (typeof val !== 'number' || !Number.isFinite(val) || val < 0.0 || val > 1.0) {
        errors.push(`${name} must be a finite number in [0.0, 1.0]`);
      }
    }

    if (errors.length > 0) {
      throw new DeliberationValidationError('Hypothesis validation failed', errors);
    }
  }

  /**
   * Validates an EvidenceBinding instance.
   */
  public static validateEvidence(evidence: EvidenceBinding): void {
    if (!evidence || typeof evidence !== 'object') {
      throw new DeliberationValidationError('Evidence must be a non-null object');
    }

    assertNoDeliberationCoT(evidence, 'evidence');

    const errors: string[] = [];
    if (!evidence.evidenceId || typeof evidence.evidenceId !== 'string') errors.push('Missing evidenceId');
    if (!evidence.tenantId || typeof evidence.tenantId !== 'string') errors.push('Missing tenantId');
    if (!evidence.statement || typeof evidence.statement !== 'string' || !evidence.statement.trim()) {
      errors.push('Evidence statement must be a non-empty string');
    }
    if (!evidence.sourceReferenceId || typeof evidence.sourceReferenceId !== 'string') {
      errors.push('Missing sourceReferenceId');
    }
    if (typeof evidence.confidence !== 'number' || !Number.isFinite(evidence.confidence) || evidence.confidence < 0.0 || evidence.confidence > 1.0) {
      errors.push('confidence must be a finite number in [0.0, 1.0]');
    }
    if (!evidence.provenanceHash || evidence.provenanceHash.length !== 64) {
      errors.push('Invalid evidence provenanceHash');
    }

    const validSources = new Set([
      'USER_DIRECTIVE',
      'CANONICAL_EPISODIC_MEMORY',
      'SEMANTIC_MEMORY_REFERENCE',
      'GOVERNED_GOAL_STATE',
      'TASK_OUTCOME_RECORD',
      'SYSTEM_EMPIRICAL_OBSERVATION',
    ]);
    if (!validSources.has(evidence.sourceType)) {
      errors.push(`Invalid evidence sourceType: '${evidence.sourceType}'`);
    }

    if (errors.length > 0) {
      throw new DeliberationValidationError('Evidence validation failed', errors);
    }
  }

  /**
   * Validates a SymbolicConstraint.
   */
  public static validateConstraint(constraint: SymbolicConstraint): void {
    if (!constraint || typeof constraint !== 'object') {
      throw new DeliberationValidationError('Constraint must be a non-null object');
    }

    assertNoDeliberationCoT(constraint, 'constraint');

    const errors: string[] = [];
    if (!constraint.constraintId || typeof constraint.constraintId !== 'string') errors.push('Missing constraintId');
    if (!constraint.predicate || typeof constraint.predicate !== 'string' || !constraint.predicate.trim()) {
      errors.push('Constraint predicate must be a non-empty string');
    }
    const polarities = new Set(['MUST', 'MUST_NOT', 'PREFER']);
    if (!polarities.has(constraint.polarity)) {
      errors.push(`Invalid constraint polarity: '${constraint.polarity}'`);
    }

    if (errors.length > 0) {
      throw new DeliberationValidationError('Constraint validation failed', errors);
    }
  }

  /**
   * Validates a DeliberationSessionDocument.
   */
  public static validateSession(session: unknown): void {
    if (!session || typeof session !== 'object') {
      throw new DeliberationValidationError('Session document must be a non-null object');
    }

    assertNoDeliberationCoT(session, 'session');

    const s = session as Record<string, unknown>;
    const errors: string[] = [];

    if (s.schemaVersion !== 1) errors.push('Invalid schemaVersion (must be 1)');
    if (!s.sessionId || typeof s.sessionId !== 'string') errors.push('Missing sessionId');
    if (!s.tenantId || typeof s.tenantId !== 'string') errors.push('Missing tenantId');
    if (typeof s.sessionVersion !== 'number' || s.sessionVersion < 1) errors.push('sessionVersion must be >= 1');
    if (!s.status || typeof s.status !== 'string') errors.push('Missing status');
    if (!s.provenanceHash || typeof s.provenanceHash !== 'string' || s.provenanceHash.length !== 64) {
      errors.push('provenanceHash must be 64-char hex string');
    }

    if (!Array.isArray(s.hypotheses)) {
      errors.push('hypotheses must be an array');
    } else if (s.hypotheses.length > DELIBERATION_BOUNDS.MAX_HYPOTHESES_PER_SESSION) {
      errors.push(`hypotheses count exceeds ${DELIBERATION_BOUNDS.MAX_HYPOTHESES_PER_SESSION}`);
    }

    if (!Array.isArray(s.evidenceBindings)) {
      errors.push('evidenceBindings must be an array');
    }

    if (!Array.isArray(s.constraints)) {
      errors.push('constraints must be an array');
    } else if (s.constraints.length > DELIBERATION_BOUNDS.MAX_CONSTRAINTS_PER_SESSION) {
      errors.push(`constraints count exceeds ${DELIBERATION_BOUNDS.MAX_CONSTRAINTS_PER_SESSION}`);
    }

    if (!Array.isArray(s.contradictions)) {
      errors.push('contradictions must be an array');
    } else if (s.contradictions.length > DELIBERATION_BOUNDS.MAX_CONTRADICTIONS_PER_SESSION) {
      errors.push(`contradictions count exceeds ${DELIBERATION_BOUNDS.MAX_CONTRADICTIONS_PER_SESSION}`);
    }

    // Size limit check
    const serialized = JSON.stringify(session);
    if (Buffer.byteLength(serialized, 'utf8') > DELIBERATION_BOUNDS.MAX_SESSION_BYTES) {
      errors.push(`Session document exceeds max bytes ${DELIBERATION_BOUNDS.MAX_SESSION_BYTES}`);
    }

    if (errors.length > 0) {
      throw new DeliberationValidationError('Deliberation session validation failed', errors);
    }
  }
}
