// src/core/remediation/remediationProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.55: GOVERNED INCIDENT REMEDIATION, AUTHORIZED RECOVERY EXECUTION & CLOSED-LOOP POST-MITIGATION VERIFICATION
//
// Cryptographic Remediation Provenance & Audit Trail Engine.
// Generates immutable, tamper-evident SHA-256 hash chains linking authorization token,
// snapshot digest, execution output, verification metrics, and rollback logs.
// Động cơ nguồn gốc mật mã và chuỗi kiểm toán khắc phục sự cố.
// Tạo chuỗi băm SHA-256 bất biến, chống giả mạo liên kết mã ủy quyền,
// bản tóm tắt ảnh chụp nhanh, đầu ra thực thi, số liệu xác minh và nhật ký khôi phục.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - SECRETS_SANITIZATION: Tokens, keys, and credentials must never appear in cleartext.
// - DETERMINISTIC_ORDERING: Payload properties are sorted lexicographically before hashing.
// - CRYPTOGRAPHIC_INTEGRITY: Any modification of prior stage digests breaks chain verification.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
export class RemediationProvenanceEngine {
    /**
     * Sanitizes secrets and credentials from objects before provenance generation or logging.
     * Làm sạch các bí mật và thông tin xác thực khỏi đối tượng trước khi tạo nguồn gốc hoặc ghi nhật ký.
     */
    sanitizeSecrets(obj) {
        if (obj === null || obj === undefined)
            return obj;
        if (typeof obj === 'string') {
            if (obj.length > 32 && /^[a-f0-9]{32,}$/i.test(obj)) {
                return `${obj.substring(0, 6)}...${obj.substring(obj.length - 4)}`;
            }
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeSecrets(item));
        }
        if (typeof obj === 'object') {
            const sanitized = {};
            for (const [key, val] of Object.entries(obj)) {
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('secret') ||
                    lowerKey.includes('password') ||
                    lowerKey.includes('token') ||
                    lowerKey.includes('key') ||
                    lowerKey.includes('credential')) {
                    sanitized[key] = '[REDACTED]';
                }
                else {
                    sanitized[key] = this.sanitizeSecrets(val);
                }
            }
            return sanitized;
        }
        return obj;
    }
    /**
     * Builds an immutable, tamper-evident cryptographic provenance record.
     * Xây dựng bản ghi nguồn gốc mật mã bất biến, chống giả mạo.
     */
    buildProvenanceRecord(options) {
        const { plan, tokenId, snapshot, executionResult, verificationResult, rollbackResult } = options;
        const tokenDigest = crypto.createHash('sha256').update(tokenId, 'utf8').digest('hex');
        // Build ordered chain components
        const chainTokens = [
            `TOKEN:${tokenDigest}`,
            `PLAN:${plan.planId}`,
            `INCIDENT:${plan.incidentId}`,
            `PACKAGE:${plan.packageId}`,
            `ACTION:${plan.actionId}`,
            `SNAPSHOT:${snapshot.snapshotSha256}`,
            `EXECUTION:${executionResult.executionSha256}`,
            `STATE:${executionResult.lifecycleState}`,
        ];
        if (verificationResult) {
            chainTokens.push(`VERIFICATION:${verificationResult.verificationSha256}:${verificationResult.passed}`);
        }
        if (rollbackResult) {
            chainTokens.push(`ROLLBACK:${rollbackResult.rollbackSha256}:${rollbackResult.success}`);
        }
        const provenanceHash = crypto
            .createHash('sha256')
            .update(chainTokens.join('|'), 'utf8')
            .digest('hex');
        return {
            provenanceHash,
            planId: plan.planId,
            tokenId: tokenId.substring(0, 8) + '...', // Masked token ID
            incidentId: plan.incidentId,
            packageId: plan.packageId,
            actionId: plan.actionId,
            snapshotSha256: snapshot.snapshotSha256,
            executionSha256: executionResult.executionSha256,
            verificationSha256: verificationResult?.verificationSha256,
            rollbackSha256: rollbackResult?.rollbackSha256,
            finalState: executionResult.lifecycleState,
            timestamp: Date.now(),
        };
    }
    /**
     * Verifies the cryptographic integrity of a provenance record against its components.
     * Xác minh tính toàn vẹn mật mã của bản ghi nguồn gốc dựa trên các thành phần của nó.
     */
    verifyProvenanceIntegrity(record, tokenId, snapshotSha256, executionSha256, verification, rollback) {
        const tokenDigest = crypto.createHash('sha256').update(tokenId, 'utf8').digest('hex');
        const chainTokens = [
            `TOKEN:${tokenDigest}`,
            `PLAN:${record.planId}`,
            `INCIDENT:${record.incidentId}`,
            `PACKAGE:${record.packageId}`,
            `ACTION:${record.actionId}`,
            `SNAPSHOT:${snapshotSha256}`,
            `EXECUTION:${executionSha256}`,
            `STATE:${record.finalState}`,
        ];
        if (verification) {
            chainTokens.push(`VERIFICATION:${verification.sha256}:${verification.passed}`);
        }
        if (rollback) {
            chainTokens.push(`ROLLBACK:${rollback.sha256}:${rollback.success}`);
        }
        const expectedHash = crypto
            .createHash('sha256')
            .update(chainTokens.join('|'), 'utf8')
            .digest('hex');
        return expectedHash === record.provenanceHash;
    }
}
