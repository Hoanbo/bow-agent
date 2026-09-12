// src/core/crossIncident/crossIncidentProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.57: GOVERNED CROSS-INCIDENT INTELLIGENCE & RESILIENCE MEMORY
//
// Governed cross-incident cryptographic provenance engine.
// Generates tamper-evident, deterministic SHA-256 seals linking intelligence reports,
// cluster hashes, and lexicographically sorted constituent post-mortem SHA-256 hashes.
// Any deletion, alteration, or re-ordering of constituent hashes invalidates cryptographic verification.
// Động cơ nguồn gốc mật mã liên sự cố có quản trị.
// Tạo các dấu niêm phong SHA-256 xác định, chống can thiệp liên kết báo cáo tình báo,
// băm cụm và các băm SHA-256 hậu kiểm cấu thành được sắp xếp theo thứ tự từ điển.
// Bất kỳ sự xóa, thay đổi hoặc sắp xếp lại các băm cấu thành đều làm mất hiệu lực xác minh mật mã.
import crypto from 'node:crypto';
import { createCrossIncidentProvenanceId, } from './crossIncidentTypes.js';
export class CrossIncidentProvenanceEngine {
    /**
     * Computes the deterministic SHA-256 hash over reportId, clusterHash, sorted hashes, and timestamp.
     * SHA-256(reportId || clusterHash || sorted(constituentPostMortemHashes) || timestamp).
     * Tính toán băm SHA-256 xác định qua reportId, clusterHash, các băm đã sắp xếp và timestamp.
     */
    computeProvenanceHash(reportId, clusterHash, sortedConstituentHashes, timestamp) {
        const payload = [
            reportId,
            clusterHash,
            sortedConstituentHashes.join(':'),
            String(timestamp),
        ].join('||');
        return crypto.createHash('sha256').update(payload).digest('hex');
    }
    /**
     * Generates a tamper-evident cryptographic provenance record.
     * Constituent post-mortem hashes are deterministically sorted lexicographically.
     * Tạo bản ghi nguồn gốc mật mã chống can thiệp.
     * Các băm hậu kiểm cấu thành được sắp xếp xác định theo thứ tự từ điển.
     */
    generateProvenance(input) {
        if (!input.reportId) {
            throw new Error('PROVENANCE_GENERATION_FAILED: reportId is required');
        }
        if (!input.clusterHash) {
            throw new Error('PROVENANCE_GENERATION_FAILED: clusterHash is required');
        }
        if (!input.constituentPostMortemHashes || input.constituentPostMortemHashes.length === 0) {
            throw new Error('PROVENANCE_GENERATION_FAILED: constituentPostMortemHashes cannot be empty');
        }
        const timestamp = input.timestamp ?? Date.now();
        // Deterministic lexicographical sorting
        const sortedHashes = [...input.constituentPostMortemHashes].sort();
        const provenanceSha256 = this.computeProvenanceHash(input.reportId, input.clusterHash, sortedHashes, timestamp);
        const provenanceId = createCrossIncidentProvenanceId(`prov_${timestamp}_${provenanceSha256.slice(0, 12)}`);
        return {
            provenanceId,
            reportId: input.reportId,
            clusterHash: input.clusterHash,
            constituentPostMortemHashes: Object.freeze(sortedHashes),
            provenanceSha256,
            timestamp,
        };
    }
    /**
     * Verifies the cryptographic integrity of a provenance record against constituent hashes.
     * Returns true only if the recalculated SHA-256 matches exactly.
     * Xác minh tính toàn vẹn mật mã của bản ghi nguồn gốc so với các băm cấu thành.
     * Chỉ trả về true nếu SHA-256 tính toán lại khớp chính xác.
     */
    verifyProvenance(record, actualConstituentHashes) {
        if (!record || !actualConstituentHashes || actualConstituentHashes.length === 0) {
            return false;
        }
        // Sort actual hashes lexicographically
        const sortedActual = [...actualConstituentHashes].sort();
        // Check array length and item equivalence
        if (sortedActual.length !== record.constituentPostMortemHashes.length) {
            return false;
        }
        for (let i = 0; i < sortedActual.length; i++) {
            if (sortedActual[i] !== record.constituentPostMortemHashes[i]) {
                return false;
            }
        }
        const expectedHash = this.computeProvenanceHash(record.reportId, record.clusterHash, sortedActual, record.timestamp);
        return expectedHash === record.provenanceSha256;
    }
}
