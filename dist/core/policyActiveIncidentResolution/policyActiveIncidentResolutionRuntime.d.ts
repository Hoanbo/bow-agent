import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type { PolicyActiveIncidentStore } from '../policyActiveIncidentResponse/policyActiveIncidentStore.js';
import type { PolicyEmergencySafetyBoundary } from '../policyActiveIncidentResponse/policyEmergencySafetyBoundary.js';
import type { PolicyActivationStateStore } from '../policyStagedActivation/policyActivationStateStore.js';
import type { PolicyActiveRuntimeCoordinator } from '../policyActiveRuntime/policyActiveRuntimeCoordinator.js';
import type { PolicyActiveRollbackRuntime } from '../policyActiveRollback/policyActiveRollbackRuntime.js';
import type { PolicyActiveLifecycleReconciliationRuntime } from '../policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationRuntime.js';
import type { ContainmentAssessmentRecord, ContainmentClearanceRecord, RecoveryAuthorizationRecord, IncidentRecoveryHandoffRecord, IncidentRecoveryVerificationRecord, IncidentResolutionRecord, IncidentClosureRecord, PolicyActiveIncidentResolutionOptions } from './policyActiveIncidentResolutionTypes.js';
import { PolicyActiveIncidentResolutionStore } from './policyActiveIncidentResolutionStore.js';
import { PolicyActiveIncidentResolutionProvenanceEngine } from './policyActiveIncidentResolutionProvenanceEngine.js';
import { PolicyActiveIncidentResolutionAuditEngine } from './policyActiveIncidentResolutionAuditEngine.js';
export declare class PolicyActiveIncidentResolutionRuntime {
    private readonly isUserStopActiveFn?;
    private readonly incidentStore?;
    private readonly safetyBoundary?;
    private readonly stateStore?;
    private readonly runtimeCoordinator?;
    private readonly rollbackRuntime?;
    private readonly reconciliationRuntime?;
    private readonly resolutionStore;
    private readonly revalidationEngine;
    private readonly assessmentEngine;
    private readonly clearanceBoundary;
    private readonly recoveryAuthEngine;
    private readonly handoffEngine;
    private readonly verificationEngine;
    private readonly resolutionEngine;
    private readonly closureBoundary;
    private readonly provenanceEngine;
    private readonly auditEngine;
    constructor(options?: PolicyActiveIncidentResolutionOptions, dependencies?: {
        incidentStore?: PolicyActiveIncidentStore;
        safetyBoundary?: PolicyEmergencySafetyBoundary;
        stateStore?: PolicyActivationStateStore;
        runtimeCoordinator?: PolicyActiveRuntimeCoordinator;
        rollbackRuntime?: PolicyActiveRollbackRuntime;
        reconciliationRuntime?: PolicyActiveLifecycleReconciliationRuntime;
        resolutionStore?: PolicyActiveIncidentResolutionStore;
    });
    private assertUserStopInactive;
    acknowledgeIncident(params: {
        tenantPartition: string;
        incidentId: string;
        operatorId: string;
        operatorRole?: string;
        acknowledgementNote?: string;
    }): {
        acknowledged: boolean;
        incidentId: string;
    };
    revalidateIncident(tenantPartition: string, incidentId: string): import("./policyIncidentResolutionRevalidationEngine.js").IncidentRevalidationResult;
    assessContainment(tenantPartition: string, incidentId: string): ContainmentAssessmentRecord;
    clearContainment(params: {
        tenantPartition: string;
        assessmentId: string;
        operatorId: string;
        operatorRole: HumanAuthorizationRole;
        governanceRationale: string;
        originalReporterId?: string | null;
    }): ContainmentClearanceRecord;
    authorizeRecovery(params: {
        tenantPartition: string;
        clearanceId: string;
        recoveryTargetVersion: string;
        operatorId: string;
        operatorRole: HumanAuthorizationRole;
        governanceRationale: string;
        originalRequesterId?: string | null;
    }): RecoveryAuthorizationRecord;
    handoffRecovery(params: {
        tenantPartition: string;
        authorizationId: string;
    }): {
        handoffRecord: IncidentRecoveryHandoffRecord;
        commitResult: any;
    };
    verifyRecovery(tenantPartition: string, handoffId: string): IncidentRecoveryVerificationRecord;
    confirmResolution(params: {
        tenantPartition: string;
        incidentId: string;
        clearanceId: string;
        verificationId?: string;
        nonRecoveryResolutionRationale?: string;
    }): IncidentResolutionRecord;
    closeIncident(params: {
        tenantPartition: string;
        resolutionId: string;
        operatorId: string;
        operatorRole: HumanAuthorizationRole;
        closureRationale: string;
        originalReporterId?: string | null;
    }): IncidentClosureRecord;
    getStore(): PolicyActiveIncidentResolutionStore;
    getProvenanceEngine(): PolicyActiveIncidentResolutionProvenanceEngine;
    getAuditEngine(): PolicyActiveIncidentResolutionAuditEngine;
}
