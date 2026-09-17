import { type PolicyDistributionManifest, type FleetConvergenceReport, type EmergencyStopProvider } from './GovernedPolicyDistributionTypes.js';
import { FleetNodeRegistry } from './FleetNodeRegistry.js';
export interface FleetConvergenceEvaluatorOptions {
    registry: FleetNodeRegistry;
    attestationVerifier?: any;
    auditLedger?: any;
    emergencyStopProvider?: EmergencyStopProvider;
}
export declare class FleetConvergenceEvaluator {
    private readonly registry;
    private readonly emergencyStopProvider?;
    constructor(registryOrOptions: FleetNodeRegistry | FleetConvergenceEvaluatorOptions, emergencyStopProvider?: EmergencyStopProvider);
    /**
     * Pure read-only cohort convergence evaluation against target manifest.
     */
    evaluate(manifest: PolicyDistributionManifest, nowMs: number, isPostCommit?: boolean): FleetConvergenceReport;
}
