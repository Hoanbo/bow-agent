// src/core/policyFeedbackReview/policyEvolutionIntakeEngine.ts
// BOWCON V4.0 — MS-1.3.67: GOVERNED FEEDBACK REVIEW, POLICY EVOLUTION INTAKE & HUMAN REVIEW QUEUE LAYER
//
// Governed Policy Evolution Intake Engine (Component 760).
// Creates strictly bounded Policy Evolution Intake Requests for accepted feedback reviews.
// Serves as the governed bridge to MS-1.3.58 Policy Evolution WITHOUT mutating policy state.
//
// Authority Invariants:
// - INTAKE_IS_NOT_ACTIVATION: Intake request is an input to policy evolution, not an execution command
// - ZERO_AUTONOMOUS_POLICY_MUTATION: No candidate creation, activation, promotion, or rollback
// - RETAIN_CURRENT_POLICY_NO_INTAKE: Proposals recommending policy retention generate zero intake
// - STRICT_TENANT_ISOLATION: Rejects cross-tenant intake creation
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import path from 'node:path';
import { createPolicyEvolutionIntakeId } from './policyFeedbackReviewTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyEvolutionIntakeEngine {
    baseDir;
    isUserStopActiveFn;
    // Tenant -> Map<reviewId, PolicyEvolutionIntakeRequest>
    intakes = new Map();
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Evolution intake suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('INTAKE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    getTenantIntakes(tenantPartition) {
        let map = this.intakes.get(tenantPartition);
        if (!map) {
            map = new Map();
            this.intakes.set(tenantPartition, map);
        }
        return map;
    }
    /**
     * Deterministically maps a proposal action type to an evolution intake action type.
     */
    mapActionType(proposedAction) {
        switch (proposedAction) {
            case 'INVESTIGATE_POLICY_DRIFT':
                return 'INVESTIGATION_INTAKE';
            case 'RE_EVALUATE_CANDIDATE':
                return 'CANDIDATE_REEVALUATION_INTAKE';
            case 'REQUEST_NEW_CANDIDATE':
                return 'CANDIDATE_GENERATION_INTAKE';
            case 'REQUEST_ROLLBACK_REVIEW':
                return 'ROLLBACK_REVIEW_INTAKE';
            case 'REQUEST_HUMAN_INVESTIGATION':
                return 'HUMAN_INVESTIGATION_INTAKE';
            case 'RETAIN_CURRENT_POLICY':
                return undefined; // No intake generated
            default:
                throw new Error(`UNRECOGNIZED_FEEDBACK_ACTION: Cannot map action '${proposedAction}' to evolution intake`);
        }
    }
    /**
     * Creates a bounded Policy Evolution Intake Request for an accepted human review.
     */
    createIntakeRequest(entry, decisionRecord, provenanceHeadHash) {
        // 1. Fail closed on USER_STOP
        this.assertUserStopInactive();
        // 2. Validate tenant partition
        this.validateTenant(entry.tenantPartition);
        if (entry.tenantPartition !== decisionRecord.tenantPartition) {
            throw new Error(`TENANT_MISMATCH: Queue entry tenant '${entry.tenantPartition}' does not match decision tenant '${decisionRecord.tenantPartition}'`);
        }
        if (entry.reviewId !== decisionRecord.reviewId) {
            throw new Error(`REVIEW_ID_MISMATCH: Queue entry reviewId '${entry.reviewId}' does not match decision '${decisionRecord.reviewId}'`);
        }
        // 3. Must be ACCEPT decision
        if (decisionRecord.decision !== 'ACCEPT') {
            return {
                created: false,
                reason: `DECISION_NOT_ACCEPTED: Cannot create evolution intake for decision '${decisionRecord.decision}'`,
            };
        }
        // 4. Invariant: RETAIN_CURRENT_POLICY does not produce evolution intake
        if (entry.proposedAction === 'RETAIN_CURRENT_POLICY') {
            return {
                created: false,
                reason: 'RETAIN_CURRENT_POLICY: Policy retention proposals require no evolution intake',
            };
        }
        // 5. Anti-duplicate defense: check existing intake
        const tenantMap = this.getTenantIntakes(entry.tenantPartition);
        const existing = tenantMap.get(entry.reviewId);
        if (existing) {
            return {
                created: true,
                intakeRequest: existing,
                reason: 'EXISTING_INTAKE_RETURNED: Intake request already exists for this review',
            };
        }
        const intakeAction = this.mapActionType(entry.proposedAction);
        if (!intakeAction) {
            return {
                created: false,
                reason: `NO_INTAKE_ACTION_MAPPED: Action '${entry.proposedAction}' maps to no evolution intake`,
            };
        }
        const rawIdHash = crypto.createHash('sha256')
            .update(`${entry.reviewId}:${decisionRecord.decisionId}:${entry.proposalId}:${provenanceHeadHash}`)
            .digest('hex');
        const intakeId = createPolicyEvolutionIntakeId(`intake_${rawIdHash.substring(0, 16)}`);
        const intakeRequest = Object.freeze({
            intakeId,
            reviewId: entry.reviewId,
            proposalId: entry.proposalId,
            tenantPartition: entry.tenantPartition,
            candidateId: entry.candidateId,
            sourceExecutionId: entry.executionId,
            intakeAction,
            state: 'CREATED',
            impactClassification: entry.impactClassification,
            effectivenessStatus: entry.effectivenessStatus,
            regressionTypes: entry.regressionTypes,
            humanReviewerId: decisionRecord.reviewerId,
            humanDecisionTimestamp: decisionRecord.decidedAt,
            provenanceHeadHash,
            isAutonomousMutation: false,
            isPolicyMutation: false,
            createdAt: new Date().toISOString(),
        });
        tenantMap.set(entry.reviewId, intakeRequest);
        return {
            created: true,
            intakeRequest,
        };
    }
    /**
     * Retrieves existing intake request for a review.
     */
    getIntakeRequest(tenantPartition, reviewId) {
        this.assertUserStopInactive();
        this.validateTenant(tenantPartition);
        return this.getTenantIntakes(tenantPartition).get(reviewId);
    }
}
