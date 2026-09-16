// src/core/governedPolicyLifecycle/GovernedPolicyLifecycleModuleIndex.ts
// Component 1187: GovernedPolicyLifecycleModuleIndex (REAL)
//
// Master coordinator and public barrel export interface for Governed Policy Lifecycle
// & Operational Control Engine (MS-1.5.21).
// Preserves STORE_REFERENCE != MUTATION and coordinates lifecycle FSM, health observation,
// incident management, lineage DAGs, evidence dossiers, and cryptographic control gateways.
import { GOVERNED_POLICY_LIFECYCLE_INVARIANTS, HEALTH_THRESHOLD_DEGRADED, HEALTH_THRESHOLD_CRITICAL, HEALTH_THRESHOLD_RESTORED, MAX_DECISION_LATENCY_OVERHEAD_MS, MAX_LINEAGE_DEPTH, MAX_ACTIVE_INCIDENTS_PER_DOMAIN, MAX_TOKEN_TTL_MS, GENESIS_PREV_HASH, ALL_LIFECYCLE_STATES, TERMINAL_LIFECYCLE_STATES, ACTIVE_OPERATIONAL_STATES, PAUSED_OPERATIONAL_STATES, GovernedPolicyLifecycleBaseError, InvalidLifecycleTransitionError, UnauthorizedLifecycleMutationError, AntiAgentIdentityRejectedError, SecondaryAuthorityRejectedError, PolicyLifecycleOCCConflictError, PolicyLifecycleTenantIsolationError, PolicyLifecycleTerminalStateError, PolicyLifecycleInterlockActiveError, PolicyHealthThresholdError, PolicyIncidentManagementError, PolicyLineageIntegrityError, PolicyOperationalEvidenceError, PolicyLifecycleAuditIntegrityError, canonicalJsonStringify, deepFreeze, computeLifecycleRecordHash, computeHealthReportHash, computeIncidentRecordHash, computeLineageNodeHash, computeEvidenceDossierHash, computeLifecycleAuditHash, } from './GovernedPolicyLifecycleTypes.js';
import { PolicyLifecycleStateManager } from './PolicyLifecycleStateManager.js';
import { PolicyHealthObservationEngine } from './PolicyHealthObservationEngine.js';
import { PolicyOperationalIncidentManager } from './PolicyOperationalIncidentManager.js';
import { PolicyLifecycleLineageGraph } from './PolicyLifecycleLineageGraph.js';
import { PolicyOperationalEvidenceDossierEngine } from './PolicyOperationalEvidenceDossier.js';
import { GovernedOperationalControlGateway } from './GovernedOperationalControlGateway.js';
import { PolicyLifecycleInterlockCoordinator } from './PolicyLifecycleInterlockCoordinator.js';
import { PolicyLifecycleAuditLedger } from './PolicyLifecycleAuditLedger.js';
export { GOVERNED_POLICY_LIFECYCLE_INVARIANTS, HEALTH_THRESHOLD_DEGRADED, HEALTH_THRESHOLD_CRITICAL, HEALTH_THRESHOLD_RESTORED, MAX_DECISION_LATENCY_OVERHEAD_MS, MAX_LINEAGE_DEPTH, MAX_ACTIVE_INCIDENTS_PER_DOMAIN, MAX_TOKEN_TTL_MS, GENESIS_PREV_HASH, ALL_LIFECYCLE_STATES, TERMINAL_LIFECYCLE_STATES, ACTIVE_OPERATIONAL_STATES, PAUSED_OPERATIONAL_STATES, GovernedPolicyLifecycleBaseError, InvalidLifecycleTransitionError, UnauthorizedLifecycleMutationError, AntiAgentIdentityRejectedError, SecondaryAuthorityRejectedError, PolicyLifecycleOCCConflictError, PolicyLifecycleTenantIsolationError, PolicyLifecycleTerminalStateError, PolicyLifecycleInterlockActiveError, PolicyHealthThresholdError, PolicyIncidentManagementError, PolicyLineageIntegrityError, PolicyOperationalEvidenceError, PolicyLifecycleAuditIntegrityError, canonicalJsonStringify, deepFreeze, computeLifecycleRecordHash, computeHealthReportHash, computeIncidentRecordHash, computeLineageNodeHash, computeEvidenceDossierHash, computeLifecycleAuditHash, PolicyLifecycleStateManager, PolicyHealthObservationEngine, PolicyOperationalIncidentManager, PolicyLifecycleLineageGraph, PolicyOperationalEvidenceDossierEngine, GovernedOperationalControlGateway, PolicyLifecycleInterlockCoordinator, PolicyLifecycleAuditLedger, };
/**
 * Master Coordinator for Governed Policy Lifecycle & Operational Control (MS-1.5.21).
 */
export class GovernedPolicyLifecycleCoordinator {
    interlockCoordinator;
    auditLedger;
    stateManager;
    healthEngine;
    incidentManager;
    lineageGraph;
    evidenceEngine;
    controlGateway;
    constructor(options) {
        this.interlockCoordinator = new PolicyLifecycleInterlockCoordinator({
            isEmergencyStopActive: options?.isEmergencyStopActive,
            isUserStopActive: options?.isUserStopActive,
        });
        this.auditLedger = new PolicyLifecycleAuditLedger(options?.customStoreDir);
        this.stateManager = new PolicyLifecycleStateManager(options?.customStoreDir, this.auditLedger, this.interlockCoordinator);
        this.healthEngine = new PolicyHealthObservationEngine(this.auditLedger);
        this.incidentManager = new PolicyOperationalIncidentManager(this.stateManager, this.auditLedger);
        this.lineageGraph = new PolicyLifecycleLineageGraph();
        this.evidenceEngine = new PolicyOperationalEvidenceDossierEngine();
        this.controlGateway = new GovernedOperationalControlGateway(this.stateManager, options?.tokenVerifier, this.healthEngine, this.interlockCoordinator);
    }
    /**
     * Register a newly ratified canonical policy and attach its root lineage.
     */
    registerRatifiedPolicy(params) {
        const lifecycleRecord = this.stateManager.registerRatifiedPolicy({
            tenantId: params.tenantId,
            policyDomain: params.policyDomain,
            policyId: params.policyId,
            policyVersion: params.policyVersion,
            canonicalPolicyHash: params.canonicalPolicyHash,
            ratificationId: params.ratificationId,
        });
        const lineageNode = this.lineageGraph.attachNode({
            tenantId: params.tenantId,
            policyDomain: params.policyDomain,
            policyVersion: params.policyVersion,
            nodeType: 'RATIFICATION',
            entityId: params.ratificationId,
            metadata: {
                canonicalPolicyHash: params.canonicalPolicyHash,
                proposalId: params.proposalId,
            },
        });
        return { lifecycleRecord, lineageNode };
    }
    /**
     * Observe runtime health, record metric report, and trip safety halving if health is degraded.
     */
    observeAndEnforceHealth(params) {
        const healthReport = this.healthEngine.evaluateHealth(params);
        let triggeredIncident = undefined;
        if (healthReport.status === 'CRITICAL') {
            triggeredIncident = this.incidentManager.openIncident({
                tenantId: params.tenantId,
                policyDomain: params.policyDomain,
                policyId: params.policyId,
                policyVersion: params.policyVersion,
                incidentType: 'INC_HEALTH_DEGRADED',
                severity: 'CRITICAL',
                description: `Composite health score dropped to ${healthReport.compositeScore} (< 0.85). Automated safety suspension engaged.`,
                autoTripSafetyState: 'SUSPENDED',
            });
        }
        else if (healthReport.status === 'DEGRADED') {
            triggeredIncident = this.incidentManager.openIncident({
                tenantId: params.tenantId,
                policyDomain: params.policyDomain,
                policyId: params.policyId,
                policyVersion: params.policyVersion,
                incidentType: 'INC_HEALTH_DEGRADED',
                severity: 'HIGH',
                description: `Composite health score dropped to ${healthReport.compositeScore} (< 0.95). Operational degradation engaged.`,
                autoTripSafetyState: 'DEGRADED',
            });
        }
        const currentLifecycleRecord = this.stateManager.getLifecycleState(params.tenantId, params.policyDomain, params.policyId);
        return { healthReport, triggeredIncident, currentLifecycleRecord };
    }
    /**
     * Compile full operational evidence dossier for audit and compliance.
     */
    compileOperationalEvidenceDossier(params) {
        const lifecycleRecord = this.stateManager.getLifecycleState(params.tenantId, params.policyDomain, params.policyId);
        if (!lifecycleRecord) {
            throw new PolicyLifecycleTenantIsolationError(`NO_LIFECYCLE_RECORD: Policy '${params.policyId}' is not registered under tenant '${params.tenantId}' domain '${params.policyDomain}'.`);
        }
        const healthReport = this.healthEngine.evaluateHealth(params);
        const activeIncidents = this.incidentManager.getActiveIncidents(params.tenantId, params.policyDomain);
        const lineageSnapshot = this.lineageGraph.getGraphSnapshot(params.tenantId, params.policyDomain, params.policyVersion);
        const lineageFingerprint = lineageSnapshot ? lineageSnapshot.graphFingerprint : '0'.repeat(64);
        return this.evidenceEngine.compileDossier({
            tenantId: params.tenantId,
            policyDomain: params.policyDomain,
            policyId: params.policyId,
            policyVersion: params.policyVersion,
            lifecycleRecord,
            latestHealthReport: healthReport,
            activeIncidents,
            lineageGraphFingerprint: lineageFingerprint,
        });
    }
}
