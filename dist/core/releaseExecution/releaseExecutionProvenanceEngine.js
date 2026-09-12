// src/core/releaseExecution/releaseExecutionProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.51: GOVERNED RELEASE EXECUTION & AUTHORIZED DEPLOYMENT BOUNDARY
//
// Cryptographic provenance aggregation and hash computation for release execution.
// Tổng hợp nguồn gốc mật mã và tính toán mã băm cho thực thi phát hành.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - Deterministic SHA-256 provenance hashes.
// - Zero secret or raw authorization token persistence.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { RELEASE_EXECUTION_SCHEMA_VERSION, } from './releaseExecutionTypes.js';
export class ReleaseExecutionProvenanceEngine {
    /**
     * Computes deterministic SHA-256 hash for execution request.
     * Tính toán mã băm SHA-256 tất định cho yêu cầu thực thi.
     */
    static calculateExecutionHash(request) {
        const payload = [
            request.executionId,
            request.candidateId,
            request.verificationId,
            request.target.targetId,
            request.target.projectRoot,
            request.target.targetEnvironment,
            request.operatorId,
            request.sessionId,
            request.taskId,
            request.delegationId,
            request.capabilityLeaseId,
            request.requestedAt,
        ].join(':');
        return crypto.createHash('sha256').update(payload).digest('hex');
    }
    /**
     * Computes deterministic SHA-256 hash for execution evidence bundle.
     * Tính toán mã băm SHA-256 tất định cho gói bằng chứng thực thi.
     */
    static calculateEvidenceHash(executionId, candidateId, verificationId, preManifestHash, postManifestHash, authorizationRef, executedAt) {
        const payload = [
            executionId,
            candidateId,
            verificationId,
            preManifestHash,
            postManifestHash,
            authorizationRef,
            executedAt,
        ].join(':');
        return crypto.createHash('sha256').update(payload).digest('hex');
    }
    /**
     * Computes deterministic SHA-256 hash for the final execution result.
     * Tính toán mã băm SHA-256 tất định cho kết quả thực thi cuối cùng.
     */
    static calculateResultHash(executionId, candidateId, state, preManifestHash, postManifestHash, filesMutated, completedAt) {
        const payload = [
            executionId,
            candidateId,
            state,
            preManifestHash,
            postManifestHash ?? 'NONE',
            filesMutated.join(','),
            completedAt,
        ].join(':');
        return crypto.createHash('sha256').update(payload).digest('hex');
    }
    /**
     * Assembles the cryptographic ReleaseExecutionEvidence.
     * Lắp ráp ReleaseExecutionEvidence mật mã.
     */
    static assembleEvidence(request, preManifestHash, postManifestHash, authorizationRef, executedAt) {
        const executionHash = ReleaseExecutionProvenanceEngine.calculateExecutionHash(request);
        const evidenceHash = ReleaseExecutionProvenanceEngine.calculateEvidenceHash(request.executionId, request.candidateId, request.verificationId, preManifestHash, postManifestHash, authorizationRef, executedAt);
        return {
            executionId: request.executionId,
            candidateId: request.candidateId,
            verificationId: request.verificationId,
            executionHash,
            preReleaseManifestHash: preManifestHash,
            postReleaseManifestHash: postManifestHash,
            authorizationRef,
            evidenceHash,
            executedAt,
        };
    }
    /**
     * Compiles the final ReleaseExecutionResult.
     * Biên dịch ReleaseExecutionResult cuối cùng.
     */
    static compileResult(params) {
        const resultHash = ReleaseExecutionProvenanceEngine.calculateResultHash(params.request.executionId, params.request.candidateId, params.state, params.preReleaseManifestHash, params.postReleaseManifestHash, params.filesMutated, params.completedAt);
        return {
            executionId: params.request.executionId,
            schemaVersion: RELEASE_EXECUTION_SCHEMA_VERSION,
            candidateId: params.request.candidateId,
            verificationId: params.request.verificationId,
            state: params.state,
            target: params.target,
            preReleaseManifestHash: params.preReleaseManifestHash,
            postReleaseManifestHash: params.postReleaseManifestHash,
            filesMutated: params.filesMutated,
            rollbackOccurred: params.rollbackOccurred,
            rollbackReason: params.rollbackReason,
            errorDetails: params.errorDetails,
            evidence: params.evidence,
            startedAt: params.startedAt,
            completedAt: params.completedAt,
            resultHash,
        };
    }
}
