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
import { createFeedbackReviewId } from './policyFeedbackReviewTypes.js';
import { PolicyFeedbackRevalidationEngine } from './policyFeedbackRevalidationEngine.js';
import { PolicyFeedbackReviewQueue } from './policyFeedbackReviewQueue.js';
import { PolicyFeedbackHumanReviewGate } from './policyFeedbackHumanReviewGate.js';
import { PolicyEvolutionIntakeEngine } from './policyEvolutionIntakeEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyFeedbackReviewEngine {
    revalidationEngine;
    queue;
    humanGate;
    intakeEngine;
    baseDir;
    isUserStopActiveFn;
    constructor(options, revalidationEngine, queue, humanGate, intakeEngine) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.revalidationEngine = revalidationEngine ?? new PolicyFeedbackRevalidationEngine(options);
        this.queue = queue ?? new PolicyFeedbackReviewQueue(options);
        this.humanGate = humanGate ?? new PolicyFeedbackHumanReviewGate(options);
        this.intakeEngine = intakeEngine ?? new PolicyEvolutionIntakeEngine(options);
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Feedback review operations suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('REVIEW_ENGINE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    /**
     * Ingests a feedback proposal from MS-1.3.66, runs independent revalidation,
     * and enqueues into the Human Review Queue if valid.
     */
    ingestProposal(input) {
        this.assertUserStopInactive();
        this.validateTenant(input.proposal.tenantPartition);
        // 1. Revalidate proposal
        const reval = this.revalidationEngine.revalidateProposal(input);
        if (!reval.valid) {
            let status = 'REJECTED_REVALIDATION';
            if (!reval.isFresh) {
                status = 'EXPIRED';
            }
            else if (reval.isSuperseded) {
                status = 'SUPERSEDED';
            }
            else if (!reval.integrityVerified) {
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
        let severity = 'LOW';
        if (input.proposal.regressionTypes.includes('SAFETY_FLOOR_VIOLATION')) {
            severity = 'CRITICAL';
        }
        else if (input.proposal.impactClassification === 'SAFETY_REGRESSION') {
            severity = 'CRITICAL';
        }
        else if (input.proposal.regressionTypes.some(r => r !== 'NO_REGRESSION')) {
            severity = 'HIGH';
        }
        else if (input.proposal.effectivenessStatus === 'INEFFECTIVE') {
            severity = 'MEDIUM';
        }
        const nowIso = new Date().toISOString();
        const expiresAtIso = new Date(Date.now() + 86400000).toISOString();
        const queueEntry = {
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
    processHumanReview(tenantPartition, submission, provenanceHeadHash = 'genesis_hash') {
        this.assertUserStopInactive();
        this.validateTenant(tenantPartition);
        const entry = this.queue.getEntry(tenantPartition, submission.reviewId);
        if (!entry) {
            throw new Error(`ENTRY_NOT_FOUND: ReviewId '${submission.reviewId}' not found in queue for tenant '${tenantPartition}'`);
        }
        // Evaluate submission through human gate
        const decisionRecord = this.humanGate.evaluateSubmission(entry, submission);
        // Map decision to lifecycle state
        let targetState;
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
        let intakeResult;
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
