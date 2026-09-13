// src/core/policyActiveRollback/policyActiveRollbackRuntime.ts
// BOWCON V4.0 — MS-1.3.72: GOVERNED ACTIVE POLICY ROLLBACK, SUNSET & RECOVERY BOUNDARY
//
// Master Active Rollback Runtime Coordinator (Component 817).
// Orchestrates deterministic rollback target resolution, independent revalidation,
// human governance review, atomic state transitions, cryptographic provenance,
// canonical audit logging, and active runtime resynchronization via MS-1.3.71.
//
// Core Authority Invariants:
// - ACTIVE_POLICY != ROLLBACK_TARGET
// - ACTIVE_POLICY != SUNSET_REQUEST
// - ROLLBACK_REQUEST != ROLLBACK_COMMIT
// - SUNSET_REQUEST != POLICY_MUTATION
// - RECOVERY_REQUEST != AUTONOMOUS_RECOVERY
// - PDP != POLICY_AUTHORITY
// - PEP != POLICY_AUTHORITY
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - FAIL_CLOSED
import crypto from 'node:crypto';
import { PolicyActiveRollbackStore } from './policyActiveRollbackStore.js';
import { PolicyRollbackTargetResolver } from './policyRollbackTargetResolver.js';
import { PolicyRollbackRevalidationEngine } from './policyRollbackRevalidationEngine.js';
import { PolicySunsetEvaluationEngine } from './policySunsetEvaluationEngine.js';
import { PolicyRecoveryEvaluationEngine } from './policyRecoveryEvaluationEngine.js';
import { PolicyGovernedRollbackBoundary } from './policyGovernedRollbackBoundary.js';
import { PolicyRollbackStateTransitionEngine } from './policyRollbackStateTransitionEngine.js';
import { PolicyActiveRollbackProvenanceEngine } from './policyActiveRollbackProvenanceEngine.js';
import { PolicyActiveRollbackAuditEngine } from './policyActiveRollbackAuditEngine.js';
import { PolicyActivationStateStore } from '../policyStagedActivation/policyActivationStateStore.js';
export class PolicyActiveRollbackRuntime {
    isUserStopActiveFn;
    stateStore;
    rollbackStore;
    targetResolver;
    revalidationEngine;
    sunsetEngine;
    recoveryEngine;
    boundary;
    transitionEngine;
    provenanceEngine;
    auditEngine;
    activeRuntimeCoordinator;
    constructor(options, activeRuntimeCoordinator, stateStore, rollbackStore) {
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.stateStore = stateStore ?? new PolicyActivationStateStore(options);
        this.rollbackStore = rollbackStore ?? new PolicyActiveRollbackStore(options);
        this.targetResolver = new PolicyRollbackTargetResolver(options, this.rollbackStore);
        this.revalidationEngine = new PolicyRollbackRevalidationEngine(options);
        this.sunsetEngine = new PolicySunsetEvaluationEngine(options);
        this.recoveryEngine = new PolicyRecoveryEvaluationEngine(options);
        this.boundary = new PolicyGovernedRollbackBoundary(options);
        this.transitionEngine = new PolicyRollbackStateTransitionEngine(options, this.stateStore, this.rollbackStore);
        this.provenanceEngine = new PolicyActiveRollbackProvenanceEngine(options);
        this.auditEngine = new PolicyActiveRollbackAuditEngine(options);
        this.activeRuntimeCoordinator = activeRuntimeCoordinator;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active policy rollback runtime suspended by USER_STOP supremacy');
        }
    }
    // ============================================================================
    // 1. HISTORICAL POLICY MANAGEMENT
    // ============================================================================
    /**
     * Registers a historically verified active policy version.
     */
    recordHistoricalPolicy(policy) {
        this.assertUserStopInactive();
        return this.rollbackStore.saveHistoricalPolicy(policy);
    }
    /**
     * Retrieves a historical policy version by targetId.
     */
    getHistoricalPolicy(tenantPartition, targetId) {
        this.assertUserStopInactive();
        return this.rollbackStore.getHistoricalPolicyById(tenantPartition, targetId);
    }
    // ============================================================================
    // 2. GOVERNED ROLLBACK LIFECYCLE
    // ============================================================================
    /**
     * Initiates a governed rollback request.
     */
    requestRollback(params) {
        this.assertUserStopInactive();
        const { tenantPartition, targetPolicyVersion, requestedBy, reason } = params;
        // Verify current active policy exists
        const currentActive = this.stateStore.getActivePolicy(tenantPartition);
        if (!currentActive) {
            this.auditEngine.recordEvent({
                eventType: 'ROLLBACK_BLOCKED',
                tenantPartition,
                actorUserId: requestedBy,
                details: { reason: 'No active policy found to rollback from' },
            });
            throw new Error(`NO_ACTIVE_POLICY: Tenant '${tenantPartition}' has no active policy to rollback from`);
        }
        // Resolve target to verify targetId and basic compatibility
        const res = this.targetResolver.resolveTarget({
            tenantPartition,
            targetPolicyVersion,
            targetId: params.targetId,
            currentActiveVersion: currentActive.activePolicyVersion,
        });
        if (!res.success || !res.target) {
            this.auditEngine.recordEvent({
                eventType: 'ROLLBACK_BLOCKED',
                tenantPartition,
                actorUserId: requestedBy,
                details: { failureReason: res.failureReason },
            });
            throw new Error(`ROLLBACK_TARGET_RESOLUTION_FAILED: ${res.failureReason}`);
        }
        const now = new Date().toISOString();
        const reqHash = crypto.createHash('sha256')
            .update(`${tenantPartition}:${currentActive.activePolicyVersion}:${targetPolicyVersion}:${requestedBy}:${now}`)
            .digest('hex');
        const rollbackRequestId = `rolreq_${reqHash.substring(0, 16)}`;
        const request = Object.freeze({
            rollbackRequestId,
            tenantPartition,
            currentActivePolicyStateId: currentActive.activePolicyStateId,
            currentActivePolicyVersion: currentActive.activePolicyVersion,
            targetPolicyVersion: res.target.policyVersion,
            targetId: res.target.targetId,
            requestedBy,
            requestedRole: params.requestedRole,
            reason,
            state: 'REQUESTED',
            requestedAt: now,
            isAutonomous: false,
            isActivePolicy: false,
            isPolicyMutation: false,
        });
        this.rollbackStore.saveRollbackRequest(request);
        this.auditEngine.recordEvent({
            eventType: 'ROLLBACK_REQUESTED',
            tenantPartition,
            actorUserId: requestedBy,
            details: {
                rollbackRequestId,
                currentActiveVersion: currentActive.activePolicyVersion,
                targetPolicyVersion: res.target.policyVersion,
                targetId: res.target.targetId,
            },
        });
        this.provenanceEngine.appendRecord({
            tenantPartition,
            activePolicyStateId: currentActive.activePolicyStateId,
            targetPolicyVersion: res.target.policyVersion,
            rollbackRequestId,
            eventType: 'ROLLBACK_REQUESTED',
            payload: {
                rollbackRequestId,
                requestedBy,
                reason,
                targetPolicyVersion: res.target.policyVersion,
            },
        });
        return request;
    }
    /**
     * Independently revalidates a rollback request.
     */
    revalidateRollback(rollbackRequestId, tenantPartition) {
        this.assertUserStopInactive();
        const request = this.rollbackStore.getRollbackRequest(tenantPartition, rollbackRequestId);
        if (!request) {
            throw new Error(`ROLLBACK_REQUEST_NOT_FOUND: Request '${rollbackRequestId}' not found for tenant '${tenantPartition}'`);
        }
        const currentActive = this.stateStore.getActivePolicy(tenantPartition);
        const target = this.rollbackStore.getHistoricalPolicyById(tenantPartition, request.targetId);
        if (!target) {
            throw new Error(`TARGET_NOT_FOUND: Historical target '${request.targetId}' not found for tenant '${tenantPartition}'`);
        }
        const revalidation = this.revalidationEngine.revalidate({
            request,
            target,
            actualCurrentActiveStateId: currentActive?.activePolicyStateId,
            actualCurrentActiveVersion: currentActive?.activePolicyVersion,
        });
        if (revalidation.valid) {
            this.rollbackStore.saveRollbackRequest({
                ...request,
                state: 'HUMAN_REVIEW_REQUIRED',
            });
            this.auditEngine.recordEvent({
                eventType: 'ROLLBACK_REVALIDATED',
                tenantPartition,
                details: {
                    revalidationId: revalidation.revalidationId,
                    rollbackRequestId,
                    status: revalidation.status,
                    checksPassed: revalidation.checksPassed,
                },
            });
            this.auditEngine.recordEvent({
                eventType: 'ROLLBACK_HUMAN_REVIEW_REQUIRED',
                tenantPartition,
                details: {
                    revalidationId: revalidation.revalidationId,
                    rollbackRequestId,
                },
            });
            this.provenanceEngine.appendRecord({
                tenantPartition,
                activePolicyStateId: request.currentActivePolicyStateId,
                targetPolicyVersion: request.targetPolicyVersion,
                rollbackRequestId: request.rollbackRequestId,
                eventType: 'ROLLBACK_REVALIDATED',
                payload: {
                    revalidationId: revalidation.revalidationId,
                    status: revalidation.status,
                },
            });
        }
        else {
            this.rollbackStore.saveRollbackRequest({
                ...request,
                state: 'BLOCKED',
            });
            this.auditEngine.recordEvent({
                eventType: 'ROLLBACK_BLOCKED',
                tenantPartition,
                details: {
                    revalidationId: revalidation.revalidationId,
                    rollbackRequestId,
                    status: revalidation.status,
                    blockingReasons: revalidation.blockingReasons,
                },
            });
        }
        return revalidation;
    }
    /**
     * Authorizes a revalidated rollback request by an authorized human operator.
     */
    authorizeRollback(params) {
        this.assertUserStopInactive();
        const { rollbackRequestId, tenantPartition, revalidation, operatorId, operatorRole, governanceRationale } = params;
        const request = this.rollbackStore.getRollbackRequest(tenantPartition, rollbackRequestId);
        if (!request) {
            throw new Error(`ROLLBACK_REQUEST_NOT_FOUND: Request '${rollbackRequestId}' not found`);
        }
        const previousHash = this.provenanceEngine.getHeadHash(tenantPartition);
        const authorization = this.boundary.authorizeOperation({
            operationType: 'ROLLBACK',
            targetRequestId: rollbackRequestId,
            tenantPartition,
            evaluationId: revalidation.revalidationId,
            evaluationStatus: revalidation.status,
            operatorId,
            operatorRole,
            governanceRationale,
            requestedBy: request.requestedBy,
            previousHash,
        });
        this.rollbackStore.saveRollbackRequest({
            ...request,
            state: 'AUTHORIZED',
        });
        this.auditEngine.recordEvent({
            eventType: 'ROLLBACK_AUTHORIZED',
            tenantPartition,
            actorUserId: operatorId,
            actorRole: operatorRole,
            details: {
                authorizationId: authorization.authorizationId,
                rollbackRequestId,
                governanceRationale,
            },
        });
        this.provenanceEngine.appendRecord({
            tenantPartition,
            activePolicyStateId: request.currentActivePolicyStateId,
            targetPolicyVersion: request.targetPolicyVersion,
            rollbackRequestId: request.rollbackRequestId,
            authorizationDecisionId: authorization.authorizationId,
            eventType: 'ROLLBACK_AUTHORIZED',
            payload: {
                authorizationId: authorization.authorizationId,
                authorizedBy: operatorId,
                authorizedRole: operatorRole,
            },
        });
        return authorization;
    }
    /**
     * Atomically commits an authorized rollback and triggers active runtime resynchronization via MS-1.3.71.
     */
    commitRollback(params) {
        this.assertUserStopInactive();
        const { rollbackRequestId, tenantPartition, authorization } = params;
        const request = this.rollbackStore.getRollbackRequest(tenantPartition, rollbackRequestId);
        if (!request) {
            throw new Error(`ROLLBACK_REQUEST_NOT_FOUND: Request '${rollbackRequestId}' not found`);
        }
        const target = this.rollbackStore.getHistoricalPolicyById(tenantPartition, request.targetId);
        if (!target) {
            throw new Error(`TARGET_NOT_FOUND: Historical target '${request.targetId}' not found`);
        }
        // Atomic transition commit
        const commitResult = this.transitionEngine.commitRollback({
            request,
            target,
            authorization,
        });
        this.auditEngine.recordEvent({
            eventType: 'ROLLBACK_COMMITTED',
            tenantPartition,
            actorUserId: authorization.authorizedBy,
            actorRole: authorization.authorizedRole,
            details: {
                commitId: commitResult.commitId,
                rollbackRequestId,
                newActivePolicyVersion: commitResult.newActivePolicyVersion,
            },
        });
        this.provenanceEngine.appendRecord({
            tenantPartition,
            activePolicyStateId: commitResult.newActivePolicyStateId,
            targetPolicyVersion: commitResult.newActivePolicyVersion,
            rollbackRequestId: request.rollbackRequestId,
            commitId: commitResult.commitId,
            eventType: 'ROLLBACK_COMMITTED',
            payload: {
                commitId: commitResult.commitId,
                newActivePolicyStateId: commitResult.newActivePolicyStateId,
                newActivePolicyVersion: commitResult.newActivePolicyVersion,
            },
        });
        // Active Runtime Resynchronization via MS-1.3.71 bridge
        let resynced = false;
        if (this.activeRuntimeCoordinator) {
            const syncRes = this.activeRuntimeCoordinator.synchronizeActivePolicy(tenantPartition);
            resynced = syncRes.state === 'SYNC_COMPLETED';
        }
        this.auditEngine.recordEvent({
            eventType: 'ROLLBACK_VERIFIED',
            tenantPartition,
            details: {
                commitId: commitResult.commitId,
                newActivePolicyVersion: commitResult.newActivePolicyVersion,
                resynchronized: resynced,
            },
        });
        this.provenanceEngine.appendRecord({
            tenantPartition,
            activePolicyStateId: commitResult.newActivePolicyStateId,
            commitId: commitResult.commitId,
            eventType: 'ROLLBACK_VERIFIED',
            payload: {
                commitId: commitResult.commitId,
                resynchronized: resynced,
            },
        });
        return Object.freeze({
            ...commitResult,
            resynchronized: resynced,
        });
    }
    // ============================================================================
    // 3. GOVERNED SUNSET LIFECYCLE
    // ============================================================================
    /**
     * Initiates a governed sunset request.
     */
    requestSunset(params) {
        this.assertUserStopInactive();
        const { tenantPartition, requestedBy, reason, replacementPolicyVersion } = params;
        const currentActive = this.stateStore.getActivePolicy(tenantPartition);
        if (!currentActive) {
            throw new Error(`NO_ACTIVE_POLICY: Tenant '${tenantPartition}' has no active policy to sunset`);
        }
        const now = new Date().toISOString();
        const sunHash = crypto.createHash('sha256')
            .update(`${tenantPartition}:${currentActive.activePolicyVersion}:${requestedBy}:${now}`)
            .digest('hex');
        const sunsetRequestId = `sunreq_${sunHash.substring(0, 16)}`;
        const request = Object.freeze({
            sunsetRequestId,
            tenantPartition,
            currentActivePolicyStateId: currentActive.activePolicyStateId,
            currentActivePolicyVersion: currentActive.activePolicyVersion,
            requestedBy,
            requestedRole: params.requestedRole,
            reason,
            replacementPolicyVersion,
            state: 'REQUESTED',
            requestedAt: now,
            isAutonomous: false,
            isActivePolicy: false,
        });
        this.rollbackStore.saveSunsetRequest(request);
        this.auditEngine.recordEvent({
            eventType: 'SUNSET_REQUESTED',
            tenantPartition,
            actorUserId: requestedBy,
            details: {
                sunsetRequestId,
                currentActiveVersion: currentActive.activePolicyVersion,
                replacementPolicyVersion,
            },
        });
        this.provenanceEngine.appendRecord({
            tenantPartition,
            activePolicyStateId: currentActive.activePolicyStateId,
            sunsetRequestId,
            eventType: 'SUNSET_REQUESTED',
            payload: {
                sunsetRequestId,
                requestedBy,
                reason,
                replacementPolicyVersion,
            },
        });
        return request;
    }
    /**
     * Evaluates a sunset request.
     */
    evaluateSunset(sunsetRequestId, tenantPartition) {
        this.assertUserStopInactive();
        const request = this.rollbackStore.getSunsetRequest(tenantPartition, sunsetRequestId);
        if (!request) {
            throw new Error(`SUNSET_REQUEST_NOT_FOUND: Request '${sunsetRequestId}' not found`);
        }
        const currentActive = this.stateStore.getActivePolicy(tenantPartition);
        let replacementAvailable = undefined;
        if (request.replacementPolicyVersion) {
            const hist = this.rollbackStore.getHistoricalPolicyByVersion(tenantPartition, request.replacementPolicyVersion);
            replacementAvailable = hist !== null && hist.verified;
        }
        const evaluation = this.sunsetEngine.evaluate({
            request,
            actualCurrentActiveStateId: currentActive?.activePolicyStateId,
            actualCurrentActiveVersion: currentActive?.activePolicyVersion,
            replacementPolicyAvailable: replacementAvailable,
        });
        if (evaluation.valid) {
            this.rollbackStore.saveSunsetRequest({
                ...request,
                state: 'HUMAN_REVIEW_REQUIRED',
            });
            this.auditEngine.recordEvent({
                eventType: 'SUNSET_EVALUATED',
                tenantPartition,
                details: {
                    evaluationId: evaluation.evaluationId,
                    sunsetRequestId,
                    status: evaluation.status,
                },
            });
        }
        else {
            this.rollbackStore.saveSunsetRequest({
                ...request,
                state: 'BLOCKED',
            });
            this.auditEngine.recordEvent({
                eventType: 'SUNSET_BLOCKED',
                tenantPartition,
                details: {
                    evaluationId: evaluation.evaluationId,
                    sunsetRequestId,
                    blockingReasons: evaluation.blockingReasons,
                },
            });
        }
        return evaluation;
    }
    /**
     * Authorizes a sunset request.
     */
    authorizeSunset(params) {
        this.assertUserStopInactive();
        const { sunsetRequestId, tenantPartition, evaluation, operatorId, operatorRole, governanceRationale } = params;
        const request = this.rollbackStore.getSunsetRequest(tenantPartition, sunsetRequestId);
        if (!request) {
            throw new Error(`SUNSET_REQUEST_NOT_FOUND: Request '${sunsetRequestId}' not found`);
        }
        const previousHash = this.provenanceEngine.getHeadHash(tenantPartition);
        const authorization = this.boundary.authorizeOperation({
            operationType: 'SUNSET',
            targetRequestId: sunsetRequestId,
            tenantPartition,
            evaluationId: evaluation.evaluationId,
            evaluationStatus: evaluation.status,
            operatorId,
            operatorRole,
            governanceRationale,
            requestedBy: request.requestedBy,
            previousHash,
        });
        this.rollbackStore.saveSunsetRequest({
            ...request,
            state: 'AUTHORIZED',
        });
        this.auditEngine.recordEvent({
            eventType: 'SUNSET_AUTHORIZED',
            tenantPartition,
            actorUserId: operatorId,
            actorRole: operatorRole,
            details: {
                authorizationId: authorization.authorizationId,
                sunsetRequestId,
                governanceRationale,
            },
        });
        this.provenanceEngine.appendRecord({
            tenantPartition,
            activePolicyStateId: request.currentActivePolicyStateId,
            sunsetRequestId: request.sunsetRequestId,
            authorizationDecisionId: authorization.authorizationId,
            eventType: 'SUNSET_AUTHORIZED',
            payload: {
                authorizationId: authorization.authorizationId,
                authorizedBy: operatorId,
            },
        });
        return authorization;
    }
    /**
     * Commits an authorized sunset request.
     */
    commitSunset(params) {
        this.assertUserStopInactive();
        const { sunsetRequestId, tenantPartition, authorization } = params;
        const request = this.rollbackStore.getSunsetRequest(tenantPartition, sunsetRequestId);
        if (!request) {
            throw new Error(`SUNSET_REQUEST_NOT_FOUND: Request '${sunsetRequestId}' not found`);
        }
        let replacementTarget = undefined;
        if (request.replacementPolicyVersion) {
            const hist = this.rollbackStore.getHistoricalPolicyByVersion(tenantPartition, request.replacementPolicyVersion);
            if (hist)
                replacementTarget = hist;
        }
        const commitResult = this.transitionEngine.commitSunset({
            request,
            authorization,
            replacementTarget,
        });
        this.auditEngine.recordEvent({
            eventType: 'SUNSET_COMMITTED',
            tenantPartition,
            actorUserId: authorization.authorizedBy,
            actorRole: authorization.authorizedRole,
            details: {
                commitId: commitResult.commitId,
                sunsetRequestId,
                retiredPolicyVersion: commitResult.retiredPolicyVersion,
            },
        });
        let resynced = false;
        if (this.activeRuntimeCoordinator) {
            const syncRes = this.activeRuntimeCoordinator.synchronizeActivePolicy(tenantPartition);
            resynced = syncRes.state === 'SYNC_COMPLETED';
        }
        this.auditEngine.recordEvent({
            eventType: 'SUNSET_VERIFIED',
            tenantPartition,
            details: {
                commitId: commitResult.commitId,
                retiredPolicyVersion: commitResult.retiredPolicyVersion,
                resynchronized: resynced,
            },
        });
        return Object.freeze({
            ...commitResult,
            resynchronized: resynced,
        });
    }
    // ============================================================================
    // 4. GOVERNED RECOVERY LIFECYCLE
    // ============================================================================
    /**
     * Initiates a governed recovery request.
     */
    requestRecovery(params) {
        this.assertUserStopInactive();
        const { tenantPartition, sourceState, recoveryTargetVersion, requestedBy, reason } = params;
        const histTarget = this.rollbackStore.getHistoricalPolicyByVersion(tenantPartition, recoveryTargetVersion);
        if (!histTarget) {
            throw new Error(`RECOVERY_TARGET_NOT_FOUND: Historical policy version '${recoveryTargetVersion}' not found for tenant '${tenantPartition}'`);
        }
        const now = new Date().toISOString();
        const recHash = crypto.createHash('sha256')
            .update(`${tenantPartition}:${recoveryTargetVersion}:${requestedBy}:${now}`)
            .digest('hex');
        const recoveryRequestId = `recreq_${recHash.substring(0, 16)}`;
        const request = Object.freeze({
            recoveryRequestId,
            tenantPartition,
            sourceState,
            recoveryTargetVersion,
            targetId: histTarget.targetId,
            requestedBy,
            requestedRole: params.requestedRole,
            reason,
            state: 'REQUESTED',
            requestedAt: now,
            isAutonomous: false,
            isActivePolicy: false,
        });
        this.rollbackStore.saveRecoveryRequest(request);
        this.auditEngine.recordEvent({
            eventType: 'RECOVERY_REQUESTED',
            tenantPartition,
            actorUserId: requestedBy,
            details: {
                recoveryRequestId,
                sourceState,
                recoveryTargetVersion,
            },
        });
        this.provenanceEngine.appendRecord({
            tenantPartition,
            targetPolicyVersion: recoveryTargetVersion,
            recoveryRequestId,
            eventType: 'RECOVERY_REQUESTED',
            payload: {
                recoveryRequestId,
                requestedBy,
                reason,
            },
        });
        return request;
    }
    /**
     * Revalidates a recovery request.
     */
    revalidateRecovery(recoveryRequestId, tenantPartition) {
        this.assertUserStopInactive();
        const request = this.rollbackStore.getRecoveryRequest(tenantPartition, recoveryRequestId);
        if (!request) {
            throw new Error(`RECOVERY_REQUEST_NOT_FOUND: Request '${recoveryRequestId}' not found`);
        }
        const currentActive = this.stateStore.getActivePolicy(tenantPartition);
        const target = this.rollbackStore.getHistoricalPolicyById(tenantPartition, request.targetId);
        if (!target) {
            throw new Error(`RECOVERY_TARGET_NOT_FOUND: Target historical policy not found`);
        }
        const evaluation = this.recoveryEngine.evaluate({
            request,
            target,
            currentActiveVersion: currentActive?.activePolicyVersion,
        });
        if (evaluation.valid) {
            this.rollbackStore.saveRecoveryRequest({
                ...request,
                state: 'HUMAN_REVIEW_REQUIRED',
            });
            this.auditEngine.recordEvent({
                eventType: 'RECOVERY_REVALIDATED',
                tenantPartition,
                details: {
                    evaluationId: evaluation.evaluationId,
                    recoveryRequestId,
                    status: evaluation.status,
                },
            });
        }
        else {
            this.rollbackStore.saveRecoveryRequest({
                ...request,
                state: 'BLOCKED',
            });
            this.auditEngine.recordEvent({
                eventType: 'RECOVERY_BLOCKED',
                tenantPartition,
                details: {
                    evaluationId: evaluation.evaluationId,
                    recoveryRequestId,
                    blockingReasons: evaluation.blockingReasons,
                },
            });
        }
        return evaluation;
    }
    /**
     * Authorizes a recovery request.
     */
    authorizeRecovery(params) {
        this.assertUserStopInactive();
        const { recoveryRequestId, tenantPartition, evaluation, operatorId, operatorRole, governanceRationale } = params;
        const request = this.rollbackStore.getRecoveryRequest(tenantPartition, recoveryRequestId);
        if (!request) {
            throw new Error(`RECOVERY_REQUEST_NOT_FOUND: Request '${recoveryRequestId}' not found`);
        }
        const previousHash = this.provenanceEngine.getHeadHash(tenantPartition);
        const authorization = this.boundary.authorizeOperation({
            operationType: 'RECOVERY',
            targetRequestId: recoveryRequestId,
            tenantPartition,
            evaluationId: evaluation.evaluationId,
            evaluationStatus: evaluation.status,
            operatorId,
            operatorRole,
            governanceRationale,
            requestedBy: request.requestedBy,
            previousHash,
        });
        this.rollbackStore.saveRecoveryRequest({
            ...request,
            state: 'AUTHORIZED',
        });
        this.auditEngine.recordEvent({
            eventType: 'RECOVERY_AUTHORIZED',
            tenantPartition,
            actorUserId: operatorId,
            actorRole: operatorRole,
            details: {
                authorizationId: authorization.authorizationId,
                recoveryRequestId,
                governanceRationale,
            },
        });
        return authorization;
    }
    /**
     * Stages an authorized recovery for deployment.
     */
    stageRecovery(recoveryRequestId, tenantPartition) {
        this.assertUserStopInactive();
        const request = this.rollbackStore.getRecoveryRequest(tenantPartition, recoveryRequestId);
        if (!request) {
            throw new Error(`RECOVERY_REQUEST_NOT_FOUND: Request '${recoveryRequestId}' not found`);
        }
        if (request.state !== 'AUTHORIZED') {
            throw new Error(`RECOVERY_NOT_AUTHORIZED: Request state is '${request.state}', requires 'AUTHORIZED'`);
        }
        const staged = this.rollbackStore.saveRecoveryRequest({
            ...request,
            state: 'STAGED',
        });
        this.auditEngine.recordEvent({
            eventType: 'RECOVERY_STAGED',
            tenantPartition,
            details: {
                recoveryRequestId,
                recoveryTargetVersion: request.recoveryTargetVersion,
            },
        });
        return staged;
    }
    /**
     * Commits a staged recovery and triggers active runtime resynchronization via MS-1.3.71.
     */
    commitRecovery(params) {
        this.assertUserStopInactive();
        const { recoveryRequestId, tenantPartition, authorization } = params;
        const request = this.rollbackStore.getRecoveryRequest(tenantPartition, recoveryRequestId);
        if (!request) {
            throw new Error(`RECOVERY_REQUEST_NOT_FOUND: Request '${recoveryRequestId}' not found`);
        }
        const target = this.rollbackStore.getHistoricalPolicyById(tenantPartition, request.targetId);
        if (!target) {
            throw new Error(`RECOVERY_TARGET_NOT_FOUND: Target historical policy not found`);
        }
        const commitResult = this.transitionEngine.commitRecovery({
            request,
            target,
            authorization,
        });
        this.auditEngine.recordEvent({
            eventType: 'RECOVERY_COMMITTED',
            tenantPartition,
            actorUserId: authorization.authorizedBy,
            actorRole: authorization.authorizedRole,
            details: {
                commitId: commitResult.commitId,
                recoveryRequestId,
                recoveredPolicyVersion: commitResult.recoveredPolicyVersion,
            },
        });
        let resynced = false;
        if (this.activeRuntimeCoordinator) {
            const syncRes = this.activeRuntimeCoordinator.synchronizeActivePolicy(tenantPartition);
            resynced = syncRes.state === 'SYNC_COMPLETED';
        }
        this.auditEngine.recordEvent({
            eventType: 'RECOVERY_VERIFIED',
            tenantPartition,
            details: {
                commitId: commitResult.commitId,
                recoveredPolicyVersion: commitResult.recoveredPolicyVersion,
                resynchronized: resynced,
            },
        });
        return Object.freeze({
            ...commitResult,
            resynchronized: resynced,
        });
    }
    // ============================================================================
    // ACCESSORS
    // ============================================================================
    getProvenanceEngine() {
        return this.provenanceEngine;
    }
    getAuditEngine() {
        return this.auditEngine;
    }
    getStore() {
        return this.rollbackStore;
    }
}
