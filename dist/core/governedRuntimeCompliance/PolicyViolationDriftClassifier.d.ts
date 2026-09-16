import { ComplianceEvaluationRecord, RuntimeBehavioralProfile, PolicyViolationRecord, CumulativeDriftState } from './GovernedRuntimeComplianceTypes.js';
import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
export declare class PolicyViolationDriftClassifier {
    private readonly violationHistory;
    private readonly actionViolationCounts;
    classifyViolation(profile: RuntimeBehavioralProfile, evaluation: ComplianceEvaluationRecord): PolicyViolationRecord | null;
    computeCumulativeDrift(tenantId: string, policyDomain: PolicyDomain, evaluations: readonly ComplianceEvaluationRecord[]): CumulativeDriftState;
    getRecordedViolations(): readonly PolicyViolationRecord[];
    clearHistory(): void;
}
