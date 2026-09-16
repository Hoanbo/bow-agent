import { EmergencyStopProvider, PolicyDomainDependency, CrossDomainInvariantResult } from './GovernedPolicySimulationTypes.js';
export declare class CrossDomainPolicyInvariantChecker {
    private readonly emergencyStopProvider?;
    constructor(emergencyStopProvider?: EmergencyStopProvider);
    private assertEmergencyStopInactive;
    /**
     * Verifies policy domain dependencies for circular constraints and deadlocks.
     * Analytical only: Upon conflict, emits DEADLOCK_DETECTED; never auto-resolves.
     */
    verifyDomainInvariants(dependencies: readonly PolicyDomainDependency[]): CrossDomainInvariantResult;
}
