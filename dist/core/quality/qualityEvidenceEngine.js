// src/core/quality/qualityEvidenceEngine.ts
// BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
//
// Governed engine aggregating build, test, and security evidence into deterministic bundles.
// Động cơ có quản trị tổng hợp bằng chứng dựng, kiểm thử và bảo mật thành các gói tất định.
//
// STRICT INVARIANTS:
// - EVIDENCE != AUTHORITY
// - EVIDENCE != PROMOTION_AUTHORIZATION
// - NO TOKEN PERSISTENCE (Zero authorization tokens stored as durable evidence).
// - NO CREDENTIAL PERSISTENCE.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { createQualityEvidenceId, } from './qualityTypes.js';
import { QualityPolicyEngine } from './qualityPolicyEngine.js';
export class QualityEvidenceEngine {
    /**
     * Computes deterministic SHA-256 hash representing the full evidence bundle content.
     * Tính toán mã băm SHA-256 tất định đại diện cho toàn bộ nội dung gói bằng chứng.
     */
    static hashEvidenceBundle(evidenceId, context, manifestHash, buildHashes, testHashes, securityScanHash) {
        const payload = [
            evidenceId,
            context.taskId,
            context.agentId,
            context.delegationId,
            context.capabilityLeaseId,
            context.sessionId,
            context.sandboxId,
            context.worktreeId ?? '',
            context.projectRoot,
            manifestHash,
            buildHashes.join(','),
            testHashes.join(','),
            securityScanHash ?? '',
        ].join(':');
        return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
    }
    /**
     * Constructs an immutable, cryptographically verifiable QualityEvidenceBundle.
     * Xây dựng một gói QualityEvidenceBundle bất biến, có thể kiểm chứng bằng mật mã.
     */
    createEvidenceBundle(input) {
        // 1. Guard against protected workspace C:\BOW\shopofbow.
        // 1. Bảo vệ chống lại không gian làm việc được bảo vệ C:\BOW\shopofbow.
        QualityPolicyEngine.assertNotProtectedWorkspace(input.context.projectRoot);
        const evidenceId = createQualityEvidenceId(`qev_${crypto.randomUUID()}`);
        const createdAt = Date.now();
        const buildHashes = input.buildResults.map((b) => b.buildEvidenceHash);
        const testHashes = input.testResults.map((t) => t.testEvidenceHash);
        const evidenceHash = QualityEvidenceEngine.hashEvidenceBundle(evidenceId, input.context, input.manifestHash, buildHashes, testHashes, input.securityScanResult?.scanHash);
        return Object.freeze({
            evidenceId,
            context: Object.freeze({ ...input.context }),
            manifestHash: input.manifestHash,
            worktreeHash: input.worktreeHash,
            buildResults: Object.freeze([...input.buildResults]),
            testResults: Object.freeze([...input.testResults]),
            securityScanResult: input.securityScanResult ? Object.freeze({ ...input.securityScanResult }) : undefined,
            evidenceHash,
            createdAt,
        });
    }
}
