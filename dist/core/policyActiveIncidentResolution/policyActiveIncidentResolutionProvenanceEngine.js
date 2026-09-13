// src/core/policyActiveIncidentResolution/policyActiveIncidentResolutionProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Cryptographic Provenance Engine (Component 851).
// Maintains an append-only SHA-256 hash chain binding incident resolution lifecycle events.
// Detects out-of-order, missing, or altered records and fails closed on tamper detection.
//
// Core Authority Invariants:
// - PROVENANCE_CANNOT_BE_MUTATED_OR_TRUNCATED
// - PROVENANCE_TAMPER_DETECTED -> FAIL_CLOSED
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { createResolutionProvenanceId } from './policyActiveIncidentResolutionTypes.js';
export const GENESIS_HASH_RESOLUTION = '0000000000000000000000000000000000000000000000000000000000000000';
export class PolicyActiveIncidentResolutionProvenanceEngine {
    baseDir;
    isUserStopActiveFn;
    chains = new Map();
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Provenance engine suspended by USER_STOP supremacy');
        }
    }
    getChainFilePath(tenantPartition) {
        const resolved = resolveUserPartition(tenantPartition.trim(), this.baseDir);
        const targetDir = path.join(resolved.baseDir, resolved.partitionKey, 'policy_incident_resolution');
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        return path.join(targetDir, 'resolution_provenance.jsonl');
    }
    loadChainIfEmpty(tenantPartition) {
        if (this.chains.has(tenantPartition)) {
            return this.chains.get(tenantPartition);
        }
        const records = [];
        const filePath = this.getChainFilePath(tenantPartition);
        if (fs.existsSync(filePath)) {
            const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim().length > 0);
            let expectedPrevHash = GENESIS_HASH_RESOLUTION;
            for (let i = 0; i < lines.length; i++) {
                try {
                    const rec = JSON.parse(lines[i]);
                    if (rec.previousHash !== expectedPrevHash) {
                        throw new Error(`PROVENANCE_TAMPER_DETECTED: Hash chain break at index ${i}: expected '${expectedPrevHash}', got '${rec.previousHash}'`);
                    }
                    // Recalculate record hash
                    const calculated = crypto.createHash('sha256')
                        .update(`${rec.provenanceId}:${rec.tenantPartition}:${rec.incidentId}:${rec.eventType}:${rec.timestamp}:${rec.previousHash}:${rec.payloadHash}`)
                        .digest('hex');
                    if (calculated !== rec.recordHash) {
                        throw new Error(`PROVENANCE_TAMPER_DETECTED: Tampered record hash at index ${i}: expected '${calculated}', got '${rec.recordHash}'`);
                    }
                    records.push(Object.freeze(rec));
                    expectedPrevHash = rec.recordHash;
                }
                catch (err) {
                    if (err.message.includes('PROVENANCE_TAMPER_DETECTED')) {
                        throw err;
                    }
                    throw new Error(`PROVENANCE_TAMPER_DETECTED: Corrupted record line at index ${i}: ${err.message}`);
                }
            }
        }
        this.chains.set(tenantPartition, records);
        return records;
    }
    getHeadHash(tenantPartition) {
        this.assertUserStopInactive();
        const chain = this.loadChainIfEmpty(tenantPartition);
        if (chain.length === 0) {
            return GENESIS_HASH_RESOLUTION;
        }
        return chain[chain.length - 1].recordHash;
    }
    appendRecord(input) {
        this.assertUserStopInactive();
        const { tenantPartition, incidentId, activePolicyStateId, containmentAssessmentId, containmentClearanceId, recoveryAuthorizationId, recoveryHandoffId, recoveryVerificationId, resolutionId, closureId, eventType, payload, } = input;
        const chain = this.loadChainIfEmpty(tenantPartition);
        const previousHash = chain.length === 0 ? GENESIS_HASH_RESOLUTION : chain[chain.length - 1].recordHash;
        const payloadHash = crypto.createHash('sha256')
            .update(JSON.stringify(payload ?? {}))
            .digest('hex');
        const timestamp = new Date().toISOString();
        const provenanceId = createResolutionProvenanceId(`rprv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        const recordHash = crypto.createHash('sha256')
            .update(`${provenanceId}:${tenantPartition}:${incidentId}:${eventType}:${timestamp}:${previousHash}:${payloadHash}`)
            .digest('hex');
        const record = Object.freeze({
            provenanceId,
            tenantPartition,
            incidentId,
            activePolicyStateId: activePolicyStateId ?? null,
            containmentAssessmentId: containmentAssessmentId ?? null,
            containmentClearanceId: containmentClearanceId ?? null,
            recoveryAuthorizationId: recoveryAuthorizationId ?? null,
            recoveryHandoffId: recoveryHandoffId ?? null,
            recoveryVerificationId: recoveryVerificationId ?? null,
            resolutionId: resolutionId ?? null,
            closureId: closureId ?? null,
            eventType,
            timestamp,
            previousHash,
            recordHash,
            payloadHash,
        });
        chain.push(record);
        const filePath = this.getChainFilePath(tenantPartition);
        fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf8');
        return record;
    }
    verifyChainIntegrity(tenantPartition) {
        this.assertUserStopInactive();
        try {
            this.loadChainIfEmpty(tenantPartition);
            return true;
        }
        catch {
            return false;
        }
    }
    getRecords(tenantPartition) {
        this.assertUserStopInactive();
        return Object.freeze([...this.loadChainIfEmpty(tenantPartition)]);
    }
}
