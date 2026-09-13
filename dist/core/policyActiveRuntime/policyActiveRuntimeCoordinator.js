// src/core/policyActiveRuntime/policyActiveRuntimeCoordinator.ts
// BOWCON V4.0 — MS-1.3.71: GOVERNED ACTIVE POLICY RUNTIME SYNCHRONIZATION & ENFORCEMENT BRIDGE
//
// Master Active Runtime Policy Coordinator (Component 805).
// Orchestrates runtime synchronization, snapshot resolution, freshness validation,
// PDP evaluation, PEP enforcement, cryptographic provenance, and audit logging.
//
// Core Authority Invariants:
// - ACTIVE_POLICY != RUNTIME_POLICY_SNAPSHOT
// - RUNTIME_POLICY_SNAPSHOT != POLICY_MUTATION
// - PDP != POLICY_AUTHORITY
// - PEP != POLICY_AUTHORITY
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK
// - ZERO DIRECT TOOL EXECUTION
// - USER_STOP > EVERYTHING
import { PolicyActiveRuntimeSyncEngine } from './policyActiveRuntimeSyncEngine.js';
import { PolicyActiveRuntimeSnapshotResolver } from './policyActiveRuntimeSnapshotResolver.js';
import { PolicyActiveRuntimeFreshnessValidator } from './policyActiveRuntimeFreshnessValidator.js';
import { PolicyActiveRuntimePDPBridge } from './policyActiveRuntimePDPBridge.js';
import { PolicyActiveRuntimePEPBridge } from './policyActiveRuntimePEPBridge.js';
import { PolicyActiveRuntimeProvenanceEngine } from './policyActiveRuntimeProvenanceEngine.js';
import { PolicyActiveRuntimeAuditEngine } from './policyActiveRuntimeAuditEngine.js';
import { PolicyActivationStateStore } from '../policyStagedActivation/policyActivationStateStore.js';
export class PolicyActiveRuntimeCoordinator {
    stateStore;
    freshnessValidator;
    syncEngine;
    snapshotResolver;
    pdpBridge;
    pepBridge;
    provenanceEngine;
    auditEngine;
    isUserStopActiveFn;
    constructor(options, pdp, approvalService, stateStore) {
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.stateStore = stateStore ?? new PolicyActivationStateStore(options);
        this.freshnessValidator = new PolicyActiveRuntimeFreshnessValidator(options);
        this.syncEngine = new PolicyActiveRuntimeSyncEngine(options, this.stateStore, this.freshnessValidator);
        this.snapshotResolver = new PolicyActiveRuntimeSnapshotResolver(options, this.syncEngine);
        this.pdpBridge = new PolicyActiveRuntimePDPBridge(options, pdp);
        this.pepBridge = new PolicyActiveRuntimePEPBridge(options, this.pdpBridge, approvalService);
        this.provenanceEngine = new PolicyActiveRuntimeProvenanceEngine(options);
        this.auditEngine = new PolicyActiveRuntimeAuditEngine(options);
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active policy runtime operations suspended by USER_STOP supremacy');
        }
    }
    /**
     * Synchronizes active policy from durable store into memory for a tenant.
     */
    synchronizeActivePolicy(tenantPartition) {
        this.assertUserStopInactive();
        this.auditEngine.recordEvent({
            eventType: 'ACTIVE_POLICY_SYNC_STARTED',
            tenantPartition,
            details: { tenantPartition },
        });
        const result = this.syncEngine.syncTenantActivePolicy(tenantPartition);
        if (result.state === 'SYNC_COMPLETED' && result.snapshot) {
            this.auditEngine.recordEvent({
                eventType: 'ACTIVE_POLICY_SYNCED',
                tenantPartition,
                details: {
                    syncId: result.syncId,
                    snapshotId: result.snapshot.snapshotId,
                    activePolicyVersion: result.snapshot.policyVersion,
                    durationMs: result.syncDurationMs,
                },
            });
            this.provenanceEngine.appendRecord({
                tenantPartition,
                activePolicyStateId: result.snapshot.activePolicyStateId,
                snapshotId: result.snapshot.snapshotId,
                eventType: 'ACTIVE_POLICY_SYNCED',
                payload: {
                    syncId: result.syncId,
                    snapshotId: result.snapshot.snapshotId,
                    activePolicyVersion: result.snapshot.policyVersion,
                },
            });
        }
        else {
            this.auditEngine.recordEvent({
                eventType: 'ACTIVE_POLICY_SYNC_BLOCKED',
                tenantPartition,
                details: {
                    syncId: result.syncId,
                    state: result.state,
                    rejectionReason: result.rejectionReason,
                },
            });
        }
        return result;
    }
    /**
     * Resolves the authoritative active runtime policy snapshot for a tenant.
     */
    resolveActiveSnapshot(tenantPartition) {
        this.assertUserStopInactive();
        const res = this.snapshotResolver.resolveActivePolicySnapshot(tenantPartition);
        if (!res.success || !res.snapshot) {
            this.auditEngine.recordEvent({
                eventType: 'ACTIVE_POLICY_RESOLUTION_BLOCKED',
                tenantPartition,
                details: {
                    freshnessStatus: res.freshnessStatus,
                    reason: res.reason,
                },
            });
            throw new Error(`ACTIVE_POLICY_RESOLUTION_FAILED: Could not resolve active policy for tenant '${tenantPartition}': ${res.reason}`);
        }
        this.auditEngine.recordEvent({
            eventType: 'ACTIVE_POLICY_SNAPSHOT_RESOLVED',
            tenantPartition,
            details: {
                snapshotId: res.snapshot.snapshotId,
                policyVersion: res.snapshot.policyVersion,
            },
        });
        return res.snapshot;
    }
    /**
     * Evaluates a proposed tool action against the tenant's active policy snapshot using PDP.
     */
    evaluatePDP(action, tenantPartition, args) {
        this.assertUserStopInactive();
        const snapshot = this.resolveActiveSnapshot(tenantPartition);
        const decision = this.pdpBridge.evaluateActionAgainstSnapshot(action, snapshot, args);
        this.auditEngine.recordEvent({
            eventType: 'PDP_ACTIVE_POLICY_EVALUATION',
            tenantPartition,
            details: {
                action,
                allowed: decision.allowed,
                classification: decision.classification,
                requiresApproval: decision.requiresApproval,
                reason: decision.reason,
                snapshotId: decision.snapshotId,
            },
        });
        return decision;
    }
    /**
     * Governed PEP enforcement prior to execution.
     */
    enforcePEP(action, tenantPartition, options) {
        this.assertUserStopInactive();
        const snapshot = this.resolveActiveSnapshot(tenantPartition);
        const result = this.pepBridge.enforceBeforeExecution(action, snapshot, options?.args, options?.executionToken, options?.actorUserId);
        this.auditEngine.recordEvent({
            eventType: 'PEP_ACTIVE_POLICY_ENFORCEMENT',
            tenantPartition,
            actorUserId: options?.actorUserId,
            details: {
                enforcementId: result.enforcementId,
                action,
                disposition: result.disposition,
                decisionAllowed: result.decision.allowed,
                requiresApproval: result.decision.requiresApproval,
                approvalId: result.approvalId,
                snapshotId: snapshot.snapshotId,
            },
        });
        this.provenanceEngine.appendRecord({
            tenantPartition,
            activePolicyStateId: snapshot.activePolicyStateId,
            snapshotId: snapshot.snapshotId,
            enforcementId: result.enforcementId,
            eventType: 'PEP_ENFORCEMENT',
            payload: {
                action,
                disposition: result.disposition,
                decisionAllowed: result.decision.allowed,
                snapshotId: snapshot.snapshotId,
            },
        });
        return result;
    }
    /**
     * Verifies the cryptographic provenance chain for a tenant.
     */
    verifyProvenanceChain(tenantPartition) {
        this.assertUserStopInactive();
        return this.provenanceEngine.verifyChainIntegrity(tenantPartition);
    }
    /**
     * Retrieves the provenance chain for a tenant.
     */
    getProvenanceChain(tenantPartition) {
        this.assertUserStopInactive();
        return this.provenanceEngine.getChain(tenantPartition);
    }
}
