// src/core/governedPolicyDistribution/GovernedPolicyDistributionModuleIndex.ts
// Component 1227: GovernedPolicyDistributionModuleIndex
//
// Master orchestration coordinator for governed policy distribution across components 1219-1226.
import { assertEmergencyStopInactive, assertValidIdentifier, assertValidDomain, } from './GovernedPolicyDistributionTypes.js';
export class GovernedPolicyDistributionModuleIndex {
    registry;
    packager;
    deliveryCoordinator;
    attestationVerifier;
    convergenceEvaluator;
    cutoverController;
    quarantineController;
    auditLedger;
    clock;
    emergencyStopProvider;
    internalToken = Symbol('INTERNAL_QUARANTINE_TOKEN');
    constructor(options) {
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
    async executeDistributionPipeline(input, nowMs) {
        assertEmergencyStopInactive(this.emergencyStopProvider);
        const { manifest } = input;
        assertValidIdentifier(manifest.tenantId, 'tenantId');
        assertValidIdentifier(manifest.federationId, 'federationId');
        assertValidDomain(manifest.policyDomain);
        // 1. Prepare epoch cutover
        const preparedDecision = await this.cutoverController.prepare(manifest, nowMs);
        // 2. Query target cohort nodes
        const cohort = this.registry.getFleetCohort(manifest.tenantId, manifest.federationId, manifest.policyDomain, manifest.targetCanaryRing, nowMs);
        // 3. Deliver PREPARE to cohort nodes
        const deliveryBatch = await this.deliveryCoordinator.deliverPrepare(manifest, cohort, nowMs);
        // 4. Pre-commit convergence evaluation
        const preCommitConvergence = this.convergenceEvaluator.evaluate(manifest, nowMs);
        let finalDecision;
        let finalConvergence = preCommitConvergence;
        // 5. If commit eligible, proceed with cutover commit; otherwise abort
        if (preCommitConvergence.isCommitEligible) {
            finalDecision = await this.cutoverController.commit(manifest, nowMs);
            finalConvergence = this.convergenceEvaluator.evaluate(manifest, this.clock.nowMs());
        }
        else {
            finalDecision = await this.cutoverController.abort(manifest, `Convergence not eligible: ${preCommitConvergence.status}`, nowMs);
        }
        return {
            manifestId: manifest.manifestId,
            epochDecision: finalDecision,
            convergence: finalConvergence,
            delivery: deliveryBatch,
        };
    }
}
