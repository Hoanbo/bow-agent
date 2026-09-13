// src/core/policyFeedbackReview/policyFeedbackReviewRuntime.ts
// BOWCON V4.0 — MS-1.3.67: GOVERNED FEEDBACK REVIEW, POLICY EVOLUTION INTAKE & HUMAN REVIEW QUEUE LAYER
//
// Governed Policy Feedback Review Runtime (Component 764).
// Master coordinator for governed feedback revalidation, review queuing,
// explicit human operator decision gates, policy evolution intake generation,
// cryptographic provenance, and audit correlation.
//
// Authority Invariants:
// - MASTER_COORDINATOR: Strictly level 1 governance bridge; zero autonomous mutation
// - HUMAN_APPROVAL_MANDATORY: Evolution intake strictly requires explicit human ACCEPT
// - USER_STOP > EVERYTHING: Every public method verifies USER_STOP before execution
// - STRICT_TENANT_ISOLATION: Multi-tenant partition separation fail-closed

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
import { PolicyFeedbackRevalidationEngine } from './policyFeedbackRevalidationEngine.js';
import { PolicyFeedbackReviewQueue, type ListQueueOptions, type ListQueueResult } from './policyFeedbackReviewQueue.js';
import { PolicyFeedbackHumanReviewGate } from './policyFeedbackHumanReviewGate.js';
import { PolicyEvolutionIntakeEngine, type IntakeCreationResult } from './policyEvolutionIntakeEngine.js';
import { PolicyFeedbackReviewEngine, type IngestProposalInput, type IngestProposalResult, type ProcessReviewResult } from './policyFeedbackReviewEngine.js';
import { PolicyFeedbackReviewProvenanceEngine } from './policyFeedbackReviewProvenanceEngine.js';
import { PolicyFeedbackReviewAuditEngine, globalPolicyFeedbackReviewAuditEngine } from './policyFeedbackReviewAuditEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export class PolicyFeedbackReviewRuntime {
  private readonly revalidationEngine: PolicyFeedbackRevalidationEngine;
  private readonly queue: PolicyFeedbackReviewQueue;
  private readonly humanGate: PolicyFeedbackHumanReviewGate;
  private readonly intakeEngine: PolicyEvolutionIntakeEngine;
  private readonly reviewEngine: PolicyFeedbackReviewEngine;
  private readonly provenanceEngine: PolicyFeedbackReviewProvenanceEngine;
  private readonly auditEngine: PolicyFeedbackReviewAuditEngine;
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyFeedbackReviewOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;

    this.revalidationEngine = new PolicyFeedbackRevalidationEngine(options);
    this.queue = new PolicyFeedbackReviewQueue(options);
    this.humanGate = new PolicyFeedbackHumanReviewGate(options);
    this.intakeEngine = new PolicyEvolutionIntakeEngine(options);
    this.reviewEngine = new PolicyFeedbackReviewEngine(
      options,
      this.revalidationEngine,
      this.queue,
      this.humanGate,
      this.intakeEngine
    );
    this.provenanceEngine = new PolicyFeedbackReviewProvenanceEngine(options);
    this.auditEngine = globalPolicyFeedbackReviewAuditEngine;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Review runtime operations suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('RUNTIME_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Ingests, revalidates, queues, and records audit/provenance for a feedback proposal.
   */
  public ingestFeedbackProposal(input: IngestProposalInput): IngestProposalResult {
    this.assertUserStopInactive();
    this.validateTenant(input.proposal.tenantPartition);

    this.auditEngine.recordEvent({
      eventType: 'FEEDBACK_REVIEW_RECEIVED',
      tenantPartition: input.proposal.tenantPartition,
      proposalId: input.proposal.proposalId,
      status: 'PROCESSING',
    });

    const result = this.reviewEngine.ingestProposal(input);

    if (result.success && result.reviewId && result.queueEntry) {
      this.provenanceEngine.appendEvent(
        input.proposal.tenantPartition,
        result.reviewId,
        'PROPOSAL_ENQUEUED_FOR_HUMAN_REVIEW',
        { proposalId: input.proposal.proposalId, proposedAction: input.proposal.proposedAction }
      );

      this.auditEngine.recordEvent({
        eventType: 'FEEDBACK_REVIEW_QUEUED',
        tenantPartition: input.proposal.tenantPartition,
        reviewId: result.reviewId,
        proposalId: input.proposal.proposalId,
        status: 'READY_FOR_HUMAN_REVIEW',
      });
    } else {
      this.auditEngine.recordEvent({
        eventType: 'FEEDBACK_REVALIDATION_FAILED',
        tenantPartition: input.proposal.tenantPartition,
        proposalId: input.proposal.proposalId,
        status: result.status,
        reason: result.reasons.join('; '),
      });
    }

    return result;
  }

  /**
   * Lists queued reviews for a tenant with bounded pagination.
   */
  public listReviewQueue(tenantPartition: string, options?: ListQueueOptions): ListQueueResult {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.queue.listEntries(tenantPartition, options);
  }

  /**
   * Retrieves a review queue entry.
   */
  public getReviewQueueEntry(tenantPartition: string, reviewId: FeedbackReviewId): FeedbackReviewQueueEntry | undefined {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.queue.getEntry(tenantPartition, reviewId);
  }

  /**
   * Submits and processes an explicit human review decision.
   * If accepted, creates an immutable PolicyEvolutionIntakeRequest.
   */
  public submitHumanReview(tenantPartition: string, submission: HumanReviewSubmission): ProcessReviewResult {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);

    const headHash = this.provenanceEngine.getHeadHash(tenantPartition, submission.reviewId);
    const result = this.reviewEngine.processHumanReview(tenantPartition, submission, headHash);

    // Provenance event
    this.provenanceEngine.appendEvent(
      tenantPartition,
      submission.reviewId,
      `HUMAN_REVIEW_${submission.decision}`,
      {
        decisionId: result.decisionRecord.decisionId,
        reviewerId: submission.reviewerId,
        decision: submission.decision,
      }
    );

    // Audit event
    let auditEventType: any = 'FEEDBACK_REVIEW_ACCEPTED';
    switch (submission.decision) {
      case 'ACCEPT':
        auditEventType = 'FEEDBACK_REVIEW_ACCEPTED';
        break;
      case 'REJECT':
        auditEventType = 'FEEDBACK_REVIEW_REJECTED';
        break;
      case 'DEFER':
        auditEventType = 'FEEDBACK_REVIEW_DEFERRED';
        break;
      case 'CANCEL':
        auditEventType = 'FEEDBACK_REVIEW_CANCELLED';
        break;
      case 'REQUEST_MORE_EVIDENCE':
        auditEventType = 'FEEDBACK_REVIEW_DEFERRED';
        break;
    }

    this.auditEngine.recordEvent({
      eventType: auditEventType,
      tenantPartition,
      reviewId: submission.reviewId,
      reviewerId: submission.reviewerId,
      status: submission.decision,
      details: { reviewNotes: submission.reviewNotes },
    });

    if (result.intakeResult && result.intakeResult.created && result.intakeResult.intakeRequest) {
      this.provenanceEngine.appendEvent(
        tenantPartition,
        submission.reviewId,
        'POLICY_EVOLUTION_INTAKE_CREATED',
        {
          intakeId: result.intakeResult.intakeRequest.intakeId,
          intakeAction: result.intakeResult.intakeRequest.intakeAction,
        }
      );

      this.auditEngine.recordEvent({
        eventType: 'FEEDBACK_EVOLUTION_INTAKE_CREATED',
        tenantPartition,
        reviewId: submission.reviewId,
        intakeId: result.intakeResult.intakeRequest.intakeId,
        reviewerId: submission.reviewerId,
        status: 'CREATED',
        details: { intakeAction: result.intakeResult.intakeRequest.intakeAction },
      });
    }

    return result;
  }

  /**
   * Retrieves an evolution intake request by reviewId.
   */
  public getIntakeRequest(tenantPartition: string, reviewId: string): PolicyEvolutionIntakeRequest | undefined {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.intakeEngine.getIntakeRequest(tenantPartition, reviewId);
  }

  /**
   * Verifies provenance integrity for a review.
   */
  public verifyProvenanceIntegrity(tenantPartition: string, reviewId: FeedbackReviewId): { valid: boolean; errors: string[] } {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.provenanceEngine.verifyChainIntegrity(tenantPartition, reviewId);
  }
}
