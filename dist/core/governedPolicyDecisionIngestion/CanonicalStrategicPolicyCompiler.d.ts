import type { PolicyDelta } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { type CanonicalStrategicPolicy, type AuthoritativeRatificationRecord } from './GovernedPolicyDecisionIngestionTypes.js';
export declare class CanonicalStrategicPolicyCompiler {
    /**
     * Compile a ratified record and delta set into a CanonicalStrategicPolicy.
     * Biên dịch tập deltas đã được phê chuẩn thành CanonicalStrategicPolicy chuẩn.
     */
    compilePolicy(ratification: AuthoritativeRatificationRecord, deltas: PolicyDelta[], basePolicy?: CanonicalStrategicPolicy): CanonicalStrategicPolicy;
}
