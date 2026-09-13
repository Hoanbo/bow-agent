// src/core/policyEvolutionPlanning/policyEvolutionPlanningProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.68: GOVERNED POLICY EVOLUTION PLANNING & CANDIDATE SYNTHESIS LAYER
//
// Governed Policy Evolution Planning Provenance Engine (Component 772).
// Implements an append-only, tamper-evident cryptographic SHA-256 provenance chain
// linking intake, evolution plans, candidate synthesis, validation, and human review requirements.
//
// Authority Invariants:
// - IMMUTABLE_CHAIN: Tampering produces PROVENANCE_TAMPER_DETECTED
// - READ_ONLY_EVIDENCE: Provenance records evidence only; grants zero authority
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import path from 'node:path';
import { createEvolutionPlanningProvenanceId } from './policyEvolutionPlanningTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyEvolutionPlanningProvenanceEngine {
    baseDir;
    isUserStopActiveFn;
    // Tenant -> Map<intakeId, EvolutionPlanningProvenanceRecord[]>
    chains = new Map();
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Provenance operations suspended by USER_STOP supremacy');
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
     * Appends a transition event to the planning provenance chain.
     */
    appendEvent(tenantPartition, intakeId, eventType, payload) {
        this.assertUserStopInactive();
        this.validateTenant(tenantPartition);
        const tenantMap = this.getTenantChains(tenantPartition);
        let chain = tenantMap.get(intakeId);
        if (!chain) {
            chain = [];
            tenantMap.set(intakeId, chain);
        }
        const previousHash = chain.length > 0 ? chain[chain.length - 1].currentHash : 'GENESIS_PLANNING_PROVENANCE_HASH';
        const timestamp = new Date().toISOString();
        const detailsStr = payload.details ? JSON.stringify(payload.details) : '';
        const detailsHash = payload.details ? crypto.createHash('sha256').update(detailsStr).digest('hex') : undefined;
        const currentHash = crypto.createHash('sha256')
            .update(`${intakeId}:${tenantPartition}:${eventType}:${previousHash}:${timestamp}:${payload.planId ?? ''}:${payload.candidateDraftId ?? ''}:${detailsHash ?? ''}`)
            .digest('hex');
        const provenanceId = createEvolutionPlanningProvenanceId(`pprov_${currentHash.substring(0, 16)}`);
        const record = Object.freeze({
            provenanceId,
            tenantPartition,
            intakeId,
            planId: payload.planId,
            candidateDraftId: payload.candidateDraftId,
            eventType,
            previousHash,
            currentHash,
            timestamp,
            detailsHash,
        });
        chain.push(record);
        return record;
    }
    /**
     * Gets the head hash of a planning provenance chain.
     */
    getHeadHash(tenantPartition, intakeId) {
        this.assertUserStopInactive();
        this.validateTenant(tenantPartition);
        const chain = this.getTenantChains(tenantPartition).get(intakeId);
        if (!chain || chain.length === 0) {
            return 'GENESIS_PLANNING_PROVENANCE_HASH';
        }
        return chain[chain.length - 1].currentHash;
    }
    /**
     * Cryptographically verifies the integrity of an evolution planning chain.
     */
    verifyChainIntegrity(tenantPartition, intakeId) {
        this.assertUserStopInactive();
        this.validateTenant(tenantPartition);
        const chain = this.getTenantChains(tenantPartition).get(intakeId);
        if (!chain || chain.length === 0) {
            return { valid: true, errors: [] };
        }
        const errors = [];
        let expectedPrev = 'GENESIS_PLANNING_PROVENANCE_HASH';
        for (let i = 0; i < chain.length; i++) {
            const record = chain[i];
            if (record.previousHash !== expectedPrev) {
                errors.push(`PROVENANCE_TAMPER_DETECTED: Entry ${i} previousHash '${record.previousHash}' does not match expected '${expectedPrev}'`);
            }
            if (record.tenantPartition !== tenantPartition) {
                errors.push(`PROVENANCE_TAMPER_DETECTED: Entry ${i} tenant '${record.tenantPartition}' does not match requested '${tenantPartition}'`);
            }
            if (record.intakeId !== intakeId) {
                errors.push(`PROVENANCE_TAMPER_DETECTED: Entry ${i} intakeId '${record.intakeId}' does not match requested '${intakeId}'`);
            }
            const recalculated = crypto.createHash('sha256')
                .update(`${record.intakeId}:${record.tenantPartition}:${record.eventType}:${record.previousHash}:${record.timestamp}:${record.planId ?? ''}:${record.candidateDraftId ?? ''}:${record.detailsHash ?? ''}`)
                .digest('hex');
            if (recalculated !== record.currentHash) {
                errors.push(`PROVENANCE_TAMPER_DETECTED: Entry ${i} currentHash does not match recalculated hash`);
            }
            expectedPrev = record.currentHash;
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
