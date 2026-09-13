// src/core/policyStagedActivation/policyStagingEngine.ts
// BOWCON V4.0 — MS-1.3.70: GOVERNED STAGED POLICY ACTIVATION LAYER
//
// Governed Policy Staging Engine (Component 788).
// Synthesizes an immutable StagedPolicy artifact from an authorized and readiness-verified candidate.
// Enforces that staged policies NEVER automatically become active policies.
//
// Authority Invariants:
// - STAGED_POLICY != ACTIVE_POLICY
// - LEVEL_1_STAGING: Pre-deployment staging representation only; zero policy mutation
// - IDEMPOTENT: Repeated staging of same candidate and authorization returns existing record
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import path from 'node:path';
import { createStagedActivationId } from './policyStagedActivationTypes.js';
import { PolicyActivationRevalidationEngine } from './policyActivationRevalidationEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyStagingEngine {
    baseDir;
    isUserStopActiveFn;
    revalidationEngine;
    // In-memory tenant partition staged cache: tenant -> candidateDraftId -> StagedPolicy
    stagedCache = new Map();
    constructor(options, revalidationEngine) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.revalidationEngine = revalidationEngine ?? new PolicyActivationRevalidationEngine(options);
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Policy staging suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('STAGING_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    getTenantStagedMap(tenantPartition) {
        let map = this.stagedCache.get(tenantPartition);
        if (!map) {
            map = new Map();
            this.stagedCache.set(tenantPartition, map);
        }
        return map;
    }
    /**
     * Stages an authorized policy candidate draft into a governed StagedPolicy artifact.
     * Enforces revalidation and idempotent retrieval.
     */
    stageCandidate(params) {
        this.assertUserStopInactive();
        this.validateTenant(params.request.tenantPartition);
        // 1. Check existing cached staged policy for anti-duplicate idempotency
        const tenantMap = this.getTenantStagedMap(params.request.tenantPartition);
        const existing = tenantMap.get(params.request.candidateDraftId);
        if (existing) {
            // Return existing staged policy if identical decision binding
            if (existing.authorizationDecisionId === params.decision.decisionId) {
                return existing;
            }
            throw new Error(`CONFLICTING_STAGING_REQUEST: Candidate draft '${params.request.candidateDraftId}' is already staged under a different authorization decision`);
        }
        // 2. Pre-staging revalidation
        const reval = this.revalidationEngine.revalidateForActivation({
            request: params.request,
            decision: params.decision,
            readiness: params.readiness,
        });
        if (!reval.valid || reval.status !== 'VALID') {
            throw new Error(`POLICY_STAGING_REJECTED: Candidate failed pre-staging revalidation with status '${reval.status}': ${reval.issues.join('; ')}`);
        }
        const now = new Date().toISOString();
        const sourceVersion = params.request.sourcePolicyVersion ?? 'v4.0.0';
        const proposedPolicyVersion = params.proposedVersion ?? `${sourceVersion}+staged.${params.request.candidateDraftId}`;
        const rawIdHash = crypto.createHash('sha256')
            .update(`${params.request.candidateDraftId}:${params.decision.decisionId}:${params.request.tenantPartition}:${now}`)
            .digest('hex');
        const stagedActivationId = createStagedActivationId(`stgact_${rawIdHash.substring(0, 16)}`);
        const preflightRequirements = Object.freeze([
            'VERIFY_ENVIRONMENT_SANDBOX',
            'VERIFY_SOURCE_POLICY_VERSION_CONSISTENCY',
            'VERIFY_CIRCUIT_BREAKER_FLOORS',
            'VERIFY_NO_CONCURRENT_ACTIVATION',
            'VERIFY_PROVENANCE_HASH_CHAIN',
        ]);
        const provenanceHeadHash = crypto.createHash('sha256')
            .update(JSON.stringify({
            stagedActivationId,
            candidateDraftId: params.request.candidateDraftId,
            authorizationDecisionId: params.decision.decisionId,
            activationReadinessId: params.readiness.readinessId,
            sourcePolicyVersion: sourceVersion,
            proposedPolicyVersion,
            previousHash: params.decision.provenanceHash,
        }))
            .digest('hex');
        const stagedPolicy = Object.freeze({
            stagedActivationId,
            candidateDraftId: params.request.candidateDraftId,
            evolutionPlanId: params.request.evolutionPlanId,
            intakeId: params.request.intakeId,
            authorizationRequestId: params.request.requestId,
            authorizationDecisionId: params.decision.decisionId,
            activationReadinessId: params.readiness.readinessId,
            tenantPartition: params.request.tenantPartition,
            sourcePolicyVersion: sourceVersion,
            proposedPolicyVersion,
            targetPolicyDomain: params.request.targetPolicyDomain ?? 'OPERATIONAL_GOVERNANCE',
            stagedModifications: Object.freeze({ ...(params.request.candidateDraft.proposedChanges ?? {}) }),
            state: 'STAGED',
            preflightRequirements,
            provenanceHeadHash,
            stagedAt: now,
            isActivePolicy: false, // Strictly false: STAGED_POLICY != ACTIVE_POLICY
            isActivated: false, // Strictly false
            isAutonomousMutation: false, // Strictly false
        });
        tenantMap.set(stagedPolicy.candidateDraftId, stagedPolicy);
        return stagedPolicy;
    }
    /**
     * Retrieves a staged policy by candidate draft ID.
     */
    getStagedPolicy(tenantPartition, candidateDraftId) {
        this.assertUserStopInactive();
        this.validateTenant(tenantPartition);
        return this.getTenantStagedMap(tenantPartition).get(candidateDraftId) ?? null;
    }
}
