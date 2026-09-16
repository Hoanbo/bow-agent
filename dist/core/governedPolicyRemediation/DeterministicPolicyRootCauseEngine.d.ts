import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { PolicyViolationRecord } from '../governedRuntimeCompliance/GovernedRuntimeComplianceTypes.js';
import { RootCauseDiagnosisRecord, CorrelatedIncidentEnvelope, EmergencyStopProvider } from './GovernedPolicyRemediationTypes.js';
export interface LineageGraphNode {
    readonly nodeId: string;
    readonly version: number;
    readonly parentNodeIds: readonly string[];
    readonly policyHash: string;
    readonly appliedRules: readonly {
        readonly ruleId: string;
        readonly parameterConstraints?: Readonly<Record<string, unknown>>;
    }[];
}
export interface DiagnosisContext {
    readonly envelope: CorrelatedIncidentEnvelope;
    readonly activePolicyHash: string;
    readonly lineageNodes?: readonly LineageGraphNode[];
    readonly violations?: readonly PolicyViolationRecord[];
    readonly environmentTelemetry?: Readonly<Record<string, unknown>>;
}
export declare class DeterministicPolicyRootCauseEngine {
    private readonly emergencyStopProvider?;
    constructor(emergencyStopProvider?: EmergencyStopProvider);
    private assertEmergencyStopInactive;
    /**
     * Detects graph cycles using Depth-First Search with recursion stack tracking.
     */
    private detectGraphCycle;
    diagnoseRootCause(tenantId: string, policyDomain: PolicyDomain, context: DiagnosisContext): RootCauseDiagnosisRecord;
}
