// src/core/governedPolicyLifecycle/PolicyHealthObservationEngine.ts
// Component 1180: PolicyHealthObservationEngine (REAL)
//
// Passive, deterministic health scoring and drift observation engine.
// Implements authoritative health formula H in [0.0, 1.0], evaluates decision compliance,
// latency penalties, drift divergence, and cross-domain conflicts. Zero side-effects.
import { HEALTH_THRESHOLD_DEGRADED, HEALTH_THRESHOLD_CRITICAL, MAX_DECISION_LATENCY_OVERHEAD_MS, computeHealthReportHash, deepFreeze, } from './GovernedPolicyLifecycleTypes.js';
export class PolicyHealthObservationEngine {
    auditLedger;
    constructor(auditLedger) {
        this.auditLedger = auditLedger;
    }
    /**
     * Deterministically calculate composite health score H in [0.0, 1.0] from raw metrics.
     */
    calculateHealthScore(metrics) {
        // 1. Inter-Domain Conflict Short-Circuit: any conflict zeroes the score immediately
        if (metrics.interDomainConflictCount > 0) {
            return 0.0;
        }
        // 2. Defensive sanitization against NaN, Infinity, and out-of-bound inputs
        const cr = this.clamp(metrics.decisionComplianceRatio, 0.0, 1.0);
        const ddr = this.clamp(metrics.driftDivergenceRate, 0.0, 1.0);
        const latency = isFinite(metrics.latencyOverheadMs) ? Math.max(0.0, metrics.latencyOverheadMs) : MAX_DECISION_LATENCY_OVERHEAD_MS;
        // 3. Latency Factor LF = max(0, 1 - overheadMs / 50)
        const lf = Math.max(0.0, 1.0 - latency / MAX_DECISION_LATENCY_OVERHEAD_MS);
        // 4. Authoritative Composite Formula: H = 0.5 * CR + 0.3 * (1 - DDR) + 0.2 * LF
        const rawScore = 0.5 * cr + 0.3 * (1.0 - ddr) + 0.2 * lf;
        const finalScore = this.clamp(rawScore, 0.0, 1.0);
        // Round to 4 decimal places for strict cross-platform determinism
        return Math.round(finalScore * 10000) / 10000;
    }
    /**
     * Evaluate health report from raw metrics.
     */
    evaluateHealth(params) {
        const compositeScore = this.calculateHealthScore(params.metrics);
        let status = 'HEALTHY';
        if (compositeScore < HEALTH_THRESHOLD_CRITICAL) {
            status = 'CRITICAL';
        }
        else if (compositeScore < HEALTH_THRESHOLD_DEGRADED) {
            status = 'DEGRADED';
        }
        const reportId = `rep_${params.tenantId}_${params.policyDomain}_v${params.policyVersion}_${Date.now()}`;
        const rawReport = {
            reportId,
            tenantId: params.tenantId,
            policyDomain: params.policyDomain,
            policyVersion: params.policyVersion,
            metrics: {
                decisionComplianceRatio: this.clamp(params.metrics.decisionComplianceRatio, 0.0, 1.0),
                driftDivergenceRate: this.clamp(params.metrics.driftDivergenceRate, 0.0, 1.0),
                latencyOverheadMs: Math.max(0, params.metrics.latencyOverheadMs || 0),
                interDomainConflictCount: Math.max(0, params.metrics.interDomainConflictCount || 0),
            },
            compositeScore,
            status,
            evaluatedAt: Date.now(),
        };
        const reportHash = computeHealthReportHash(rawReport);
        const frozenReport = deepFreeze({
            ...rawReport,
            reportHash,
        });
        if (this.auditLedger) {
            this.auditLedger.recordEvent({
                eventType: 'POLICY_HEALTH_EVALUATED',
                tenantId: params.tenantId,
                policyDomain: params.policyDomain,
                policyVersion: params.policyVersion,
                details: {
                    compositeScore,
                    status,
                    reportHash,
                },
            });
            if (status === 'DEGRADED') {
                this.auditLedger.recordEvent({
                    eventType: 'POLICY_HEALTH_DEGRADED',
                    tenantId: params.tenantId,
                    policyDomain: params.policyDomain,
                    policyVersion: params.policyVersion,
                    details: { compositeScore, reason: 'Health dropped below 0.95 threshold' },
                });
            }
        }
        return frozenReport;
    }
    /**
     * Aggregate metrics from live decision trace samples.
     */
    aggregateSampleMetrics(samples, interDomainConflicts = 0) {
        if (!samples || samples.length === 0) {
            // Conservative fail-closed: zero samples yield 0.0 compliance
            return {
                decisionComplianceRatio: 0.0,
                driftDivergenceRate: 1.0,
                latencyOverheadMs: MAX_DECISION_LATENCY_OVERHEAD_MS,
                interDomainConflictCount: interDomainConflicts,
            };
        }
        let matches = 0;
        let divergences = 0;
        let totalLatency = 0;
        for (const sample of samples) {
            if (sample.matchedRule)
                matches++;
            if (sample.divergedFromBaseline)
                divergences++;
            totalLatency += sample.latencyMs || 0;
        }
        const n = samples.length;
        const cr = matches / n;
        const ddr = divergences / n;
        const avgLatency = totalLatency / n;
        return {
            decisionComplianceRatio: Math.round(cr * 10000) / 10000,
            driftDivergenceRate: Math.round(ddr * 10000) / 10000,
            latencyOverheadMs: Math.round(avgLatency * 100) / 100,
            interDomainConflictCount: interDomainConflicts,
        };
    }
    clamp(val, min, max) {
        if (typeof val !== 'number' || isNaN(val))
            return min;
        if (val < min)
            return min;
        if (val > max)
            return max;
        return val;
    }
}
