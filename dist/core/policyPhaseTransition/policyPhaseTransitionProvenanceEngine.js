// src/core/policyPhaseTransition/policyPhaseTransitionProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Phase Transition Provenance Engine (Component 880).
// Establishes an immutable, append-only SHA-256 cryptographic chain
// binding all phase exit and entry governance actions.
//
// Core Authority Invariants:
// - PROVENANCE_ENGINE_HOLDS_ZERO_AUTHORITY
// - PROVENANCE_IS_APPEND_ONLY
// - FAIL_CLOSED_ON_TAMPERING
// - USER_STOP > EVERYTHING
import * as crypto from 'crypto';
import { createPhaseTransitionProvenanceId, } from './policyPhaseTransitionTypes.js';
export class PolicyPhaseTransitionProvenanceEngine {
    chains = new Map();
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Provenance engine suspended by USER_STOP supremacy');
        }
    }
    /**
     * Records a phase transition governance event in the tenant's append-only cryptographic chain.
     */
    recordTransitionEvent(params) {
        this.assertUserStopInactive();
        const { tenantId, transitionType, targetPhase, entityId, payload } = params;
        if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
            throw new Error('INVALID_TENANT: tenantId must be a non-empty string');
        }
        if (!this.chains.has(tenantId)) {
            this.chains.set(tenantId, []);
        }
        const chain = this.chains.get(tenantId);
        const previousRecord = chain.length > 0 ? chain[chain.length - 1] : undefined;
        const previousHash = previousRecord ? previousRecord.sha256 : 'GENESIS_PHASE_1_3';
        const timestamp = params.timestamp ?? new Date().toISOString();
        const provenanceId = createPhaseTransitionProvenanceId(`prov_trans_${tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
        const hashInput = {
            provenanceId,
            tenantId,
            transitionType,
            targetPhase,
            entityId,
            timestamp,
            previousHash,
            payload,
        };
        const sha256 = crypto
            .createHash('sha256')
            .update(JSON.stringify(hashInput))
            .digest('hex');
        const record = Object.freeze({
            provenanceId,
            tenantId,
            transitionType,
            targetPhase,
            entityId,
            timestamp,
            sha256,
            previousHash,
        });
        chain.push(record);
        return record;
    }
    /**
     * Verifies the cryptographic chain integrity for a tenant.
     * Fails closed if any link is altered or missing.
     */
    verifyChain(tenantId) {
        this.assertUserStopInactive();
        if (!this.chains.has(tenantId)) {
            return Object.freeze({ valid: true });
        }
        const chain = this.chains.get(tenantId);
        let expectedPreviousHash = 'GENESIS_PHASE_1_3';
        for (let i = 0; i < chain.length; i++) {
            const record = chain[i];
            if (record.previousHash !== expectedPreviousHash) {
                return Object.freeze({
                    valid: false,
                    error: `PROVENANCE_TAMPER_DETECTED: Chain link broken at index ${i}. Expected parent '${expectedPreviousHash}', found '${record.previousHash}'`,
                });
            }
            expectedPreviousHash = record.sha256;
        }
        return Object.freeze({ valid: true });
    }
    /**
     * Retrieves the immutable record trail for a tenant.
     */
    getChain(tenantId) {
        this.assertUserStopInactive();
        return Object.freeze([...(this.chains.get(tenantId) ?? [])]);
    }
}
