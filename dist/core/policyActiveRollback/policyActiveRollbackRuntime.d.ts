import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { HistoricalPolicyVersion, RollbackRequest, RollbackRevalidationResult, SunsetRequest, SunsetEvaluationResult, RecoveryRequest, RecoveryEvaluationResult, GovernedRollbackAuthorization, RollbackCommitResult, SunsetCommitResult, RecoveryCommitResult, PolicyActiveRollbackOptions } from './policyActiveRollbackTypes.js';
import { PolicyActiveRollbackStore } from './policyActiveRollbackStore.js';
import { PolicyActiveRollbackProvenanceEngine } from './policyActiveRollbackProvenanceEngine.js';
import { PolicyActiveRollbackAuditEngine } from './policyActiveRollbackAuditEngine.js';
import { PolicyActivationStateStore } from '../policyStagedActivation/policyActivationStateStore.js';
import { PolicyActiveRuntimeCoordinator } from '../policyActiveRuntime/policyActiveRuntimeCoordinator.js';
export declare class PolicyActiveRollbackRuntime {
    private readonly isUserStopActiveFn?;
    private readonly stateStore;
    private readonly rollbackStore;
    private readonly targetResolver;
    private readonly revalidationEngine;
    private readonly sunsetEngine;
    private readonly recoveryEngine;
    private readonly boundary;
    private readonly transitionEngine;
    private readonly provenanceEngine;
    private readonly auditEngine;
    private readonly activeRuntimeCoordinator?;
    constructor(options?: PolicyActiveRollbackOptions, activeRuntimeCoordinator?: PolicyActiveRuntimeCoordinator, stateStore?: PolicyActivationStateStore, rollbackStore?: PolicyActiveRollbackStore);
    private assertUserStopInactive;
    /**
     * Registers a historically verified active policy version.
     */
    recordHistoricalPolicy(policy: HistoricalPolicyVersion): HistoricalPolicyVersion;
    /**
     * Retrieves a historical policy version by targetId.
     */
    getHistoricalPolicy(tenantPartition: string, targetId: string): HistoricalPolicyVersion | null;
    /**
     * Initiates a governed rollback request.
     */
    requestRollback(params: {
        readonly tenantPartition: string;
        readonly targetPolicyVersion: string;
        readonly targetId?: string;
        readonly requestedBy: string;
        readonly requestedRole?: string;
        readonly reason: string;
    }): RollbackRequest;
    /**
     * Independently revalidates a rollback request.
     */
    revalidateRollback(rollbackRequestId: string, tenantPartition: string): RollbackRevalidationResult;
    /**
     * Authorizes a revalidated rollback request by an authorized human operator.
     */
    authorizeRollback(params: {
        readonly rollbackRequestId: string;
        readonly tenantPartition: string;
        readonly revalidation: RollbackRevalidationResult;
        readonly operatorId: string;
        readonly operatorRole: HumanAuthorizationRole;
        readonly governanceRationale: string;
    }): GovernedRollbackAuthorization;
    /**
     * Atomically commits an authorized rollback and triggers active runtime resynchronization via MS-1.3.71.
     */
    commitRollback(params: {
        readonly rollbackRequestId: string;
        readonly tenantPartition: string;
        readonly authorization: GovernedRollbackAuthorization;
    }): RollbackCommitResult;
    /**
     * Initiates a governed sunset request.
     */
    requestSunset(params: {
        readonly tenantPartition: string;
        readonly requestedBy: string;
        readonly requestedRole?: string;
        readonly reason: string;
        readonly replacementPolicyVersion?: string;
    }): SunsetRequest;
    /**
     * Evaluates a sunset request.
     */
    evaluateSunset(sunsetRequestId: string, tenantPartition: string): SunsetEvaluationResult;
    /**
     * Authorizes a sunset request.
     */
    authorizeSunset(params: {
        readonly sunsetRequestId: string;
        readonly tenantPartition: string;
        readonly evaluation: SunsetEvaluationResult;
        readonly operatorId: string;
        readonly operatorRole: HumanAuthorizationRole;
        readonly governanceRationale: string;
    }): GovernedRollbackAuthorization;
    /**
     * Commits an authorized sunset request.
     */
    commitSunset(params: {
        readonly sunsetRequestId: string;
        readonly tenantPartition: string;
        readonly authorization: GovernedRollbackAuthorization;
    }): SunsetCommitResult;
    /**
     * Initiates a governed recovery request.
     */
    requestRecovery(params: {
        readonly tenantPartition: string;
        readonly sourceState: 'ROLLED_BACK' | 'SUNSET' | 'DEACTIVATED';
        readonly recoveryTargetVersion: string;
        readonly requestedBy: string;
        readonly requestedRole?: string;
        readonly reason: string;
    }): RecoveryRequest;
    /**
     * Revalidates a recovery request.
     */
    revalidateRecovery(recoveryRequestId: string, tenantPartition: string): RecoveryEvaluationResult;
    /**
     * Authorizes a recovery request.
     */
    authorizeRecovery(params: {
        readonly recoveryRequestId: string;
        readonly tenantPartition: string;
        readonly evaluation: RecoveryEvaluationResult;
        readonly operatorId: string;
        readonly operatorRole: HumanAuthorizationRole;
        readonly governanceRationale: string;
    }): GovernedRollbackAuthorization;
    /**
     * Stages an authorized recovery for deployment.
     */
    stageRecovery(recoveryRequestId: string, tenantPartition: string): RecoveryRequest;
    /**
     * Commits a staged recovery and triggers active runtime resynchronization via MS-1.3.71.
     */
    commitRecovery(params: {
        readonly recoveryRequestId: string;
        readonly tenantPartition: string;
        readonly authorization: GovernedRollbackAuthorization;
    }): RecoveryCommitResult;
    getProvenanceEngine(): PolicyActiveRollbackProvenanceEngine;
    getAuditEngine(): PolicyActiveRollbackAuditEngine;
    getStore(): PolicyActiveRollbackStore;
}
