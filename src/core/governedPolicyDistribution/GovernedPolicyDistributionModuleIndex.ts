// src/core/governedPolicyDistribution/GovernedPolicyDistributionModuleIndex.ts
// Component 1227: GovernedPolicyDistributionModuleIndex
//
// Master orchestration coordinator for governed policy distribution across components 1219-1226.

import {
  type PolicyDistributionManifest,
  type DistributionPipelineInput,
  type DistributionPipelineResult,
  type DeliveryBatchResult,
  type EpochDecision,
  type FleetConvergenceReport,
  type Clock,
  type EmergencyStopProvider,
  assertEmergencyStopInactive,
  assertValidIdentifier,
  assertValidDomain,
  DistributionValidationError,
} from './GovernedPolicyDistributionTypes.js';
import { FleetNodeRegistry } from './FleetNodeRegistry.js';
import { PolicyDistributionManifestPackager } from './PolicyDistributionManifestPackager.js';
import { BoundedNodeDeliveryCoordinator } from './BoundedNodeDeliveryCoordinator.js';
import { NodePolicyAttestationVerifier } from './NodePolicyAttestationVerifier.js';
import { FleetConvergenceEvaluator } from './FleetConvergenceEvaluator.js';
import { SynchronizedEpochCutoverController } from './SynchronizedEpochCutoverController.js';
import { FailClosedNodeQuarantineController, QUARANTINE_CALLER_TOKEN } from './FailClosedNodeQuarantineController.js';
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

export class GovernedPolicyDistributionModuleIndex {
  public readonly registry: FleetNodeRegistry;
  public readonly packager: PolicyDistributionManifestPackager;
  public readonly deliveryCoordinator: BoundedNodeDeliveryCoordinator;
  public readonly attestationVerifier: NodePolicyAttestationVerifier;
  public readonly convergenceEvaluator: FleetConvergenceEvaluator;
  public readonly cutoverController: SynchronizedEpochCutoverController;
  public readonly quarantineController: FailClosedNodeQuarantineController;
  public readonly auditLedger: PolicyDistributionAuditLedger;
  public readonly clock: Clock;
  public readonly emergencyStopProvider?: EmergencyStopProvider;

  private readonly internalToken = Symbol('INTERNAL_QUARANTINE_TOKEN');

  constructor(options: GovernedPolicyDistributionModuleIndexOptions) {
    this.registry = options.registry;
    this.packager = options.packager;
    this.deliveryCoordinator = options.deliveryCoordinator;
    this.attestationVerifier = options.attestationVerifier;
    this.convergenceEvaluator = options.convergenceEvaluator;
    this.cutoverController = options.cutoverController;
    this.quarantineController = options.quarantineController;
    this.auditLedger = options.auditLedger;
    this.clock = options.clock;
    this.emergencyStopProvider = options.emergencyStopProvider;

    // Install caller token on quarantine controller to ensure only authorized components can trigger quarantine
    this.quarantineController.setCallerToken(this.internalToken);
  }

  /**
   * Executes the full governed policy distribution pipeline for a packaged manifest.
   */
  public async executeDistributionPipeline(
    input: DistributionPipelineInput,
    nowMs: number
  ): Promise<DistributionPipelineResult> {
    assertEmergencyStopInactive(this.emergencyStopProvider);

    const { manifest } = input;
    assertValidIdentifier(manifest.tenantId, 'tenantId');
    assertValidIdentifier(manifest.federationId, 'federationId');
    assertValidDomain(manifest.policyDomain);

    // 1. Prepare epoch cutover
    const preparedDecision = await this.cutoverController.prepare(manifest, nowMs);

    // 2. Query target cohort nodes
    const cohort = this.registry.getFleetCohort(
      manifest.tenantId,
      manifest.federationId,
      manifest.policyDomain,
      manifest.targetCanaryRing,
      nowMs
    );

    // 3. Deliver PREPARE to cohort nodes
    const deliveryBatch = await this.deliveryCoordinator.deliverPrepare(manifest, cohort, nowMs);

    // 4. Pre-commit convergence evaluation
    const preCommitConvergence = this.convergenceEvaluator.evaluate(manifest, nowMs);

    let finalDecision: EpochDecision;
    let finalConvergence: FleetConvergenceReport = preCommitConvergence;

    // 5. If commit eligible, proceed with cutover commit; otherwise abort
    if (preCommitConvergence.isCommitEligible) {
      finalDecision = await this.cutoverController.commit(manifest, nowMs);
      finalConvergence = this.convergenceEvaluator.evaluate(manifest, this.clock.nowMs());
    } else {
      finalDecision = await this.cutoverController.abort(
        manifest,
        `Convergence not eligible: ${preCommitConvergence.status}`,
        nowMs
      );
    }

    return {
      manifestId: manifest.manifestId,
      epochDecision: finalDecision,
      convergence: finalConvergence,
      delivery: deliveryBatch,
    };
  }
}
