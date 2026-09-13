// src/core/policyFeedbackReview/policyFeedbackReviewEngine.ts
// BOWCON V4.0 — MS-1.3.67: GOVERNED FEEDBACK REVIEW, POLICY EVOLUTION INTAKE & HUMAN REVIEW QUEUE LAYER
//
// Governed Policy Feedback Review Engine (Component 761).
// Orchestrates the lifecycle of a feedback proposal through revalidation,
// queuing, human review processing, and policy evolution intake generation.
//
// Authority Invariants:
// - LEVEL_1_STAGING: Human review engine only; zero direct policy mutation
// - HUMAN_ACCEPT_IS_NOT_POLICY_ACTIVATION: Accept yields intake request, not policy mutation
// - ZERO_AUTONOMOUS_AUTHORITY: Agent cannot self-approve or auto-mutate
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import path from 'node:path';
import type { PolicyFeedbackProposal } from '../policyPostExecution/policyPostExecutionTypes.js';
import type {
  FeedbackReviewId,
  FeedbackReviewQueueEntry,
  HumanReviewSubmission,
  HumanReviewDecisionRecord,
  PolicyEvolutionIntakeRequest,
  PolicyFeedbackReviewOptions,
} from './policyFeedbackReviewTypes.js';
import { createFeedbackReviewId } from './policyFeedbackReviewTypes.js';
import { PolicyFeedbackRevalidationEngine, type RevalidationContext } from './policyFeedbackRevalidationEngine.js';
import { PolicyFeedbackReviewQueue } from './policyFeedbackReviewQueue.js';
import { PolicyFeedbackHumanReviewGate } from './policyFeedbackHumanReviewGate.js';
import { PolicyEvolutionIntakeEngine, type IntakeCreationResult } from './policyEvolutionIntakeEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export interface IngestProposalInput extends RevalidationContext {}

export interface IngestProposalResult {
  readonly success: boolean;
  readonly reviewId?: FeedbackReviewId;
  readonly queueEntry?: FeedbackReviewQueueEntry;
  readonly status: 'QUEUED' | 'REJECTED_REVALIDATION' | 'EXPIRED' | 'SUPERSEDED' | 'INVALID';
  readonly reasons: readonly string[];
}

export interface ProcessReviewResult {
  readonly success: boolean;
  readonly queueEntry: FeedbackReviewQueueEntry;
  readonly decisionRecord: HumanReviewDecisionRecord;
  readonly intakeResult?: IntakeCreationResult;
}

export class PolicyFeedbackReviewEngine {
  private readonly revalidationEngine: PolicyFeedbackRevalidationEngine;
  private readonly queue: PolicyFeedbackReviewQueue;
  private readonly humanGate: PolicyFeedbackHumanReviewGate;
  private readonly intakeEngine: PolicyEvolutionIntakeEngine;
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(
    options?: PolicyFeedbackReviewOptions,
    revalidationEngine?: PolicyFeedbackRevalidationEngine,
    queue?: PolicyFeedbackReviewQueue,
    humanGate?: PolicyFeedbackHumanReviewGate,
    intakeEngine?: PolicyEvolutionIntakeEngine
  ) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.revalidationEngine = revalidationEngine ?? new PolicyFeedbackRevalidationEngine(options);
    this.queue = queue ?? new PolicyFeedbackReviewQueue(options);
    this.humanGate = humanGate ?? new PolicyFeedbackHumanReviewGate(options);
    this.intakeEngine = intakeEngine ?? new PolicyEvolutionIntakeEngine(options);
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Feedback review operations suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('REVIEW_ENGINE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Ingests a feedback proposal from MS-1.3.66, runs independent revalidation,
   * and enqueues into the Human Review Queue if valid.
   */
  public ingestProposal(input: IngestProposalInput): IngestProposalResult {
    this.assertUserStopInactive();
    this.validateTenant(input.proposal.tenantPartition);

    // 1. Revalidate proposal
    const reval = this.revalidationEngine.revalidateProposal(input);
    if (!reval.valid) {
      let status: IngestProposalResult['status'] = 'REJECTED_REVALIDATION';
      if (!reval.isFresh) {
        status = 'EXPIRED';
      } else if (reval.isSuperseded) {
        status = 'SUPERSEDED';
      } else if (!reval.integrityVerified) {
        status = 'INVALID';
      }

      return {
        success: false,
        status,
        reasons: reval.reasons,
      };
    }

    // 2. Generate reviewId
    const rawHash = crypto.createHash('sha256')
      .update(`${input.proposal.proposalId}:${input.proposal.tenantPartition}:${input.proposal.executionId}`)
      .digest('hex');
    const reviewId = createFeedbackReviewId(`rev_${rawHash.substring(0, 16)}`);

    // Determine severity from regression or impact
    let severity: FeedbackReviewQueueEntry['severity'] = 'LOW';
    if (input.proposal.regressionTypes.includes('SAFETY_FLOOR_VIOLATION')) {
      severity = 'CRITICAL';
    } else if (input.proposal.impactClassification === 'SAFETY_REGRESSION') {
      severity = 'CRITICAL';
    } else if (input.proposal.regressionTypes.some(r => r !== 'NO_REGRESSION')) {
      severity = 'HIGH';
    } else if (input.proposal.effectivenessStatus === 'INEFFECTIVE') {
      severity = 'MEDIUM';
    }

    const nowIso = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + 86400000).toISOString();

    const queueEntry: FeedbackReviewQueueEntry = {
      reviewId,
      proposalId: input.proposal.proposalId,
      tenantPartition: input.proposal.tenantPartition,
      executionId: input.proposal.executionId,
      candidateId: input.proposal.candidateId,
      state: 'READY_FOR_HUMAN_REVIEW',
      proposedAction: input.proposal.proposedAction,
      severity,
      impactClassification: input.proposal.impactClassification,
      effectivenessStatus: input.proposal.effectivenessStatus,
      regressionTypes: input.proposal.regressionTypes,
      rationale: input.proposal.rationale,
      evidenceSummary: `Effectiveness: ${input.proposal.effectivenessStatus}, Impact: ${input.proposal.impactClassification}`,
      createdAt: nowIso,
      updatedAt: nowIso,
      expiresAt: expiresAtIso,
    };

    const enqueued = this.queue.enqueue(queueEntry);

    return {
      success: true,
      reviewId,
      queueEntry: enqueued,
      status: 'QUEUED',
      reasons: [],
    };
  }

  /**
   * Processes an explicit human review submission, updates queue entry state,
   * and creates an evolution intake request if accepted.
   */
  public processHumanReview(
    tenantPartition: string,
    submission: HumanReviewSubmission,
    provenanceHeadHash: string = 'genesis_hash'
  ): ProcessReviewResult {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const entry = this.queue.getEntry(tenantPartition, submission.reviewId);
    if (!entry) {
      throw new Error(`ENTRY_NOT_FOUND: ReviewId '${submission.reviewId}' not found in queue for tenant '${tenantPartition}'`);
    }

    // Evaluate submission through human gate
    const decisionRecord = this.humanGate.evaluateSubmission(entry, submission);

    // Map decision to lifecycle state
    let targetState: FeedbackReviewQueueEntry['state'];
    switch (submission.decision) {
      case 'ACCEPT':
        targetState = 'ACCEPTED';
        break;
      case 'REJECT':
        targetState = 'REJECTED';
        break;
      case 'DEFER':
        targetState = 'DEFERRED';
        break;
      case 'REQUEST_MORE_EVIDENCE':
        targetState = 'REQUEST_MORE_EVIDENCE';
        break;
      case 'CANCEL':
        targetState = 'CANCELLED';
        break;
      default:
        throw new Error(`UNSUPPORTED_DECISION: Decision '${submission.decision}' not supported`);
    }

    const updatedEntry = this.queue.updateEntryState(tenantPartition, submission.reviewId, targetState);

    let intakeResult: IntakeCreationResult | undefined;
    if (submission.decision === 'ACCEPT') {
      intakeResult = this.intakeEngine.createIntakeRequest(updatedEntry, decisionRecord, provenanceHeadHash);
    }

    return {
      success: true,
      queueEntry: updatedEntry,
      decisionRecord,
      intakeResult,
    };
  }
}
