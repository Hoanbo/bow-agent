// src/core/governedPolicyDistribution/FleetConvergenceEvaluator.ts
// Component 1223: FleetConvergenceEvaluator
//
// Pure in-memory cohort convergence calculation and canary readiness reporting.
import { CANARY_THRESHOLDS, HEARTBEAT_STALE_THRESHOLD_MS, assertValidIdentifier, assertValidDomain, assertEmergencyStopInactive, } from './GovernedPolicyDistributionTypes.js';
export class FleetConvergenceEvaluator {
    registry;
    emergencyStopProvider;
    constructor(registryOrOptions, emergencyStopProvider) {
        if ('registry' in registryOrOptions) {
            this.registry = registryOrOptions.registry;
            this.emergencyStopProvider = registryOrOptions.emergencyStopProvider;
        }
        else {
            this.registry = registryOrOptions;
            this.emergencyStopProvider = emergencyStopProvider;
        }
    }
    /**
     * Pure read-only cohort convergence evaluation against target manifest.
     */
    evaluate(manifest, nowMs, isPostCommit = false) {
        assertEmergencyStopInactive(this.emergencyStopProvider);
        assertValidIdentifier(manifest.tenantId, 'tenantId');
        assertValidIdentifier(manifest.federationId, 'federationId');
        assertValidDomain(manifest.policyDomain);
        const cohort = this.registry.getFleetCohort(manifest.tenantId, manifest.federationId, manifest.policyDomain, manifest.targetCanaryRing, nowMs);
        const totalNodes = cohort.length;
        let synchronizedNodes = 0;
        let pendingNodes = 0;
        let failedNodes = 0;
        let quarantinedNodes = 0;
        for (const node of cohort) {
            if (node.quarantined || node.syncStatus === 'QUARANTINED') {
                quarantinedNodes++;
                continue;
            }
            // Check staleness
            const isStale = nowMs - node.lastHeartbeatAt > HEARTBEAT_STALE_THRESHOLD_MS;
            if (!isPostCommit) {
                // Pre-commit evaluation: checks PREPARED state
                const isMatching = node.currentPolicyHash === manifest.canonicalPolicyHash &&
                    node.currentPolicyVersion === manifest.policyVersion &&
                    node.currentEpoch === manifest.targetEpoch;
                if (node.syncStatus === 'PREPARED' && isMatching && !isStale) {
                    synchronizedNodes++;
                }
                else if (node.syncStatus === 'SYNC_PENDING') {
                    pendingNodes++;
                }
                else if (node.syncStatus === 'SYNC_FAILED' || isStale) {
                    failedNodes++;
                }
                else {
                    pendingNodes++;
                }
            }
            else {
                // Post-commit evaluation: checks IN_SYNC state
                const isMatching = node.currentPolicyHash === manifest.canonicalPolicyHash &&
                    node.currentPolicyVersion === manifest.policyVersion &&
                    node.currentEpoch === manifest.targetEpoch;
                if (node.syncStatus === 'IN_SYNC' && isMatching && !isStale) {
                    synchronizedNodes++;
                }
                else if (node.syncStatus === 'SYNC_FAILED' || isStale) {
                    failedNodes++;
                }
                else {
                    pendingNodes++;
                }
            }
        }
        const convergenceRatio = totalNodes === 0 ? 0 : synchronizedNodes / totalNodes;
        const threshold = CANARY_THRESHOLDS[manifest.targetCanaryRing];
        let status;
        if (totalNodes === 0) {
            status = 'NO_NODES_REGISTERED';
        }
        else if (quarantinedNodes > 0) {
            status = 'BLOCKED';
        }
        else if (synchronizedNodes === totalNodes && convergenceRatio >= threshold) {
            status = 'CONVERGED';
        }
        else if (nowMs - manifest.issuedAt > 5000 && convergenceRatio < threshold) {
            status = 'DIVERGED';
        }
        else if (synchronizedNodes > 0 || pendingNodes > 0) {
            status = 'CONVERGING';
        }
        else {
            status = 'NOT_READY';
        }
        // Commit eligibility: strictly pre-commit, fully CONVERGED, no quarantined nodes, all target nodes prepared
        const isCommitEligible = !isPostCommit &&
            status === 'CONVERGED' &&
            quarantinedNodes === 0 &&
            synchronizedNodes === totalNodes &&
            totalNodes > 0;
        return Object.freeze({
            tenantId: manifest.tenantId,
            federationId: manifest.federationId,
            policyDomain: manifest.policyDomain,
            manifestId: manifest.manifestId,
            epoch: manifest.targetEpoch,
            targetCanaryRing: manifest.targetCanaryRing,
            totalNodes,
            synchronizedNodes,
            pendingNodes,
            failedNodes,
            quarantinedNodes,
            convergenceRatio,
            status,
            isCommitEligible,
            evaluatedAt: nowMs,
        });
    }
}
