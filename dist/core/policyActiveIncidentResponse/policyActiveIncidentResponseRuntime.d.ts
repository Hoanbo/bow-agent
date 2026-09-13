import type { ActivePolicyState } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { RuntimePolicySnapshot } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
import type { LifecycleReconciliationResult } from '../policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationTypes.js';
import type { ActivePolicyIncidentRecord, SafetyBoundaryState, IncidentProvenanceRecord, PolicyActiveIncidentResponseOptions } from './policyActiveIncidentResponseTypes.js';
import { PolicyActiveIncidentSignalResolver } from './policyActiveIncidentSignalResolver.js';
import { PolicyActivePolicyDegradationDetector } from './policyActivePolicyDegradationDetector.js';
import { PolicyActiveIncidentClassifier } from './policyActiveIncidentClassifier.js';
import { PolicyEmergencySafetyBoundary, type SafetyBoundaryEnforcementCheck } from './policyEmergencySafetyBoundary.js';
import { PolicyIncidentEscalationEngine } from './policyIncidentEscalationEngine.js';
import { PolicyActiveIncidentStore } from './policyActiveIncidentStore.js';
import { PolicyActiveIncidentProvenanceEngine } from './policyActiveIncidentProvenanceEngine.js';
import { PolicyActiveIncidentAuditEngine } from './policyActiveIncidentAuditEngine.js';
export declare class PolicyActiveIncidentResponseRuntime {
    private readonly signalResolver;
    private readonly degradationDetector;
    private readonly classifier;
    private readonly safetyBoundary;
    private readonly escalationEngine;
    private readonly incidentStore;
    private readonly provenanceEngine;
    private readonly auditEngine;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResponseOptions, signalResolver?: PolicyActiveIncidentSignalResolver, degradationDetector?: PolicyActivePolicyDegradationDetector, classifier?: PolicyActiveIncidentClassifier, safetyBoundary?: PolicyEmergencySafetyBoundary, escalationEngine?: PolicyIncidentEscalationEngine, incidentStore?: PolicyActiveIncidentStore, provenanceEngine?: PolicyActiveIncidentProvenanceEngine, auditEngine?: PolicyActiveIncidentAuditEngine);
    private assertUserStopInactive;
    /**
     * Evaluates active policy operational health and creates or updates incidents.
     */
    evaluateIncidentState(tenantPartition: string, params: {
        activePolicyState?: ActivePolicyState | null;
        runtimeSnapshot?: RuntimePolicySnapshot | null;
        reconciliationResult?: LifecycleReconciliationResult | null;
        pdpDecisionAllowed?: boolean;
        pepDisposition?: string;
        testedAction?: string;
        recentDenialCount?: number;
        actorUserId?: string;
    }): ActivePolicyIncidentRecord | null;
    /**
     * Enforces emergency safety boundary on proposed action.
     */
    enforceSafetyBoundary(tenantPartition: string, action: string, actionClassification?: string): SafetyBoundaryEnforcementCheck;
    /**
     * Retrieves active safety boundary for a tenant.
     */
    getActiveSafetyBoundary(tenantPartition: string): SafetyBoundaryState | null;
    /**
     * Resolves an incident with explicit human operator governance.
     * Deactivates the safety boundary and records human clearance.
     */
    resolveIncidentWithHumanReview(tenantPartition: string, incidentId: string, operatorId: string, rationale: string): ActivePolicyIncidentRecord;
    /**
     * Closes a resolved incident.
     */
    closeIncident(tenantPartition: string, incidentId: string, operatorId: string, rationale: string): ActivePolicyIncidentRecord;
    /**
     * Retrieves the incident provenance chain for a tenant.
     */
    getIncidentProvenance(tenantPartition: string): readonly IncidentProvenanceRecord[];
    /**
     * Verifies the cryptographic integrity of the incident provenance chain.
     */
    verifyIncidentProvenance(tenantPartition: string): boolean;
}
