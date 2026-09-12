// src/core/policyCanary/policyCanaryProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.60: GOVERNED REAL-TIME POLICY CANARY VERIFICATION & MULTI-RING ROLLOUT PIPELINE
//
// Governed Policy Canary Provenance Engine.
// Implements an append-only, tamper-evident SHA-256 cryptographic provenance chain tracking
// the complete lifecycle: Proposal -> Candidate -> Shadow Evidence -> Ring Authorizations -> Global Activation.
//
// Động cơ nguồn gốc canary chính sách có quản trị.
// Thực thi chuỗi nguồn gốc mật mã SHA-256 chống giả mạo chỉ thêm, theo dõi toàn bộ vòng đời:
// Đề xuất -> Ứng viên -> Bằng chứng Shadow -> Ủy quyền theo Vòng -> Kích hoạt Toàn cục.
//
// Invariants:
// - Deterministic SHA-256 hash chaining (previousHash -> currentHash).
// - Cryptographic verification of unbroken provenance before any ring promotion or activation.
// - Zero autonomous tampering.
import crypto from 'node:crypto';
import { createPolicyCanaryProvenanceId, } from './policyCanaryTypes.js';
export const GENESIS_CANARY_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
export class PolicyCanaryProvenanceEngine {
    // Keyed by candidateId
    chains = new Map();
    /**
     * Appends a new verified event to the cryptographic provenance chain.
     * Thêm một sự kiện mới đã được xác minh vào chuỗi nguồn gốc mật mã.
     */
    recordEvent(input) {
        const { candidateId, tenantPartition, ring, eventType, candidatePolicyVersion, evidenceReference, authorizationReference, } = input;
        let chain = this.chains.get(candidateId);
        if (!chain) {
            chain = [];
            this.chains.set(candidateId, chain);
        }
        const previousHash = chain.length > 0 ? chain[chain.length - 1].currentHash : GENESIS_CANARY_HASH;
        const timestamp = new Date().toISOString();
        const provenanceId = createPolicyCanaryProvenanceId(`prov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
        const payload = JSON.stringify({
            provenanceId,
            candidateId,
            tenantPartition,
            ring,
            eventType,
            candidatePolicyVersion,
            previousHash,
            timestamp,
            evidenceReference: evidenceReference || '',
            authorizationReference: authorizationReference || '',
        });
        const currentHash = crypto.createHash('sha256').update(payload).digest('hex');
        const record = {
            provenanceId,
            candidateId,
            tenantPartition,
            ring,
            eventType,
            previousHash,
            currentHash,
            candidatePolicyVersion,
            timestamp,
            evidenceReference,
            authorizationReference,
        };
        chain.push(record);
        return record;
    }
    /**
     * Cryptographically verifies the unbroken SHA-256 chain for a candidate.
     * Xác minh chuỗi SHA-256 không bị phá vỡ theo mật mã học cho một ứng viên.
     */
    verifyChain(candidateId) {
        const chain = this.chains.get(candidateId);
        if (!chain || chain.length === 0) {
            return {
                valid: false,
                recordCount: 0,
                headHash: GENESIS_CANARY_HASH,
                reason: 'PROVENANCE_CHAIN_EMPTY: No provenance records found for candidate',
            };
        }
        let expectedPrevHash = GENESIS_CANARY_HASH;
        for (let i = 0; i < chain.length; i++) {
            const record = chain[i];
            if (record.previousHash !== expectedPrevHash) {
                return {
                    valid: false,
                    recordCount: chain.length,
                    headHash: record.currentHash,
                    reason: `PROVENANCE_HASH_BREAK: Record at index ${i} (${record.provenanceId}) previousHash '${record.previousHash}' does not match expected '${expectedPrevHash}'`,
                };
            }
            const payload = JSON.stringify({
                provenanceId: record.provenanceId,
                candidateId: record.candidateId,
                tenantPartition: record.tenantPartition,
                ring: record.ring,
                eventType: record.eventType,
                candidatePolicyVersion: record.candidatePolicyVersion,
                previousHash: record.previousHash,
                timestamp: record.timestamp,
                evidenceReference: record.evidenceReference || '',
                authorizationReference: record.authorizationReference || '',
            });
            const calculatedHash = crypto.createHash('sha256').update(payload).digest('hex');
            if (calculatedHash !== record.currentHash) {
                return {
                    valid: false,
                    recordCount: chain.length,
                    headHash: record.currentHash,
                    reason: `PROVENANCE_TAMPER_DETECTED: Record at index ${i} currentHash '${record.currentHash}' does not match recomputed '${calculatedHash}'`,
                };
            }
            expectedPrevHash = record.currentHash;
        }
        return {
            valid: true,
            recordCount: chain.length,
            headHash: expectedPrevHash,
        };
    }
    /**
     * Retrieves the full provenance chain for a candidate.
     * Lấy toàn bộ chuỗi nguồn gốc cho một ứng viên.
     */
    getChain(candidateId) {
        return this.chains.get(candidateId) ?? [];
    }
    /**
     * Clears chain for testing.
     * Xóa chuỗi phục vụ kiểm thử.
     */
    clear() {
        this.chains.clear();
    }
}
export const globalPolicyCanaryProvenanceEngine = new PolicyCanaryProvenanceEngine();
