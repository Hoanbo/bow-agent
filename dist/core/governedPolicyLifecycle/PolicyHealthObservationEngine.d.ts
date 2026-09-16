import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { type PolicyHealthMetrics, type PolicyHealthReport } from './GovernedPolicyLifecycleTypes.js';
import type { PolicyLifecycleAuditLedger } from './PolicyLifecycleAuditLedger.js';
export interface DecisionTraceSample {
    traceId: string;
    matchedRule: boolean;
    divergedFromBaseline: boolean;
    latencyMs: number;
}
export declare class PolicyHealthObservationEngine {
    private readonly auditLedger?;
    constructor(auditLedger?: PolicyLifecycleAuditLedger | undefined);
    /**
     * Deterministically calculate composite health score H in [0.0, 1.0] from raw metrics.
     */
    calculateHealthScore(metrics: PolicyHealthMetrics): number;
    /**
     * Evaluate health report from raw metrics.
     */
    evaluateHealth(params: {
        tenantId: string;
        policyDomain: PolicyDomain;
        policyVersion: number;
        metrics: PolicyHealthMetrics;
    }): PolicyHealthReport;
    /**
     * Aggregate metrics from live decision trace samples.
     */
    aggregateSampleMetrics(samples: readonly DecisionTraceSample[], interDomainConflicts?: number): PolicyHealthMetrics;
    private clamp;
}
