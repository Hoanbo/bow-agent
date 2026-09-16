import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { HumanDecisionTokenVerificationEngine } from '../governedPolicyDecisionIngestion/HumanDecisionTokenVerificationEngine.js';
import type { StrategicPolicyRollbackController } from '../governedPolicyDecisionIngestion/StrategicPolicyRollbackController.js';
import { GOVERNED_POLICY_LIFECYCLE_INVARIANTS, HEALTH_THRESHOLD_DEGRADED, HEALTH_THRESHOLD_CRITICAL, HEALTH_THRESHOLD_RESTORED, MAX_DECISION_LATENCY_OVERHEAD_MS, MAX_LINEAGE_DEPTH, MAX_ACTIVE_INCIDENTS_PER_DOMAIN, MAX_TOKEN_TTL_MS, GENESIS_PREV_HASH, ALL_LIFECYCLE_STATES, TERMINAL_LIFECYCLE_STATES, ACTIVE_OPERATIONAL_STATES, PAUSED_OPERATIONAL_STATES, GovernedPolicyLifecycleBaseError, InvalidLifecycleTransitionError, UnauthorizedLifecycleMutationError, AntiAgentIdentityRejectedError, SecondaryAuthorityRejectedError, PolicyLifecycleOCCConflictError, PolicyLifecycleTenantIsolationError, PolicyLifecycleTerminalStateError, PolicyLifecycleInterlockActiveError, PolicyHealthThresholdError, PolicyIncidentManagementError, PolicyLineageIntegrityError, PolicyOperationalEvidenceError, PolicyLifecycleAuditIntegrityError, canonicalJsonStringify, deepFreeze, computeLifecycleRecordHash, computeHealthReportHash, computeIncidentRecordHash, computeLineageNodeHash, computeEvidenceDossierHash, computeLifecycleAuditHash, type PolicyLifecycleRecordId, type PolicyIncidentId, type PolicyLineageNodeId, type OperationalEvidenceDossierId, type OperationalAuditRecordId, type PolicyLifecycleState, type PolicyLifecycleSecurityCheckpoint, type LifecycleAuditEventType, type PolicyLifecycleRecord, type PolicyHealthMetrics, type PolicyHealthReport, type PolicyIncidentSeverity, type PolicyIncidentType, type PolicyIncidentStatus, type PolicyIncidentRecord, type PolicyLineageNodeType, type PolicyLineageNode, type PolicyLineageGraphSnapshot, type PolicyOperationalEvidenceDossier, type PolicyLifecycleAuditEvent } from './GovernedPolicyLifecycleTypes.js';
import { PolicyLifecycleStateManager, type TransitionRequestParams } from './PolicyLifecycleStateManager.js';
import { PolicyHealthObservationEngine, type DecisionTraceSample } from './PolicyHealthObservationEngine.js';
import { PolicyOperationalIncidentManager } from './PolicyOperationalIncidentManager.js';
import { PolicyLifecycleLineageGraph } from './PolicyLifecycleLineageGraph.js';
import { PolicyOperationalEvidenceDossierEngine } from './PolicyOperationalEvidenceDossier.js';
import { GovernedOperationalControlGateway, type PrivilegedLifecycleOperationParams } from './GovernedOperationalControlGateway.js';
import { PolicyLifecycleInterlockCoordinator } from './PolicyLifecycleInterlockCoordinator.js';
import { PolicyLifecycleAuditLedger, type AuditEventParams } from './PolicyLifecycleAuditLedger.js';
export { GOVERNED_POLICY_LIFECYCLE_INVARIANTS, HEALTH_THRESHOLD_DEGRADED, HEALTH_THRESHOLD_CRITICAL, HEALTH_THRESHOLD_RESTORED, MAX_DECISION_LATENCY_OVERHEAD_MS, MAX_LINEAGE_DEPTH, MAX_ACTIVE_INCIDENTS_PER_DOMAIN, MAX_TOKEN_TTL_MS, GENESIS_PREV_HASH, ALL_LIFECYCLE_STATES, TERMINAL_LIFECYCLE_STATES, ACTIVE_OPERATIONAL_STATES, PAUSED_OPERATIONAL_STATES, GovernedPolicyLifecycleBaseError, InvalidLifecycleTransitionError, UnauthorizedLifecycleMutationError, AntiAgentIdentityRejectedError, SecondaryAuthorityRejectedError, PolicyLifecycleOCCConflictError, PolicyLifecycleTenantIsolationError, PolicyLifecycleTerminalStateError, PolicyLifecycleInterlockActiveError, PolicyHealthThresholdError, PolicyIncidentManagementError, PolicyLineageIntegrityError, PolicyOperationalEvidenceError, PolicyLifecycleAuditIntegrityError, canonicalJsonStringify, deepFreeze, computeLifecycleRecordHash, computeHealthReportHash, computeIncidentRecordHash, computeLineageNodeHash, computeEvidenceDossierHash, computeLifecycleAuditHash, type PolicyLifecycleRecordId, type PolicyIncidentId, type PolicyLineageNodeId, type OperationalEvidenceDossierId, type OperationalAuditRecordId, type PolicyLifecycleState, type PolicyLifecycleSecurityCheckpoint, type LifecycleAuditEventType, type PolicyLifecycleRecord, type PolicyHealthMetrics, type PolicyHealthReport, type PolicyIncidentSeverity, type PolicyIncidentType, type PolicyIncidentStatus, type PolicyIncidentRecord, type PolicyLineageNodeType, type PolicyLineageNode, type PolicyLineageGraphSnapshot, type PolicyOperationalEvidenceDossier, type PolicyLifecycleAuditEvent, PolicyLifecycleStateManager, type TransitionRequestParams, PolicyHealthObservationEngine, type DecisionTraceSample, PolicyOperationalIncidentManager, PolicyLifecycleLineageGraph, PolicyOperationalEvidenceDossierEngine, GovernedOperationalControlGateway, type PrivilegedLifecycleOperationParams, PolicyLifecycleInterlockCoordinator, PolicyLifecycleAuditLedger, type AuditEventParams, };
/**
 * Master Coordinator for Governed Policy Lifecycle & Operational Control (MS-1.5.21).
 */
export declare class GovernedPolicyLifecycleCoordinator {
    readonly interlockCoordinator: PolicyLifecycleInterlockCoordinator;
    readonly auditLedger: PolicyLifecycleAuditLedger;
    readonly stateManager: PolicyLifecycleStateManager;
    readonly healthEngine: PolicyHealthObservationEngine;
    readonly incidentManager: PolicyOperationalIncidentManager;
    readonly lineageGraph: PolicyLifecycleLineageGraph;
    readonly evidenceEngine: PolicyOperationalEvidenceDossierEngine;
    readonly controlGateway: GovernedOperationalControlGateway;
    constructor(options?: {
        customStoreDir?: string;
        tokenVerifier?: HumanDecisionTokenVerificationEngine;
        rollbackController?: StrategicPolicyRollbackController;
        isEmergencyStopActive?: (domain?: string) => boolean;
        isUserStopActive?: (tenantId?: string) => boolean;
    });
    /**
     * Register a newly ratified canonical policy and attach its root lineage.
     */
    registerRatifiedPolicy(params: {
        tenantId: string;
        policyDomain: PolicyDomain;
        policyId: string;
        policyVersion: number;
        canonicalPolicyHash: string;
        ratificationId: string;
        proposalId?: string;
    }): {
        lifecycleRecord: PolicyLifecycleRecord;
        lineageNode: PolicyLineageNode;
    };
    /**
     * Observe runtime health, record metric report, and trip safety halving if health is degraded.
     */
    observeAndEnforceHealth(params: {
        tenantId: string;
        policyDomain: PolicyDomain;
        policyId: string;
        policyVersion: number;
        metrics: PolicyHealthMetrics;
    }): {
        healthReport: PolicyHealthReport;
        triggeredIncident?: PolicyIncidentRecord;
        currentLifecycleRecord?: PolicyLifecycleRecord;
    };
    /**
     * Compile full operational evidence dossier for audit and compliance.
     */
    compileOperationalEvidenceDossier(params: {
        tenantId: string;
        policyDomain: PolicyDomain;
        policyId: string;
        policyVersion: number;
        metrics: PolicyHealthMetrics;
    }): PolicyOperationalEvidenceDossier;
}
