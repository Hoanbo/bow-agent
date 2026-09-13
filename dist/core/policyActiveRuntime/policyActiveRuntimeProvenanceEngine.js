// src/core/policyActiveRuntime/policyActiveRuntimeProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.71: GOVERNED ACTIVE POLICY RUNTIME SYNCHRONIZATION & ENFORCEMENT BRIDGE
//
// Governed Active Runtime Cryptographic Provenance Engine (Component 803).
// Builds and verifies append-only SHA-256 hash chains for runtime synchronization,
// snapshot resolution, and enforcement events.
//
// Invariants:
// - APPEND_ONLY_HASH_CHAINING
// - ZERO_HISTORICAL_REWRITING
// - TAMPER_PRODUCES_PROVENANCE_TAMPER_DETECTED
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import { createActiveRuntimeProvenanceId } from './policyActiveRuntimeTypes.js';
export const GENESIS_RUNTIME_PROVENANCE_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
export class PolicyActiveRuntimeProvenanceEngine {
    isUserStopActiveFn;
    // tenantPartition -> append-only records
    tenantChains = new Map();
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active runtime provenance suspended by USER_STOP supremacy');
        }
    }
    /**
     * Appends an active runtime event to the cryptographic provenance chain.
     */
    appendRecord(params) {
        this.assertUserStopInactive();
        const cleanTenant = params.tenantPartition.trim();
        const chain = this.tenantChains.get(cleanTenant) ?? [];
        const previousHash = chain.length > 0
            ? chain[chain.length - 1].recordHash
            : GENESIS_RUNTIME_PROVENANCE_HASH;
        const provenanceId = createActiveRuntimeProvenanceId(`arprov_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
        const timestamp = new Date().toISOString();
        const payloadHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(params.payload))
            .digest('hex');
        const recordHash = crypto
            .createHash('sha256')
            .update(`${provenanceId}:${cleanTenant}:${params.activePolicyStateId}:${params.snapshotId ?? ''}:${params.enforcementId ?? ''}:${params.eventType}:${timestamp}:${previousHash}:${payloadHash}`)
            .digest('hex');
        const record = Object.freeze({
            provenanceId,
            tenantPartition: cleanTenant,
            activePolicyStateId: params.activePolicyStateId,
            snapshotId: params.snapshotId,
            enforcementId: params.enforcementId,
            eventType: params.eventType,
            timestamp,
            previousHash,
            recordHash,
            payloadHash,
        });
        chain.push(record);
        this.tenantChains.set(cleanTenant, chain);
        return record;
    }
    /**
     * Verifies the cryptographic integrity of the tenant's provenance chain.
     */
    verifyChainIntegrity(tenantPartition) {
        this.assertUserStopInactive();
        const chain = this.tenantChains.get(tenantPartition.trim());
        if (!chain || chain.length === 0) {
            return true;
        }
        let expectedPrevHash = GENESIS_RUNTIME_PROVENANCE_HASH;
        for (let i = 0; i < chain.length; i++) {
            const rec = chain[i];
            if (rec.previousHash !== expectedPrevHash) {
                throw new Error(`PROVENANCE_TAMPER_DETECTED: Broken previousHash linkage at index ${i} for tenant '${tenantPartition}'`);
            }
            const recomputedHash = crypto
                .createHash('sha256')
                .update(`${rec.provenanceId}:${rec.tenantPartition}:${rec.activePolicyStateId}:${rec.snapshotId ?? ''}:${rec.enforcementId ?? ''}:${rec.eventType}:${rec.timestamp}:${rec.previousHash}:${rec.payloadHash}`)
                .digest('hex');
            if (recomputedHash !== rec.recordHash) {
                throw new Error(`PROVENANCE_TAMPER_DETECTED: Tampered recordHash at index ${i} for tenant '${tenantPartition}'`);
            }
            expectedPrevHash = rec.recordHash;
        }
        return true;
    }
    getHeadHash(tenantPartition) {
        const chain = this.tenantChains.get(tenantPartition.trim());
        if (!chain || chain.length === 0) {
            return GENESIS_RUNTIME_PROVENANCE_HASH;
        }
        return chain[chain.length - 1].recordHash;
    }
    getChain(tenantPartition) {
        return Object.freeze([...(this.tenantChains.get(tenantPartition.trim()) ?? [])]);
    }
}
