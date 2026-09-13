// src/core/policyActiveIncidentResponse/policyActivePolicyDegradationDetector.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Governed Policy Degradation Detector (Component 832).
// Detects deterministic degradation conditions based on normalized signals across active policy runtime,
// enforcement telemetry, reconciliation results, and safety floor invariants.
//
// Core Authority Invariants:
// - DEGRADATION_DETECTION != POLICY_MUTATION
// - DETECTOR_GRANTS_ZERO_AUTHORITY: Produces health evaluation only
// - ZERO AUTONOMOUS REMEDIATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
export class PolicyActivePolicyDegradationDetector {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Policy degradation detection suspended by USER_STOP supremacy');
        }
    }
    /**
     * Deterministically evaluates whether signals constitute policy degradation or incident conditions.
     */
    detectDegradation(resolved) {
        this.assertUserStopInactive();
        const signals = resolved.signals;
        let criticalCount = 0;
        let incidentCount = 0;
        let degradedCount = 0;
        for (const sig of signals) {
            if (sig.severity === 'CRITICAL') {
                criticalCount++;
            }
            else if (sig.severity === 'INCIDENT') {
                incidentCount++;
            }
            else if (sig.severity === 'DEGRADED') {
                degradedCount++;
            }
        }
        let overallSeverity = 'NORMAL';
        let primaryCategory = null;
        if (criticalCount > 0) {
            overallSeverity = 'CRITICAL';
            const crit = signals.find((s) => s.severity === 'CRITICAL');
            primaryCategory = crit?.category ?? 'CORRUPTED_ACTIVE_STATE';
        }
        else if (incidentCount > 0) {
            overallSeverity = 'INCIDENT';
            const inc = signals.find((s) => s.severity === 'INCIDENT');
            primaryCategory = inc?.category ?? 'POLICY_VERSION_DRIFT';
        }
        else if (degradedCount > 0) {
            overallSeverity = 'DEGRADED';
            const deg = signals.find((s) => s.severity === 'DEGRADED');
            primaryCategory = deg?.category ?? 'ELEVATED_POLICY_DENIALS';
        }
        const isDegraded = overallSeverity !== 'NORMAL';
        return {
            isDegraded,
            severity: overallSeverity,
            primaryCategory,
            triggerSignals: Object.freeze([...signals]),
            evaluationDetails: {
                totalSignals: signals.length,
                criticalCount,
                incidentCount,
                degradedCount,
            },
        };
    }
}
