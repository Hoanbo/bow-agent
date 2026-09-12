// src/core/incidentResilience/incidentResilienceProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.56: GOVERNED POST-REMEDIATION RESILIENCE, RECOVERY OUTCOME ANALYSIS & INCIDENT LIFECYCLE CLOSURE PIPELINE
//
// Cryptographic Incident Resilience Provenance Engine.
// Generates immutable, tamper-evident SHA-256 hash chains linking upstream remediation provenance,
// closure certificate, and post-mortem synthesis.
// Động cơ nguồn gốc mật mã cho khả năng phục hồi sự cố.
// Tạo chuỗi băm SHA-256 bất biến, chống giả mạo liên kết nguồn gốc khắc phục thượng nguồn,
// chứng nhận đóng sự cố và tài liệu tổng hợp hậu kiểm.
//
// STRICT GOVERNANCE INVARIANTS / CÁC BẤT BIẾN QUẢN TRỊ NGHIÊM NGẶT:
// - CRYPTOGRAPHIC INTEGRITY: Any alteration of upstream remediation hash or closure certificate invalidates provenance.
// - DETERMINISTIC SERIALIZATION: Canonical ordering and formatting before SHA-256 hashing.
// - ZERO SECRET LEAKAGE: Secrets and authorization tokens are scrubbed before hash computation.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
export class IncidentResilienceProvenanceEngine {
    /**
     * Builds an immutable cryptographic provenance record for the resilience lifecycle.
     * Xây dựng bản ghi nguồn gốc mật mã bất biến cho vòng đời phục hồi sự cố.
     */
    buildProvenance(options) {
        const timestamp = Date.now();
        const upstreamRemediationHash = options.upstreamRemediationHash ??
            options.postMortemReport.upstreamProvenanceHash ??
            '0000000000000000000000000000000000000000000000000000000000000000';
        const rawCanonical = JSON.stringify({
            closureCertificateHash: options.closureRecord.closureCertificateHash,
            closureId: options.closureRecord.closureId,
            incidentId: options.incidentId,
            postMortemHash: options.postMortemReport.postMortemSha256,
            postMortemId: options.postMortemReport.reportId,
            timestamp,
            upstreamRemediationHash,
        });
        const resilienceProvenanceHash = crypto.createHash('sha256').update(rawCanonical).digest('hex');
        return Object.freeze({
            incidentId: options.incidentId,
            closureId: options.closureRecord.closureId,
            postMortemId: options.postMortemReport.reportId,
            upstreamRemediationHash,
            closureCertificateHash: options.closureRecord.closureCertificateHash,
            postMortemHash: options.postMortemReport.postMortemSha256,
            resilienceProvenanceHash,
            timestamp,
        });
    }
    /**
     * Verifies the cryptographic integrity of an IncidentResilienceProvenanceRecord.
     * Xác minh tính toàn vẹn mật mã của IncidentResilienceProvenanceRecord.
     */
    verifyProvenance(record) {
        const rawCanonical = JSON.stringify({
            closureCertificateHash: record.closureCertificateHash,
            closureId: record.closureId,
            incidentId: record.incidentId,
            postMortemHash: record.postMortemHash,
            postMortemId: record.postMortemId,
            timestamp: record.timestamp,
            upstreamRemediationHash: record.upstreamRemediationHash,
        });
        const expectedHash = crypto.createHash('sha256').update(rawCanonical).digest('hex');
        return expectedHash === record.resilienceProvenanceHash;
    }
}
