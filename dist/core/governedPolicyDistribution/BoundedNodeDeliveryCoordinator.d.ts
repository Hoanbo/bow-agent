import { type PolicyDistributionManifest, type FleetNodeRecord, type DeliveryBatchResult, type EpochDecision, type PolicyDistributionTransportAdapter, type EmergencyStopProvider } from './GovernedPolicyDistributionTypes.js';
import { FleetNodeRegistry } from './FleetNodeRegistry.js';
import { PolicyDistributionAuditLedger } from './PolicyDistributionAuditLedger.js';
export declare class BoundedNodeDeliveryCoordinator {
    private readonly transportAdapter;
    private readonly registry?;
    private readonly auditLedger?;
    private readonly emergencyStopProvider?;
    constructor(transportAdapter: PolicyDistributionTransportAdapter, registry?: FleetNodeRegistry, auditLedger?: PolicyDistributionAuditLedger, emergencyStopProvider?: EmergencyStopProvider);
    /**
     * Delivers PREPARE message to cohort nodes.
     * Exactly one transport message targets one node.
     */
    deliverPrepare(manifest: PolicyDistributionManifest, cohort: readonly FleetNodeRecord[], nowMs: number): Promise<DeliveryBatchResult>;
    /**
     * Delivers COMMIT message to cohort nodes.
     */
    deliverCommit(decision: EpochDecision, manifest: PolicyDistributionManifest, cohort: readonly FleetNodeRecord[], nowMs: number): Promise<DeliveryBatchResult>;
    /**
     * Delivers ABORT message to cohort nodes.
     */
    deliverAbort(decision: EpochDecision, manifest: PolicyDistributionManifest, reason: string, cohort: readonly FleetNodeRecord[], nowMs: number): Promise<DeliveryBatchResult>;
}
