// src/core/goal/goalFormationEngine.ts
// BOWCON V4.0 — MS-1.5.04: GOAL FORMATION ENGINE (UNTRUSTED TO GOVERNED)
// Component 1010 — REAL
//
// Invariants:
// LLM_OUTPUT != AUTHORITATIVE_GOAL
// USER_STOP > ALL_MUTATION
// SECRET_SANITIZATION_BEFORE_FORMATION == TRUE
// CRYPTOGRAPHIC_PROVENANCE == TRUE
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// COGNITION != AUTHORITY

import {
  type GoalProposalInput,
  type GovernedGoal,
  GoalUserStopError,
  computeDeterministicGoalId,
  computeGoalHash,
} from './goalTypes.js';
import { GoalValidator } from './goalValidator.js';
import { GoalPriorityEngine, globalGoalPriorityEngine } from './goalPriorityEngine.js';
import { globalDiagnosisSanitizer, type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { CloudEscalationSanitizer } from '../cognitive/cloudEscalationSanitizer.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export interface GoalFormationOptions {
  readonly sanitizer?: DiagnosisSanitizer;
  readonly priorityEngine?: GoalPriorityEngine;
  readonly userStopProvider?: () => boolean;
}

export class GoalFormationEngine {
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly priorityEngine: GoalPriorityEngine;
  private readonly userStopProvider: () => boolean;

  constructor(options?: GoalFormationOptions) {
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.priorityEngine = options?.priorityEngine ?? globalGoalPriorityEngine;
    this.userStopProvider =
      options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * Transforms an untrusted GoalProposalInput into an immutable, strongly typed GovernedGoal.
   *
   * 1. Synchronously asserts USER_STOP preemption.
   * 2. Runs fails-closed GoalValidator.
   * 3. Sanitizes credentials, API keys, and sensitive paths.
   * 4. Computes deterministic priority score.
   * 5. Computes deterministic goalId and SHA-256 provenance hash.
   */
  public formGoal(proposal: GoalProposalInput, customCreatedAt?: string): GovernedGoal {
    // 1. Synchronous USER_STOP check
    if (this.userStopProvider()) {
      throw new GoalUserStopError('goal_formation');
    }

    // 2. Fails-closed schema & boundary validation
    GoalValidator.validateProposal(proposal);

    // 3. Secret & PII sanitization
    const sanitizedTitle = this.sanitizeText(proposal.title);
    const sanitizedDescription = this.sanitizeText(proposal.description);
    const sanitizedCriteria = proposal.successCriteria.map((c) => this.sanitizeText(c));
    const sanitizedFailureCriteria = (proposal.failureCriteria ?? []).map((c) => this.sanitizeText(c));
    const sanitizedConstraints = (proposal.constraints ?? []).map((c) => this.sanitizeText(c));

    // 4. Priority vector sanitization and score calculation
    const priorityVector = GoalValidator.sanitizePriorityVector(proposal.priorityVector);
    const priorityScore = this.priorityEngine.calculateScore(priorityVector);

    const createdAt = customCreatedAt || new Date().toISOString();
    const goalId = computeDeterministicGoalId(
      proposal.tenantId,
      proposal.sourceIntent,
      sanitizedTitle,
      createdAt
    );

    const draftGoal = {
      goalId,
      parentGoalId: proposal.parentGoalId ?? null,
      tenantId: proposal.tenantId.trim(),
      sessionId: proposal.sessionId?.trim(),
      origin: proposal.origin,
      sourceIntent: proposal.sourceIntent,
      title: sanitizedTitle,
      description: sanitizedDescription,
      successCriteria: Object.freeze(sanitizedCriteria),
      failureCriteria: Object.freeze(sanitizedFailureCriteria),
      constraints: Object.freeze(sanitizedConstraints),
      priorityScore,
      priorityVector,
      status: 'PROPOSED' as const,
      statusReason: undefined,
      activeTaskRefs: Object.freeze([]),
      version: 1,
      createdAt,
      updatedAt: createdAt,
    };

    // 5. Cryptographic SHA-256 provenance hash
    const provenanceHash = computeGoalHash(draftGoal);

    const finalGoal: GovernedGoal = Object.freeze({
      ...draftGoal,
      provenanceHash,
    });

    GoalValidator.validateGoal(finalGoal);
    return finalGoal;
  }

  private sanitizeText(raw: string): string {
    const s1 = this.sanitizer.sanitizeString(raw || '');
    const s2 = CloudEscalationSanitizer.sanitizeString(s1).sanitized;
    return s2
      .replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]')
      .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]')
      .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_GOOGLE_KEY]')
      .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
      .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[REDACTED_ANTHROPIC_KEY]')
      .replace(/ghp_[A-Za-z0-9]{30,}/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/(?:password|passwd|pwd)\s*=\s*[^\s,;]+/gi, '[REDACTED_PASSWORD]')
      .replace(/(?:api_key|apikey)\s*=\s*[^\s,;]+/gi, '[REDACTED_API_KEY]')
      .replace(/[A-Za-z]:\\\\BOW\\\\shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
      .replace(/[A-Za-z]:[\\/]BOW[\\/]shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
      .replace(/shopofbow/gi, '[REDACTED_PROTECTED_WORKSPACE]')
      .trim();
  }
}

export const globalGoalFormationEngine = new GoalFormationEngine();
