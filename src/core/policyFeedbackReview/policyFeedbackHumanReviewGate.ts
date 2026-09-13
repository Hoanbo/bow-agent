// src/core/policyFeedbackReview/policyFeedbackHumanReviewGate.ts
// BOWCON V4.0 — MS-1.3.67: GOVERNED FEEDBACK REVIEW, POLICY EVOLUTION INTAKE & HUMAN REVIEW QUEUE LAYER
//
// Governed Policy Feedback Human Review Gate (Component 759).
// Evaluates explicit human review submissions for queued feedback proposals.
//
// Authority Invariants:
// - ANTI_SELF_APPROVAL: Autonomous agent personas explicitly rejected
// - EXPLICIT_HUMAN_AUTHORITY: Decisions require Master Human Operator, Supervisor, or Owner role
// - HUMAN_ACCEPT_IS_NOT_POLICY_ACTIVATION: Accept yields intake eligibility, not mutation
// - IDEMPOTENT_DECISION_SUBMISSION: Replayed decisions return recorded outcome without duplication
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import path from 'node:path';
import type {
  FeedbackReviewQueueEntry,
  HumanReviewSubmission,
  HumanReviewDecisionRecord,
  PolicyFeedbackReviewOptions,
} from './policyFeedbackReviewTypes.js';
import { createReviewDecisionId } from './policyFeedbackReviewTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

const AUTONOMOUS_ACTOR_PATTERNS = [
  /^auto_/i,
  /^bot_/i,
  /^ai_agent/i,
  /^ai_/i,
  /^autonomous/i,
  /^synthetic_/i,
  /^system_daemon/i,
  /^system/i,
  /^agent_/i,
  /^daemon/i,
  /^cron_/i,
  /^scheduler/i,
  /^runtime/i,
];

const ALLOWED_HUMAN_ROLES = new Set(['MASTER_HUMAN_OPERATOR', 'SUPERVISOR', 'OWNER']);

export class PolicyFeedbackHumanReviewGate {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  // Recorded decisions cache: tenantPartition -> Map<reviewId, HumanReviewDecisionRecord>
  private readonly decisions: Map<string, Map<string, HumanReviewDecisionRecord>> = new Map();

  constructor(options?: PolicyFeedbackReviewOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Human review operations suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('REVIEW_GATE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  private getTenantDecisions(tenantPartition: string): Map<string, HumanReviewDecisionRecord> {
    let map = this.decisions.get(tenantPartition);
    if (!map) {
      map = new Map();
      this.decisions.set(tenantPartition, map);
    }
    return map;
  }

  /**
   * Evaluates an explicit human review submission.
   * Rejects autonomous agents and invalid roles fail-closed.
   */
  public evaluateSubmission(
    entry: FeedbackReviewQueueEntry,
    submission: HumanReviewSubmission
  ): HumanReviewDecisionRecord {
    // 1. Fail closed on USER_STOP
    this.assertUserStopInactive();

    // 2. Validate tenant partition
    this.validateTenant(entry.tenantPartition);

    if (!submission || !submission.reviewId || submission.reviewId !== entry.reviewId) {
      throw new Error(`REVIEW_ID_MISMATCH: Submission reviewId '${submission?.reviewId}' does not match entry '${entry.reviewId}'`);
    }

    // 3. Anti-Self-Approval Gate: Reject autonomous actors
    const reviewer = (submission.reviewerId ?? '').trim();
    if (!reviewer) {
      throw new Error('MISSING_REVIEWER_ID: Human reviewerId must be specified');
    }

    for (const pattern of AUTONOMOUS_ACTOR_PATTERNS) {
      if (pattern.test(reviewer)) {
        throw new Error(`ANTI_SELF_APPROVAL_VIOLATION: Autonomous persona '${reviewer}' cannot issue human review decisions. Explicit human review is mandatory.`);
      }
    }

    // 4. Check for existing decision (Idempotency and terminal state defense)
    const tenantMap = this.getTenantDecisions(entry.tenantPartition);
    const existing = tenantMap.get(entry.reviewId);
    if (existing) {
      // If re-submitted with exact same decision and reviewer, return idempotent record
      if (existing.decision === submission.decision && existing.reviewerId === submission.reviewerId) {
        return existing;
      }
      throw new Error(`DECISION_IMMUTABILITY_VIOLATION: Review '${entry.reviewId}' already has recorded decision '${existing.decision}' by '${existing.reviewerId}'`);
    }

    // 5. Reviewer role validation
    const role = (submission.reviewerRole ?? '').trim();
    if (!ALLOWED_HUMAN_ROLES.has(role)) {
      throw new Error(`UNAUTHORIZED_REVIEWER_ROLE: Role '${role}' lacks authority for policy feedback review`);
    }

    // 6. Review notes requirement
    const notes = (submission.reviewNotes ?? '').trim();
    if (!notes) {
      throw new Error('MISSING_REVIEW_NOTES: Human review notes are required to substantiate decision');
    }

    // 7. Request more evidence details requirement
    if (submission.decision === 'REQUEST_MORE_EVIDENCE') {
      const extraEvidence = (submission.additionalEvidenceRequired ?? '').trim();
      if (!extraEvidence) {
        throw new Error('MISSING_EVIDENCE_SPECIFICATION: additionalEvidenceRequired is mandatory when requesting more evidence');
      }
    }

    // 8. Construct immutable human decision record
    const rawHash = crypto.createHash('sha256')
      .update(`${entry.reviewId}:${submission.decision}:${reviewer}:${entry.tenantPartition}:${Date.now()}`)
      .digest('hex');
    const decisionId = createReviewDecisionId(`hdec_${rawHash.substring(0, 16)}`);

    const record: HumanReviewDecisionRecord = Object.freeze({
      decisionId,
      reviewId: entry.reviewId,
      proposalId: entry.proposalId,
      tenantPartition: entry.tenantPartition,
      decision: submission.decision,
      reviewerId: reviewer,
      reviewerRole: role,
      reviewNotes: notes,
      decidedAt: submission.submissionTimestamp ?? new Date().toISOString(),
      isAutonomousDecision: false,
    });

    tenantMap.set(entry.reviewId, record);
    return record;
  }

  /**
   * Retrieves an existing recorded decision for a reviewId.
   */
  public getRecordedDecision(tenantPartition: string, reviewId: string): HumanReviewDecisionRecord | undefined {
    this.assertUserStopInactive();
    this.validateTenant(tenantPartition);
    return this.getTenantDecisions(tenantPartition).get(reviewId as any);
  }
}
