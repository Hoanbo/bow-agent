// src/core/policyStagedActivation/policyStagedActivationProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.70: GOVERNED STAGED POLICY ACTIVATION LAYER
//
// Governed Staged Activation Provenance Engine (Component 793).
// Implements an append-only, tamper-evident cryptographic SHA-256 provenance chain
// linking candidate validation, human authorization, activation readiness, policy staging,
// preflight verification, governed activation clearance, commit transition, and active policy state.
//
// Authority Invariants:
// - IMMUTABLE_CHAIN: Tampering produces PROVENANCE_TAMPER_DETECTED fail-closed
// - READ_ONLY_EVIDENCE: Provenance records evidence only; grants zero autonomous authority
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import path from 'node:path';
import { createStagedActivationProvenanceId } from './policyStagedActivationTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyStagedActivationProvenanceEngine {
    baseDir;
    isUserStopActiveFn;
    // Tenant -> candidateDraftId -> StagedActivationProvenanceRecord[]
    chains = new Map();
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Staged activation provenance suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('PROVENANCE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    getTenantChains(tenantPartition) {
        let map = this.chains.get(tenantPartition);
        if (!map) {
            map = new Map();
            this.chains.set(tenantPartition, map);
        }
        return map;
    }
    /**
     * Appends an activation event to the cryptographic provenance chain.
     */
    appendEvent(tenantPartition, candidateDraftId, eventType, payload) {
        this.assertUserStopInactive();
        this.validateTenant(tenantPartition);
        const tenantChains = this.getTenantChains(tenantPartition);
        let chain = tenantChains.get(candidateDraftId);
        if (!chain) {
            chain = [];
            tenantChains.set(candidateDraftId, chain);
        }
        const previousHash = chain.length > 0
            ? chain[chain.length - 1].recordHash
            : '0000000000000000000000000000000000000000000000000000000000000000';
        const timestamp = new Date().toISOString();
        const payloadHash = crypto.createHash('sha256')
            .update(JSON.stringify(payload.details ?? {}))
            .digest('hex');
        const recordData = JSON.stringify({
            tenantPartition,
            candidateDraftId,
            stagedActivationId: payload.stagedActivationId,
            authorizationDecisionId: payload.authorizationDecisionId,
            activationReadinessId: payload.activationReadinessId,
            activationPreflightId: payload.activationPreflightId,
            activationCommitId: payload.activationCommitId,
            eventType,
            timestamp,
            previousHash,
            payloadHash,
        });
        const recordHash = crypto.createHash('sha256').update(recordData).digest('hex');
        const provenanceId = createStagedActivationProvenanceId(`actprov_${recordHash.substring(0, 16)}`);
        const record = Object.freeze({
            provenanceId,
            tenantPartition,
            candidateDraftId,
            stagedActivationId: payload.stagedActivationId,
            authorizationDecisionId: payload.authorizationDecisionId,
            activationReadinessId: payload.activationReadinessId,
            activationPreflightId: payload.activationPreflightId,
            activationCommitId: payload.activationCommitId,
            eventType,
            timestamp,
            previousHash,
            recordHash,
            payloadHash,
        });
        chain.push(record);
        return record;
    }
    /**
     * Cryptographically verifies the provenance chain for a candidate activation.
     */
    verifyChain(tenantPartition, candidateDraftId) {
        this.assertUserStopInactive();
        this.validateTenant(tenantPartition);
        const tenantChains = this.getTenantChains(tenantPartition);
        const chain = tenantChains.get(candidateDraftId);
        if (!chain || chain.length === 0) {
            return true;
        }
        let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';
        for (const record of chain) {
            if (record.tenantPartition !== tenantPartition) {
                throw new Error(`PROVENANCE_TAMPER_DETECTED: Tenant partition mismatch in record '${record.provenanceId}'`);
            }
            if (record.candidateDraftId !== candidateDraftId) {
                throw new Error(`PROVENANCE_TAMPER_DETECTED: Candidate draft mismatch in record '${record.provenanceId}'`);
            }
            if (record.previousHash !== expectedPrev) {
                throw new Error(`PROVENANCE_TAMPER_DETECTED: Broken cryptographic hash link in record '${record.provenanceId}'`);
            }
            const recomputedData = JSON.stringify({
                tenantPartition: record.tenantPartition,
                candidateDraftId: record.candidateDraftId,
                stagedActivationId: record.stagedActivationId,
                authorizationDecisionId: record.authorizationDecisionId,
                activationReadinessId: record.activationReadinessId,
                activationPreflightId: record.activationPreflightId,
                activationCommitId: record.activationCommitId,
                eventType: record.eventType,
                timestamp: record.timestamp,
                previousHash: record.previousHash,
                payloadHash: record.payloadHash,
            });
            const recomputedHash = crypto.createHash('sha256').update(recomputedData).digest('hex');
            if (recomputedHash !== record.recordHash) {
                throw new Error(`PROVENANCE_TAMPER_DETECTED: Hash verification failed for record '${record.provenanceId}'`);
            }
            expectedPrev = record.recordHash;
        }
        return true;
    }
    /**
     * Retrieves the current provenance head hash for a candidate activation.
     */
    getProvenanceHead(tenantPartition, candidateDraftId) {
        this.assertUserStopInactive();
        this.validateTenant(tenantPartition);
        const tenantChains = this.getTenantChains(tenantPartition);
        const chain = tenantChains.get(candidateDraftId);
        if (!chain || chain.length === 0) {
            return '0000000000000000000000000000000000000000000000000000000000000000';
        }
        return chain[chain.length - 1].recordHash;
    }
}
