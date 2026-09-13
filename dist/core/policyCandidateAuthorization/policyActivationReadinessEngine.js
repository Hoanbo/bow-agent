// src/core/policyCandidateAuthorization/policyActivationReadinessEngine.ts
// BOWCON V4.0 — MS-1.3.69: GOVERNED CANDIDATE AUTHORIZATION & ACTIVATION READINESS LAYER
//
// Governed Policy Activation Readiness Engine (Component 780).
// Evaluates whether an authorized candidate satisfies all prerequisites for future staged activation.
//
// Authority Invariants:
// - ACTIVATION_READINESS != POLICY_MUTATION
// - READY_FOR_ACTIVATION != ACTIVATED (Readiness only evaluates prerequisites; does NOT activate)
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - NO_INFERRED_READINESS: Missing evidence never becomes READY_FOR_ACTIVATION
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import path from 'node:path';
import { createActivationReadinessId } from './policyCandidateAuthorizationTypes.js';
import { PolicyCandidateAuthorizationRevalidationEngine } from './policyCandidateAuthorizationRevalidationEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyActivationReadinessEngine {
    baseDir;
    isUserStopActiveFn;
    revalidationEngine;
    constructor(options, revalidationEngine) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.revalidationEngine = revalidationEngine ?? new PolicyCandidateAuthorizationRevalidationEngine(options);
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Activation readiness evaluation suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('READINESS_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    /**
     * Evaluates whether an authorized candidate is ready for a future activation stage.
     */
    evaluateReadiness(request, humanDecision) {
        this.assertUserStopInactive();
        this.validateTenant(request.tenantPartition);
        const prerequisitesSatisfied = [];
        const blockingReasons = [];
        // 1. Revalidation check
        const reval = this.revalidationEngine.revalidateCandidateForAuthorization(request);
        if (reval.valid && reval.status === 'VALID') {
            prerequisitesSatisfied.push('CANDIDATE_SCHEMA_AND_CONSTRAINTS_VALID');
        }
        else {
            blockingReasons.push(`CANDIDATE_REVALIDATION_FAILED: ${reval.status} (${reval.issues.join('; ')})`);
        }
        // 2. Freshness check
        if (request.expiresAt && Date.now() <= Date.parse(request.expiresAt)) {
            prerequisitesSatisfied.push('CANDIDATE_FRESHNESS_VERIFIED');
        }
        else {
            blockingReasons.push('CANDIDATE_EXPIRED_OR_INVALID_EXPIRATION');
        }
        // 3. Supersession check
        if (!request.supersededBy) {
            prerequisitesSatisfied.push('CANDIDATE_NOT_SUPERSEDED');
        }
        else {
            blockingReasons.push(`CANDIDATE_SUPERSEDED_BY: ${request.supersededBy}`);
        }
        // 4. Human Decision check
        if (!humanDecision) {
            blockingReasons.push('MISSING_HUMAN_AUTHORIZATION_DECISION');
        }
        else {
            // Validate linkage
            if (humanDecision.candidateDraftId !== request.candidateDraftId) {
                blockingReasons.push('HUMAN_DECISION_CANDIDATE_MISMATCH');
            }
            if (humanDecision.tenantPartition !== request.tenantPartition) {
                blockingReasons.push('HUMAN_DECISION_TENANT_MISMATCH');
            }
            if (humanDecision.decision === 'AUTHORIZE') {
                prerequisitesSatisfied.push('HUMAN_AUTHORIZATION_GRANTED');
            }
            else if (humanDecision.decision === 'REJECT') {
                blockingReasons.push(`HUMAN_DECISION_REJECTED: ${humanDecision.reason}`);
            }
            else if (humanDecision.decision === 'DEFER') {
                blockingReasons.push(`HUMAN_DECISION_DEFERRED: ${humanDecision.reason}`);
            }
            else if (humanDecision.decision === 'REQUEST_MORE_EVIDENCE') {
                blockingReasons.push(`HUMAN_REQUESTED_MORE_EVIDENCE: ${humanDecision.reason}`);
            }
            else if (humanDecision.decision === 'CANCEL') {
                blockingReasons.push(`HUMAN_DECISION_CANCELLED: ${humanDecision.reason}`);
            }
        }
        // Determine readiness state
        let state = 'NOT_READY';
        if (reval.status === 'BLOCKED') {
            state = 'BLOCKED';
        }
        else if (reval.status === 'EXPIRED') {
            state = 'EXPIRED';
        }
        else if (humanDecision && humanDecision.decision === 'REJECT') {
            state = 'REJECTED';
        }
        else if (!humanDecision || humanDecision.decision === 'DEFER' || humanDecision.decision === 'REQUEST_MORE_EVIDENCE') {
            state = 'PENDING_HUMAN_AUTHORIZATION';
        }
        else if (blockingReasons.length === 0 && prerequisitesSatisfied.length >= 4) {
            state = 'READY_FOR_ACTIVATION';
        }
        else {
            state = 'NOT_READY';
        }
        const now = new Date().toISOString();
        const rawReadinessHash = crypto.createHash('sha256')
            .update(`${request.candidateDraftId}:${request.tenantPartition}:${state}:${now}`)
            .digest('hex');
        const readinessId = createActivationReadinessId(`actready_${rawReadinessHash.substring(0, 16)}`);
        const result = Object.freeze({
            readinessId,
            candidateDraftId: request.candidateDraftId,
            authorizationDecisionId: humanDecision?.decisionId,
            evolutionPlanId: request.evolutionPlanId,
            intakeId: request.intakeId,
            tenantPartition: request.tenantPartition,
            state,
            prerequisitesSatisfied: Object.freeze(prerequisitesSatisfied),
            blockingReasons: Object.freeze(blockingReasons),
            evaluatedAt: now,
            isActivePolicy: false, // Strictly false: READY_FOR_ACTIVATION != ACTIVE_POLICY
            isActivated: false, // Strictly false: ACTIVATION_READY != ACTIVATED
        });
        return result;
    }
}
