import { type DistributionPipelineInput, type DistributionPipelineResult, type Clock, type EmergencyStopProvider } from './GovernedPolicyDistributionTypes.js';
import { FleetNodeRegistry } from './FleetNodeRegistry.js';
import { PolicyDistributionManifestPackager } from './PolicyDistributionManifestPackager.js';
import { BoundedNodeDeliveryCoordinator } from './BoundedNodeDeliveryCoordinator.js';
import { NodePolicyAttestationVerifier } from './NodePolicyAttestationVerifier.js';
import { FleetConvergenceEvaluator } from './FleetConvergenceEvaluator.js';
import { SynchronizedEpochCutoverController } from './SynchronizedEpochCutoverController.js';
import { FailClosedNodeQuarantineController } from './FailClosedNodeQuarantineController.js';
import { PolicyDistributionAuditLedger } from './PolicyDistributionAuditLedger.js';
export interface GovernedPolicyDistributionModuleIndexOptions {
    registry: FleetNodeRegistry;
    packager: PolicyDistributionManifestPackager;
    deliveryCoordinator: BoundedNodeDeliveryCoordinator;
    attestationVerifier: NodePolicyAttestationVerifier;
    convergenceEvaluator: FleetConvergenceEvaluator;
    cutoverController: SynchronizedEpochCutoverController;
    quarantineController: FailClosedNodeQuarantineController;
    auditLedger: PolicyDistributionAuditLedger;
    clock: Clock;
    emergencyStopProvider?: EmergencyStopProvider;
}
export declare class GovernedPolicyDistributionModuleIndex {
    readonly registry: FleetNodeRegistry;
    readonly packager: PolicyDistributionManifestPackager;
    readonly deliveryCoordinator: BoundedNodeDeliveryCoordinator;
    readonly attestationVerifier: NodePolicyAttestationVerifier;
    readonly convergenceEvaluator: FleetConvergenceEvaluator;
    readonly cutoverController: SynchronizedEpochCutoverController;
    readonly quarantineController: FailClosedNodeQuarantineController;
    readonly auditLedger: PolicyDistributionAuditLedger;
    readonly clock: Clock;
    readonly emergencyStopProvider?: EmergencyStopProvider;
    private readonly internalToken;
    constructor(options: GovernedPolicyDistributionModuleIndexOptions);
    /**
     * Executes the full governed policy distribution pipeline for a packaged manifest.
     */
    executeDistributionPipeline(input: DistributionPipelineInput, nowMs: number): Promise<DistributionPipelineResult>;
}
