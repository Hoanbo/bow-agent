// src/core/policyActiveIncidentResponse/policyActiveIncidentSignalResolver.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Governed Incident Signal Resolver (Component 831).
// Collects and normalizes read-only health and security signals across upstream policy domains:
// MS-1.3.70 (Active Policy Store), MS-1.3.71 (Runtime Coordinator / PDP / PEP),
// MS-1.3.72 (Rollback Store), and MS-1.3.73 (Lifecycle Reconciliation).
//
// Core Authority Invariants:
// - SIGNAL_RESOLVER_GRANTS_ZERO_AUTHORITY: Strictly read-only signal collection
// - ZERO POLICY MUTATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import { ROLLBACK_HARD_FORBIDDEN_ACTIONS } from '../policyActiveRollback/policyActiveRollbackTypes.js';
import { createDegradationEventId } from './policyActiveIncidentResponseTypes.js';
export class PolicyActiveIncidentSignalResolver {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Incident signal resolution suspended by USER_STOP supremacy');
        }
    }
    /**
     * Evaluates and normalizes signals from upstream active policy components.
     */
    resolveSignals(tenantPartition, params) {
        this.assertUserStopInactive();
        const signals = [];
        const active = params.activePolicyState ?? null;
        const snapshot = params.runtimeSnapshot ?? null;
        const recon = params.reconciliationResult ?? null;
        // 1. Check Active Policy vs Runtime Snapshot Existence & Version Alignment
        if (active && !snapshot) {
            signals.push({
                signalId: createDegradationEventId(`sig_${Date.now()}_1`),
                category: 'STALE_ACTIVE_RUNTIME',
                severity: 'DEGRADED',
                source: 'MS-1.3.71 Runtime Synchronization',
                message: `Active policy '${active.activePolicyStateId}' exists in storage but runtime snapshot is missing`,
                details: { activePolicyStateId: active.activePolicyStateId },
                observedAt: new Date().toISOString(),
            });
        }
        else if (!active && snapshot) {
            signals.push({
                signalId: createDegradationEventId(`sig_${Date.now()}_2`),
                category: 'CORRUPTED_ACTIVE_STATE',
                severity: 'CRITICAL',
                source: 'MS-1.3.70 Active State Store',
                message: `Runtime snapshot '${snapshot.snapshotId}' is active but durable active policy is absent`,
                details: { snapshotId: snapshot.snapshotId },
                observedAt: new Date().toISOString(),
            });
        }
        else if (active && snapshot) {
            if (active.activePolicyVersion !== snapshot.policyVersion) {
                signals.push({
                    signalId: createDegradationEventId(`sig_${Date.now()}_3`),
                    category: 'POLICY_VERSION_DRIFT',
                    severity: 'INCIDENT',
                    source: 'MS-1.3.71 Runtime Freshness Validator',
                    message: `Active version '${active.activePolicyVersion}' differs from runtime snapshot version '${snapshot.policyVersion}'`,
                    details: { activeVersion: active.activePolicyVersion, runtimeVersion: snapshot.policyVersion },
                    observedAt: new Date().toISOString(),
                });
            }
            if (active.provenanceHeadHash !== snapshot.provenanceHeadHash) {
                signals.push({
                    signalId: createDegradationEventId(`sig_${Date.now()}_4`),
                    category: 'PROVENANCE_INCONSISTENCY',
                    severity: 'CRITICAL',
                    source: 'MS-1.3.71 Provenance Bridge',
                    message: 'Provenance head hash on snapshot diverged from durable active policy',
                    details: { activeHead: active.provenanceHeadHash, snapshotHead: snapshot.provenanceHeadHash },
                    observedAt: new Date().toISOString(),
                });
            }
        }
        // 2. Check Hard-Forbidden Floor Invariants
        if (active) {
            const toolClassifications = active.activeModifications?.toolClassifications ?? {};
            for (const forbidden of ROLLBACK_HARD_FORBIDDEN_ACTIONS) {
                if (toolClassifications[forbidden] && toolClassifications[forbidden] !== 'FORBIDDEN') {
                    signals.push({
                        signalId: createDegradationEventId(`sig_${Date.now()}_5`),
                        category: 'HARD_FORBIDDEN_FLOOR_BREACH',
                        severity: 'CRITICAL',
                        source: 'Canonical Hard-Forbidden Baseline',
                        message: `Hard-forbidden action '${forbidden}' downgraded to '${toolClassifications[forbidden]}'`,
                        details: { action: forbidden, classification: toolClassifications[forbidden] },
                        observedAt: new Date().toISOString(),
                    });
                }
            }
        }
        // 3. Check PDP / PEP Disagreement if checked
        if (params.testedAction && params.pdpDecisionAllowed !== undefined && params.pepDisposition !== undefined) {
            const pdpAllows = params.pdpDecisionAllowed;
            const pepBlocks = params.pepDisposition === 'FORBIDDEN' || params.pepDisposition === 'DENY';
            // If PDP allows but PEP blocks without approval requirement, or PDP denies but PEP permits:
            if (pdpAllows && pepBlocks && params.pepDisposition === 'FORBIDDEN') {
                signals.push({
                    signalId: createDegradationEventId(`sig_${Date.now()}_6`),
                    category: 'PDP_PEP_DISAGREEMENT',
                    severity: 'INCIDENT',
                    source: 'MS-1.3.71 PDP/PEP Enforcement Bridge',
                    message: `PDP permitted action '${params.testedAction}' but PEP returned FORBIDDEN`,
                    details: { action: params.testedAction, pdpAllowed: pdpAllows, pepDisposition: params.pepDisposition },
                    observedAt: new Date().toISOString(),
                });
            }
        }
        // 4. Check Lifecycle Reconciliation Signals from MS-1.3.73
        if (recon && !recon.isConsistent) {
            const category = recon.provenanceStatus === 'TAMPER_DETECTED'
                ? 'PROVENANCE_INCONSISTENCY'
                : recon.status === 'TENANT_MISMATCH'
                    ? 'TENANT_ISOLATION_ANOMALY'
                    : 'REPEATED_RECONCILIATION_FAILURE';
            const severity = recon.provenanceStatus === 'TAMPER_DETECTED' ? 'CRITICAL' : 'INCIDENT';
            signals.push({
                signalId: createDegradationEventId(`sig_${Date.now()}_7`),
                category,
                severity,
                source: 'MS-1.3.73 Lifecycle Reconciliation',
                message: `Lifecycle reconciliation reported inconsistency: ${recon.status} (${(recon.blockingReasons ?? []).join(', ')})`,
                details: { status: recon.status, driftsCount: recon.detectedDrifts?.length ?? 0, blockingReasons: recon.blockingReasons ?? [] },
                observedAt: new Date().toISOString(),
            });
        }
        // 5. Check Denial Anomaly Count
        if (params.recentDenialCount !== undefined && params.recentDenialCount >= 5) {
            signals.push({
                signalId: createDegradationEventId(`sig_${Date.now()}_8`),
                category: 'ELEVATED_POLICY_DENIALS',
                severity: 'DEGRADED',
                source: 'Runtime PEP Telemetry',
                message: `Elevated policy denial rate detected (${params.recentDenialCount} denials in window)`,
                details: { denialCount: params.recentDenialCount },
                observedAt: new Date().toISOString(),
            });
        }
        return {
            tenantPartition,
            activePolicyStateId: active?.activePolicyStateId ?? null,
            runtimeSnapshotId: snapshot?.snapshotId ?? null,
            activePolicyVersion: active?.activePolicyVersion ?? null,
            runtimePolicyVersion: snapshot?.policyVersion ?? null,
            signals: Object.freeze(signals),
        };
    }
}
