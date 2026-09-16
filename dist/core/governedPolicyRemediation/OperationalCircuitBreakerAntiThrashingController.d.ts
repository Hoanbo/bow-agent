import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { CircuitBreakerStatus, CircuitBreakerParameters, EmergencyStopProvider } from './GovernedPolicyRemediationTypes.js';
export declare class OperationalCircuitBreakerAntiThrashingController {
    private readonly emergencyStopProvider?;
    private readonly params;
    private readonly registry;
    constructor(emergencyStopProvider?: EmergencyStopProvider, customParams?: Partial<CircuitBreakerParameters>);
    private assertEmergencyStopInactive;
    private getBreakerKey;
    private getOrCreateEntry;
    getBreakerStatus(tenantId: string, policyDomain: PolicyDomain, actionType: string, currentTime?: Date): CircuitBreakerStatus;
    recordFailure(tenantId: string, policyDomain: PolicyDomain, actionType: string, currentTime?: Date): CircuitBreakerStatus;
    attemptProbe(tenantId: string, policyDomain: PolicyDomain, actionType: string, currentTime?: Date): void;
    recordSuccess(tenantId: string, policyDomain: PolicyDomain, actionType: string, currentTime?: Date): CircuitBreakerStatus;
    resetLockoutByHumanAuthority(tenantId: string, policyDomain: PolicyDomain, actionType: string, callerIdentity: string): CircuitBreakerStatus;
}
