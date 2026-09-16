import type { PolicyDomain, PolicyDelta } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { EmergencyStopProvider, ShadowEvaluationRecord } from './GovernedPolicySimulationTypes.js';
export interface LiveSanitizedObservationInput {
    readonly observationId: string;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly actionType: string;
    readonly parameters: Readonly<Record<string, unknown>>;
    readonly activePolicyDecision: 'ALLOW' | 'DENY';
    readonly timestamp: number;
}
export declare class ShadowDualEvaluationBridge {
    private readonly emergencyStopProvider?;
    private readonly shadowEvaluationHistory;
    constructor(emergencyStopProvider?: EmergencyStopProvider);
    private assertEmergencyStopInactive;
    private sanitizeTenantId;
    /**
     * Evaluates live observation against shadow candidate policy.
     * SHADOW_VERDICT != PDP_DECISION: Returns shadow comparison data ONLY.
     * Never interferes with, blocks, alters, or replaces live execution or live PDP decisions.
     */
    evaluateShadowTap(liveObservation: LiveSanitizedObservationInput, candidateDeltas: readonly PolicyDelta[]): ShadowEvaluationRecord;
    getTenantShadowHistory(tenantId: string): readonly ShadowEvaluationRecord[];
}
