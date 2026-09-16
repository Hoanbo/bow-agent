import { ActivePolicyBinding } from './GovernedRuntimeComplianceTypes.js';
import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { PolicyLifecycleState } from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';
export interface PolicySnapshotProvider {
    getActivePolicy(tenantId: string, domain: PolicyDomain): Promise<{
        version: number;
        canonicalPolicyHash: string;
        state: PolicyLifecycleState;
    } | null>;
}
export interface ResolverEmergencyStopProvider {
    isEmergencyStopActive(): boolean;
}
export declare class ActivePolicySnapshotBindingResolver {
    private readonly storeProvider;
    private readonly stopProvider?;
    constructor(storeProvider: PolicySnapshotProvider, stopProvider?: ResolverEmergencyStopProvider);
    private assertEmergencyStopInactive;
    resolveActiveBinding(tenantId: string, policyDomain: PolicyDomain, expectedVersion?: number, expectedPolicyHash?: string): Promise<ActivePolicyBinding>;
}
