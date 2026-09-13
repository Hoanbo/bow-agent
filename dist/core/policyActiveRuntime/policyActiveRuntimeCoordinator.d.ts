import type { ActiveRuntimeSyncResult, RuntimePolicySnapshot, RuntimePDPDecision, RuntimePEPEnforcementResult, PolicyActiveRuntimeOptions } from './policyActiveRuntimeTypes.js';
import { PolicyActivationStateStore } from '../policyStagedActivation/policyActivationStateStore.js';
import { PolicyDecisionPoint } from '../policyDecisionPoint.js';
import { ApprovalService } from '../approvalService.js';
export declare class PolicyActiveRuntimeCoordinator {
    private readonly stateStore;
    private readonly freshnessValidator;
    private readonly syncEngine;
    private readonly snapshotResolver;
    private readonly pdpBridge;
    private readonly pepBridge;
    private readonly provenanceEngine;
    private readonly auditEngine;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveRuntimeOptions, pdp?: PolicyDecisionPoint, approvalService?: ApprovalService, stateStore?: PolicyActivationStateStore);
    private assertUserStopInactive;
    /**
     * Synchronizes active policy from durable store into memory for a tenant.
     */
    synchronizeActivePolicy(tenantPartition: string): ActiveRuntimeSyncResult;
    /**
     * Resolves the authoritative active runtime policy snapshot for a tenant.
     */
    resolveActiveSnapshot(tenantPartition: string): RuntimePolicySnapshot;
    /**
     * Evaluates a proposed tool action against the tenant's active policy snapshot using PDP.
     */
    evaluatePDP(action: string, tenantPartition: string, args?: Record<string, any>): RuntimePDPDecision;
    /**
     * Governed PEP enforcement prior to execution.
     */
    enforcePEP(action: string, tenantPartition: string, options?: {
        args?: Record<string, any>;
        executionToken?: string;
        actorUserId?: string;
    }): RuntimePEPEnforcementResult;
    /**
     * Verifies the cryptographic provenance chain for a tenant.
     */
    verifyProvenanceChain(tenantPartition: string): boolean;
    /**
     * Retrieves the provenance chain for a tenant.
     */
    getProvenanceChain(tenantPartition: string): readonly import("./policyActiveRuntimeTypes.js").ActiveRuntimeProvenanceRecord[];
}
