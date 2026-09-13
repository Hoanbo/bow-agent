// src/core/policyPostExecution/policyPostExecutionProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.66: GOVERNED POST-EXECUTION RECONCILIATION,
// IMPACT ANALYSIS & POLICY FEEDBACK PROPOSAL LAYER
//
// Governed Post-Execution Provenance Engine.
// Maintains append-only, tamper-evident SHA-256 cryptographic hash chains
// tracking every post-execution phase: reconciliation -> impact -> regression -> effectiveness -> feedback proposal.
//
// Động cơ nguồn gốc sau thực thi có quản trị.
// Duy trì các chuỗi băm mật mã SHA-256 chỉ thêm, chống giả mạo
// theo dõi mọi giai đoạn sau thực thi: điều hòa -> tác động -> hồi quy -> hiệu quả -> đề xuất phản hồi.
//
// Authority Invariants:
// - IMMUTABLE_HASH_CHAIN: Parent hash strictly chained on every transition
// - TAMPER_EVIDENT: Any retrofitted modification invalidates chain verification
// - STRICT_TENANT_ISOLATION: Partition-isolated chains per executionId & tenant
import crypto from 'node:crypto';
import path from 'node:path';
import { createPostExecutionProvenanceId, } from './policyPostExecutionTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export const GENESIS_POST_EXECUTION_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
export class PolicyPostExecutionProvenanceEngine {
    // Map<executionId, PostExecutionProvenanceRecord[]>
    chains = new Map();
    baseDir;
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('PROVENANCE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    /**
     * Appends a post-execution governance transition record to the hash chain.
     * Thêm một bản ghi chuyển đổi quản trị sau thực thi vào chuỗi băm.
     */
    recordTransition(input) {
        this.validateTenant(input.tenantPartition);
        let chain = this.chains.get(input.executionId);
        if (!chain) {
            chain = [];
            this.chains.set(input.executionId, chain);
        }
        const previousHash = chain.length === 0 ? GENESIS_POST_EXECUTION_HASH : chain[chain.length - 1].currentHash;
        const provenanceId = createPostExecutionProvenanceId(`pep_prv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
        const timestamp = new Date().toISOString();
        const detailsHash = input.detailsPayload
            ? crypto.createHash('sha256').update(JSON.stringify(input.detailsPayload)).digest('hex')
            : undefined;
        const currentHash = crypto
            .createHash('sha256')
            .update(JSON.stringify({
            provenanceId,
            executionId: input.executionId,
            tenantPartition: input.tenantPartition,
            eventType: input.eventType,
            previousHash,
            timestamp,
            detailsHash,
        }))
            .digest('hex');
        const record = Object.freeze({
            provenanceId,
            executionId: input.executionId,
            tenantPartition: input.tenantPartition,
            eventType: input.eventType,
            previousHash,
            currentHash,
            timestamp,
            detailsHash,
        });
        chain.push(record);
        return record;
    }
    /**
     * Cryptographically verifies the integrity of a post-execution provenance chain.
     * Xác minh tính toàn vẹn mật mã của chuỗi nguồn gốc sau thực thi.
     */
    verifyChain(executionId) {
        const chain = this.chains.get(executionId);
        if (!chain || chain.length === 0) {
            return { valid: true, recordCount: 0 };
        }
        let expectedPrevHash = GENESIS_POST_EXECUTION_HASH;
        let lastTimestamp = 0;
        for (let i = 0; i < chain.length; i++) {
            const rec = chain[i];
            if (rec.previousHash !== expectedPrevHash) {
                return {
                    valid: false,
                    recordCount: chain.length,
                    reason: `PROVENANCE_LINK_BROKEN: Previous hash mismatch at index ${i}`,
                };
            }
            const recTime = new Date(rec.timestamp).getTime();
            if (recTime < lastTimestamp) {
                return {
                    valid: false,
                    recordCount: chain.length,
                    reason: `PROVENANCE_CHRONOLOGY_VIOLATION: Timestamp regression at index ${i}`,
                };
            }
            lastTimestamp = recTime;
            const recomputed = crypto
                .createHash('sha256')
                .update(JSON.stringify({
                provenanceId: rec.provenanceId,
                executionId: rec.executionId,
                tenantPartition: rec.tenantPartition,
                eventType: rec.eventType,
                previousHash: rec.previousHash,
                timestamp: rec.timestamp,
                detailsHash: rec.detailsHash,
            }))
                .digest('hex');
            if (recomputed !== rec.currentHash) {
                return {
                    valid: false,
                    recordCount: chain.length,
                    reason: `PROVENANCE_TAMPER_DETECTED: Hash mismatch at index ${i}`,
                };
            }
            expectedPrevHash = rec.currentHash;
        }
        return {
            valid: true,
            recordCount: chain.length,
            headHash: chain[chain.length - 1].currentHash,
        };
    }
    getChain(executionId) {
        return this.chains.get(executionId) ?? [];
    }
}
export const globalPolicyPostExecutionProvenanceEngine = new PolicyPostExecutionProvenanceEngine();
