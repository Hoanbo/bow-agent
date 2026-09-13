// src/core/policyActiveIncidentResponse/policyActiveIncidentClassifier.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Governed Incident Classifier (Component 833).
// Deterministically classifies detected policy health and security degradation into severity tiers:
// NORMAL, DEGRADED, INCIDENT, or CRITICAL, determining safety boundary posture and human review requirements.
//
// Core Authority Invariants:
// - CLASSIFIER_GRANTS_ZERO_AUTHORITY: Produces classification diagnostics only
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS ROLLBACK
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
export class PolicyActiveIncidentClassifier {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Incident classification suspended by USER_STOP supremacy');
        }
    }
    /**
     * Classifies an active policy operational condition deterministically.
     */
    classifyIncident(evaluation) {
        this.assertUserStopInactive();
        if (!evaluation.isDegraded || evaluation.severity === 'NORMAL') {
            return {
                severity: 'NORMAL',
                lifecycleState: 'DETECTED',
                safetyBoundaryStatus: 'INACTIVE',
                requiresHumanEscalation: false,
                rationale: 'Active policy state, runtime snapshots, and enforcement telemetry are within normal operating parameters.',
            };
        }
        if (evaluation.severity === 'CRITICAL') {
            return {
                severity: 'CRITICAL',
                lifecycleState: 'SAFETY_BOUNDARY_ACTIVE',
                safetyBoundaryStatus: 'FAIL_CLOSED',
                requiresHumanEscalation: true,
                rationale: `CRITICAL policy boundary violation detected (${evaluation.primaryCategory ?? 'UNKNOWN'}): emergency fail-closed boundary triggered. Human intervention required.`,
            };
        }
        if (evaluation.severity === 'INCIDENT') {
            return {
                severity: 'INCIDENT',
                lifecycleState: 'ESCALATED',
                safetyBoundaryStatus: 'ACTIVE',
                requiresHumanEscalation: true,
                rationale: `Active policy operational incident detected (${evaluation.primaryCategory ?? 'UNKNOWN'}): safety boundary activated. Awaiting human operator governance.`,
            };
        }
        // DEGRADED
        return {
            severity: 'DEGRADED',
            lifecycleState: 'CLASSIFIED',
            safetyBoundaryStatus: 'RESTRICTED_FALLBACK',
            requiresHumanEscalation: false,
            rationale: `Operational policy degradation observed (${evaluation.primaryCategory ?? 'UNKNOWN'}): restricted fallback active. Telemetry monitored.`,
        };
    }
}
