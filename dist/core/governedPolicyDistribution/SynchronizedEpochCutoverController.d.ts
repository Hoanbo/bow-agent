import { type PolicyDistributionManifest, type EpochDecision, type PolicyDomain, type Clock, type EmergencyStopProvider } from './GovernedPolicyDistributionTypes.js';
import { FleetNodeRegistry } from './FleetNodeRegistry.js';
import { BoundedNodeDeliveryCoordinator } from './BoundedNodeDeliveryCoordinator.js';
import { NodePolicyAttestationVerifier } from './NodePolicyAttestationVerifier.js';
import { FleetConvergenceEvaluator } from './FleetConvergenceEvaluator.js';
import { FailClosedNodeQuarantineController } from './FailClosedNodeQuarantineController.js';
import { PolicyDistributionAuditLedger } from './PolicyDistributionAuditLedger.js';
export interface SynchronizedEpochCutoverControllerOptions {
    registry: FleetNodeRegistry;
    deliveryCoordinator: BoundedNodeDeliveryCoordinator;
    convergenceEvaluator: FleetConvergenceEvaluator;
    quarantineController: FailClosedNodeQuarantineController;
    clock: Clock;
    attestationVerifier?: NodePolicyAttestationVerifier;
    auditLedger?: PolicyDistributionAuditLedger;
    baseStorageDir?: string;
    emergencyStopProvider?: EmergencyStopProvider;
    callerToken?: symbol;
}
export declare class SynchronizedEpochCutoverController {
    private readonly registry;
    private readonly deliveryCoordinator;
    private readonly convergenceEvaluator;
    private readonly quarantineController;
    private readonly clock;
    private readonly attestationVerifier?;
    private readonly auditLedger?;
    private readonly baseStorageDir;
    private readonly emergencyStopProvider?;
    private readonly callerToken;
    constructor(registryOrOptions: FleetNodeRegistry | SynchronizedEpochCutoverControllerOptions, deliveryCoordinator?: BoundedNodeDeliveryCoordinator, convergenceEvaluator?: FleetConvergenceEvaluator, quarantineController?: FailClosedNodeQuarantineController, clock?: Clock, attestationVerifier?: NodePolicyAttestationVerifier, auditLedger?: PolicyDistributionAuditLedger, baseStorageDir?: string, emergencyStopProvider?: EmergencyStopProvider, callerToken?: symbol);
    private getPartitionDir;
    private getEpochsFilePath;
    private acquireLock;
    private loadEpochDecisionsUnderLock;
    private saveEpochDecisionsUnderLock;
    private deriveDecisionId;
    /**
     * Prepares an epoch decision.
     * State machine: PREPARED
     */
    prepare(manifest: PolicyDistributionManifest, nowMs: number): Promise<EpochDecision>;
    /**
     * Commits an epoch cutover.
     * State machine: PREPARED -> COMMIT_DURABLE -> COMMIT_DELIVERY -> ATTESTATION_PENDING -> CONVERGED | DIVERGED | RECOVERY_EXHAUSTED
     */
    commit(manifest: PolicyDistributionManifest, nowMs: number): Promise<EpochDecision>;
    /**
     * Executes post-commit delivery, bounded retries, attestation pending, divergence detection, and reconciliation.
     */
    private executePostCommitCoordination;
    /**
     * Aborts a prepared epoch before durable commit.
     * State machine: PREPARED -> ABORTED
     */
    abort(manifest: PolicyDistributionManifest, reason: string, nowMs: number): Promise<EpochDecision>;
    /**
     * Recovers unfinished epoch decisions.
     */
    recover(tenantId: string, domain: PolicyDomain, nowMs: number): Promise<readonly EpochDecision[]>;
}
