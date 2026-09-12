// src/core/orchestration/taskReviewEngine.ts
// BOWCON V4.0 — MS-1.3.46: TASK REVIEW ENGINE
//
// Governed supervisory review before task completion.
//
// INVARIANTS:
// - VERIFIED != OWNER_APPROVED: Technical verification is not Master Owner authorization.
// - Agents cannot self-approve or approve their own authority (SELF_APPROVAL_REJECTED).
// - Reuses canonical globalSupervisorHumanGate & globalWorldActionAuth: Zero duplicate HumanGate.
// - Zero duplicate authorization token stores.
// - USER_STOP > EVERYTHING_AUTONOMOUS: All reviews freeze on USER_STOP.
import crypto from 'node:crypto';
import { MASTER_OWNER_ID, isMasterOwner, } from '../architecture/masterArchitectureIdentity.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalSupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
export class TaskReviewError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'TaskReviewError';
    }
}
export class TaskReviewEngine {
    humanGate;
    reviews = new Map();
    constructor(humanGate = globalSupervisorHumanGate) {
        this.humanGate = humanGate;
    }
    /**
     * Reviews a completed task and its evidence bundle.
     */
    reviewTask(input) {
        const { task, evidenceBundle, reviewerId, reviewerType, notes } = input;
        // 1. Universal USER_STOP supremacy
        if (globalMasterHumanAuthority.isUserStopActive) {
            throw new TaskReviewError('USER_STOP_ACTIVE', 'Cannot perform task review while USER_STOP is active.');
        }
        // 2. Self-Approval Rejection: Agent cannot approve its own task!
        if (task.assignment && task.assignment.agentId === reviewerId) {
            throw new TaskReviewError('SELF_APPROVAL_REJECTED', `Agent ${reviewerId} cannot review or approve its own task ${task.taskId}.`);
        }
        // 3. Evidence Bundle Integrity Check
        if (evidenceBundle.totalCount === 0 || evidenceBundle.epistemicState === 'EVIDENCE_UNKNOWN') {
            throw new TaskReviewError('EVIDENCE_NOT_FOUND', `Cannot verify task ${task.taskId}: Evidence bundle is empty or unknown.`);
        }
        // 4. Decision determination
        let decision = input.decision;
        if (!decision) {
            if (evidenceBundle.epistemicState === 'EVIDENCE_VERIFIED') {
                decision = 'VERIFIED';
            }
            else if (evidenceBundle.epistemicState === 'EVIDENCE_CONTRADICTED' ||
                evidenceBundle.epistemicState === 'EVIDENCE_REJECTED') {
                decision = 'REJECTED';
            }
            else {
                decision = 'ESCALATED_TO_HUMAN';
            }
        }
        // 5. Invariant: Only Master Owner can set ownerApproved = true!
        const ownerApproved = reviewerType === 'MASTER_OWNER' && isMasterOwner(reviewerId);
        const reviewId = `rev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const review = {
            reviewId,
            taskId: task.taskId,
            reviewedAt: Date.now(),
            reviewerType,
            reviewerId,
            evidenceBundleId: evidenceBundle.bundleId,
            reviewDecision: decision,
            ownerApproved,
            notes,
        };
        this.reviews.set(reviewId, review);
        return review;
    }
    /**
     * Escalates an unresolved, high-impact, or contradictory task to the canonical HumanGate.
     * INVARIANT: Reuses globalSupervisorHumanGate — no second HumanGate created.
     */
    escalateToHumanGate(task, evidenceBundle, operatorId, reason = 'Task requires human supervisory approval') {
        if (globalMasterHumanAuthority.isUserStopActive) {
            throw new TaskReviewError('USER_STOP_ACTIVE', 'Cannot escalate to HumanGate while USER_STOP is active.');
        }
        const diagnosis = {
            anomalyId: `task_anomaly_${task.taskId}`,
            classification: 'GOVERNANCE_ESCALATION',
            severity: 'HIGH',
            rootCause: reason,
            recommendedRecovery: `Review evidence bundle ${evidenceBundle.bundleId} for task ${task.taskId}`,
            confidence: 1.0,
            evidence: [evidenceBundle.bundleIntegrityHash],
            requiresHumanIntervention: true,
            suggestedTimeoutMs: 300000,
        };
        const plan = {
            planId: `plan_${task.taskId}`,
            anomalyId: diagnosis.anomalyId,
            riskLevel: 'HIGH',
            steps: [
                {
                    stepId: 'step_review_evidence',
                    description: `Supervisory review for task ${task.title}`,
                    isReversible: true,
                },
            ],
            timeoutMs: 300000,
        };
        const gateRequest = this.humanGate.createRequest(diagnosis, plan, {
            target: task.taskId,
            expectedEffects: [reason],
            authorizationContext: {
                actionId: `action_${task.taskId}`,
                sessionId: task.sessionId,
                taskId: task.taskId,
                deviceId: task.assignment?.deviceId || 'device_local',
                capabilityId: task.requiredCapabilities[0] || 'governed_task_review',
                parameters: { operatorId, reason },
                target: task.taskId,
            },
        });
        const reviewId = `rev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const review = {
            reviewId,
            taskId: task.taskId,
            reviewedAt: Date.now(),
            reviewerType: 'SUPERVISOR',
            reviewerId: 'supervisor_gate',
            evidenceBundleId: evidenceBundle.bundleId,
            reviewDecision: 'ESCALATED_TO_HUMAN',
            humanGateRequestId: gateRequest.requestId,
            ownerApproved: false,
            notes: reason,
        };
        this.reviews.set(reviewId, review);
        return { review, gateRequest };
    }
    /**
     * Confirms Master Owner explicit approval.
     * INVARIANT: OWNER_APPROVED requires Master Owner identity.
     */
    recordOwnerApproval(reviewId, operatorId) {
        const existing = this.reviews.get(reviewId);
        if (!existing) {
            throw new TaskReviewError('TASK_NOT_FOUND', `Review record ${reviewId} not found.`);
        }
        if (!isMasterOwner(operatorId)) {
            throw new TaskReviewError('HUMAN_APPROVAL_REQUIRED', `Only Master Owner (${MASTER_OWNER_ID}) may grant owner approval. Received: ${operatorId}`);
        }
        const updated = {
            ...existing,
            reviewerId: operatorId,
            reviewerType: 'MASTER_OWNER',
            ownerApproved: true,
            reviewedAt: Date.now(),
            notes: `${existing.notes || ''} [APPROVED_BY_MASTER_OWNER]`.trim(),
        };
        this.reviews.set(reviewId, updated);
        return updated;
    }
    getReview(reviewId) {
        return this.reviews.get(reviewId);
    }
    getReviewsByTask(taskId) {
        return Array.from(this.reviews.values()).filter((r) => r.taskId === taskId);
    }
    clear() {
        this.reviews.clear();
    }
}
export const globalTaskReviewEngine = new TaskReviewEngine();
