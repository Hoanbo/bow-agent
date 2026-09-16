import { SafetyControlDecision, OperationalAssuranceScore, PolicyViolationRecord } from './GovernedRuntimeComplianceTypes.js';
import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { PolicyLifecycleState } from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';
export interface LifecycleStateCoordinatorBridge {
    transitionState(tenantId: string, domain: PolicyDomain, targetState: PolicyLifecycleState, triggerType: string, metadata?: Record<string, unknown>): Promise<{
        state: PolicyLifecycleState;
        version: number;
    }>;
}
export interface IncidentManagerBridge {
    openIncident(tenantId: string, domain: PolicyDomain, type: string, severity: string, description: string, evidence?: Record<string, unknown>): Promise<{
        incidentId: string;
    }>;
}
export interface SafetyEmergencyStopProvider {
    isEmergencyStopActive(): boolean;
}
export declare class GovernedAdaptiveSafetyController {
    private readonly lifecycleBridge?;
    private readonly incidentBridge?;
    private readonly stopProvider?;
    constructor(lifecycleBridge?: LifecycleStateCoordinatorBridge, incidentBridge?: IncidentManagerBridge, stopProvider?: SafetyEmergencyStopProvider);
    private assertEmergencyStopInactive;
    evaluateSafetyIntervention(assurance: OperationalAssuranceScore, violations: readonly PolicyViolationRecord[]): Promise<SafetyControlDecision>;
    assertNoAutomatedReactivation(targetState: PolicyLifecycleState, triggerType: string): void;
}
