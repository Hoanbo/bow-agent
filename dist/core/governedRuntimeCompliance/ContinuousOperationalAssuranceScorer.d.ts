import { OperationalAssuranceScore, ComplianceEvaluationRecord, PolicyViolationRecord } from './GovernedRuntimeComplianceTypes.js';
import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
export declare class ContinuousOperationalAssuranceScorer {
    computeAssuranceScore(tenantId: string, policyDomain: PolicyDomain, evaluations: readonly ComplianceEvaluationRecord[], violations: readonly PolicyViolationRecord[], currentTimestampMs?: number): OperationalAssuranceScore;
}
