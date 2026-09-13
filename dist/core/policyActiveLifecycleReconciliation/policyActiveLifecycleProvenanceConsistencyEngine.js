// src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleProvenanceConsistencyEngine.ts
// BOWCON V4.0 — MS-1.3.73: GOVERNED ACTIVE POLICY LIFECYCLE RECONCILIATION & CONSISTENCY VERIFICATION
//
// Governed Provenance Consistency Engine (Component 824).
// Reconciles and verifies the end-to-end cryptographic hash continuity across:
// 1. Staged Activation Provenance (MS-1.3.70)
// 2. Active Runtime Provenance (MS-1.3.71)
// 3. Rollback / Sunset / Recovery Provenance (MS-1.3.72)
//
// Core Authority Invariants:
// - PROVENANCE_ENGINE_GRANTS_ZERO_AUTHORITY: Verification only
// - TAMPER_EVIDENT_HASH_CHAINS: Any alteration fails closed (PROVENANCE_TAMPER_DETECTED)
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import crypto from 'node:crypto';
import { createLifecycleDriftId, createLifecycleConsistencyCheckId, } from './policyActiveLifecycleReconciliationTypes.js';
export class PolicyActiveLifecycleProvenanceConsistencyEngine {
    stagedProvenance;
    runtimeProvenance;
    rollbackProvenance;
    isUserStopActiveFn;
    constructor(options, stagedProvenance, runtimeProvenance, rollbackProvenance) {
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.stagedProvenance = stagedProvenance;
        this.runtimeProvenance = runtimeProvenance;
        this.rollbackProvenance = rollbackProvenance;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Provenance verification suspended by USER_STOP supremacy');
        }
    }
    /**
     * Independently verifies the integrity of cryptographic provenance chains.
     */
    verifyProvenance(tenantPartition, candidateDraftId) {
        this.assertUserStopInactive();
        const drifts = [];
        const boundaryChecks = [];
        const blockingReasons = [];
        let overallStatus = 'VALID';
        let combinedHeadHash = '0000000000000000000000000000000000000000000000000000000000000000';
        // 1. Verify MS-1.3.70 Staged Activation Provenance Chain
        if (this.stagedProvenance) {
            let stagedValid = false;
            let recordsCount = 0;
            try {
                if (typeof this.stagedProvenance.verifyChainIntegrity === 'function') {
                    stagedValid = this.stagedProvenance.verifyChainIntegrity(tenantPartition);
                    const chain = typeof this.stagedProvenance.getChain === 'function' ? this.stagedProvenance.getChain(tenantPartition) : null;
                    recordsCount = chain?.length ?? 0;
                    if (chain && chain.length > 0) {
                        combinedHeadHash = chain[chain.length - 1].recordHash;
                    }
                }
                else if (typeof this.stagedProvenance.verifyChain === 'function') {
                    if (candidateDraftId) {
                        stagedValid = this.stagedProvenance.verifyChain(tenantPartition, candidateDraftId);
                        combinedHeadHash = this.stagedProvenance.getProvenanceHead(tenantPartition, candidateDraftId);
                        const tenantChains = this.stagedProvenance.chains?.get(tenantPartition);
                        recordsCount = tenantChains?.get(candidateDraftId)?.length ?? 0;
                    }
                    else {
                        const tenantChains = this.stagedProvenance.chains?.get(tenantPartition);
                        if (tenantChains && tenantChains.size > 0) {
                            stagedValid = true;
                            for (const [candId, recs] of tenantChains.entries()) {
                                recordsCount += recs.length;
                                if (!this.stagedProvenance.verifyChain(tenantPartition, candId)) {
                                    stagedValid = false;
                                    break;
                                }
                                combinedHeadHash = this.stagedProvenance.getProvenanceHead(tenantPartition, candId);
                            }
                        }
                        else {
                            stagedValid = true;
                        }
                    }
                }
                else {
                    stagedValid = true;
                }
            }
            catch (err) {
                stagedValid = false;
            }
            if (!stagedValid) {
                drifts.push({
                    driftId: createLifecycleDriftId(`drift_prv_${Date.now()}_staged`),
                    category: 'PROVENANCE_TAMPER_DETECTED',
                    severity: 'CRITICAL',
                    expected: 'Valid SHA-256 cryptographic chain for staged activation',
                    observed: 'Broken hash link or tampered records',
                    message: 'Cryptographic chain verification failed for staged activation provenance',
                    governanceBoundaryViolated: 'MS-1.3.70 Staged Activation Provenance Engine',
                    requiresHumanIntervention: true,
                    detectedAt: new Date().toISOString(),
                });
                blockingReasons.push('STAGED_ACTIVATION_PROVENANCE_TAMPER_DETECTED');
                overallStatus = 'TAMPER_DETECTED';
            }
            boundaryChecks.push({
                checkId: createLifecycleConsistencyCheckId(`chk_prv_${Date.now()}_staged`),
                boundaryName: 'STAGED_ACTIVATION_PROVENANCE_INTEGRITY',
                passed: stagedValid,
                details: { recordsCount },
                blockingReasons: stagedValid ? [] : ['STAGED_PROVENANCE_TAMPERED'],
                checkedAt: new Date().toISOString(),
            });
        }
        // 2. Verify MS-1.3.71 Runtime Provenance Chain
        if (this.runtimeProvenance) {
            let runtimeValid = false;
            try {
                runtimeValid = this.runtimeProvenance.verifyChainIntegrity(tenantPartition);
            }
            catch (err) {
                runtimeValid = false;
            }
            if (!runtimeValid) {
                drifts.push({
                    driftId: createLifecycleDriftId(`drift_prv_${Date.now()}_runtime`),
                    category: 'PROVENANCE_TAMPER_DETECTED',
                    severity: 'CRITICAL',
                    expected: 'Valid SHA-256 cryptographic chain for runtime synchronization',
                    observed: 'Broken hash link or tampered records',
                    message: 'Cryptographic chain verification failed for active runtime provenance',
                    governanceBoundaryViolated: 'MS-1.3.71 Runtime Provenance Engine',
                    requiresHumanIntervention: true,
                    detectedAt: new Date().toISOString(),
                });
                blockingReasons.push('RUNTIME_PROVENANCE_TAMPER_DETECTED');
                overallStatus = 'TAMPER_DETECTED';
            }
            const chain = this.runtimeProvenance.getChain(tenantPartition);
            if (chain && chain.length > 0) {
                combinedHeadHash = crypto
                    .createHash('sha256')
                    .update(combinedHeadHash + chain[chain.length - 1].recordHash)
                    .digest('hex');
            }
            boundaryChecks.push({
                checkId: createLifecycleConsistencyCheckId(`chk_prv_${Date.now()}_runtime`),
                boundaryName: 'ACTIVE_RUNTIME_PROVENANCE_INTEGRITY',
                passed: runtimeValid,
                details: { recordsCount: chain?.length ?? 0 },
                blockingReasons: runtimeValid ? [] : ['RUNTIME_PROVENANCE_TAMPERED'],
                checkedAt: new Date().toISOString(),
            });
        }
        // 3. Verify MS-1.3.72 Rollback Provenance Chain
        if (this.rollbackProvenance) {
            let rollbackValid = false;
            try {
                rollbackValid = this.rollbackProvenance.verifyChainIntegrity(tenantPartition);
            }
            catch (err) {
                rollbackValid = false;
            }
            if (!rollbackValid) {
                drifts.push({
                    driftId: createLifecycleDriftId(`drift_prv_${Date.now()}_rollback`),
                    category: 'PROVENANCE_TAMPER_DETECTED',
                    severity: 'CRITICAL',
                    expected: 'Valid SHA-256 cryptographic chain for rollback/sunset/recovery operations',
                    observed: 'Broken hash link or tampered records',
                    message: 'Cryptographic chain verification failed for rollback provenance',
                    governanceBoundaryViolated: 'MS-1.3.72 Rollback Provenance Engine',
                    requiresHumanIntervention: true,
                    detectedAt: new Date().toISOString(),
                });
                blockingReasons.push('ROLLBACK_PROVENANCE_TAMPER_DETECTED');
                overallStatus = 'TAMPER_DETECTED';
            }
            const chain = this.rollbackProvenance.getChain(tenantPartition);
            if (chain && chain.length > 0) {
                combinedHeadHash = crypto
                    .createHash('sha256')
                    .update(combinedHeadHash + chain[chain.length - 1].recordHash)
                    .digest('hex');
            }
            boundaryChecks.push({
                checkId: createLifecycleConsistencyCheckId(`chk_prv_${Date.now()}_rollback`),
                boundaryName: 'ACTIVE_ROLLBACK_PROVENANCE_INTEGRITY',
                passed: rollbackValid,
                details: { recordsCount: chain?.length ?? 0 },
                blockingReasons: rollbackValid ? [] : ['ROLLBACK_PROVENANCE_TAMPERED'],
                checkedAt: new Date().toISOString(),
            });
        }
        const isValid = drifts.length === 0 && overallStatus === 'VALID';
        return {
            valid: isValid,
            status: overallStatus,
            provenanceHeadHash: combinedHeadHash,
            detectedDrifts: Object.freeze(drifts),
            boundaryChecks: Object.freeze(boundaryChecks),
            blockingReasons: Object.freeze(blockingReasons),
        };
    }
}
