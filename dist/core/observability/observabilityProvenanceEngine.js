// src/core/observability/observabilityProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Cryptographic provenance engine binding observational telemetry back to task and deployment roots.
// Động cơ nguồn gốc mật mã ràng buộc đo từ xa quan sát trở lại gốc tác vụ và triển khai.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - FULL PROVENANCE CHAIN: TASK -> AGENT -> DELEGATION -> CAPABILITY_LEASE -> SANDBOX ->
//   WORKTREE -> RELEASE -> DEPLOYMENT -> OBSERVATION -> TELEMETRY -> INVARIANT -> DRIFT -> ALERT -> HEALTH_REPORT -> AUDIT.
// - ZERO SECRET PERSISTENCE: Scrub all tokens, keys, passwords, and private secrets.
// - DETERMINISTIC SHA-256 HASH GENERATION.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
export class ObservabilityProvenanceEngine {
    /**
     * Sanitizes sensitive authorization keys, tokens, and passwords from payloads.
     * Làm sạch các khóa ủy quyền, mã token và mật khẩu nhạy cảm khỏi trọng tải.
     */
    sanitizeSecrets(data) {
        const raw = JSON.stringify(data);
        const scrubbed = raw
            .replace(/"(token|secret|password|key|authorization|apiKey|authHeader)"\s*:\s*"[^"]+"/gi, '"$1":"[REDACTED]"')
            .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]');
        return JSON.parse(scrubbed);
    }
    /**
     * Computes a deterministic SHA-256 hash for the entire provenance chain.
     * Tính toán mã băm SHA-256 xác định cho toàn bộ chuỗi nguồn gốc.
     */
    computeChainHash(chain) {
        const sanitized = this.sanitizeSecrets(chain);
        const serialized = JSON.stringify(sanitized, Object.keys(sanitized).sort());
        return crypto.createHash('sha256').update(serialized).digest('hex');
    }
    /**
     * Constructs the verified provenance chain linking post-deployment observations to canonical roots.
     * Xây dựng chuỗi nguồn gốc đã xác minh liên kết các quan sát sau triển khai với các gốc chuẩn tắc.
     */
    buildChain(options) {
        const chain = {
            taskId: options.taskId,
            agentId: options.agentId,
            delegationId: options.delegationId,
            capabilityLeaseId: options.capabilityLeaseId,
            sandboxId: options.sandboxId,
            worktreeId: options.worktreeId,
            releaseExecutionId: options.releaseExecutionId,
            deploymentId: options.deploymentId,
            sessionId: options.sessionId,
            telemetrySampleHashes: [...options.telemetrySampleHashes].sort(),
            invariantEvidenceHashes: [...options.invariantEvidenceHashes].sort(),
            driftEvidenceHashes: [...options.driftEvidenceHashes].sort(),
            alertFingerprints: [...options.alertFingerprints].sort(),
            healthReportHash: options.healthReportHash,
            auditArgumentsHash: options.auditArgumentsHash,
        };
        const chainHash = this.computeChainHash(chain);
        return { chain, chainHash };
    }
}
