import { RuntimeBehavioralProfile, ActivePolicyBinding, ComplianceEvaluationRecord } from './GovernedRuntimeComplianceTypes.js';
import type { CanonicalStrategicPolicy } from '../governedPolicyDecisionIngestion/GovernedPolicyDecisionIngestionTypes.js';
export interface EvaluationContext {
    readonly currentSystemTime?: string;
}
export declare class DeterministicPolicyComplianceEvaluator {
    evaluateCompliance(profile: RuntimeBehavioralProfile, policy: CanonicalStrategicPolicy, binding: ActivePolicyBinding, _context?: EvaluationContext): ComplianceEvaluationRecord;
}
