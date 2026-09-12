// src/core/deployment/deploymentProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Cryptographic provenance engine assembling deterministic hashes across the deployment lifecycle.
// Động cơ nguồn gốc mật mã tổng hợp các mã băm xác định xuyên suốt vòng đời triển khai.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - PROVENANCE CHAIN INTEGRITY: Strict cryptographic link from task to audit.
// - ZERO SECRET PERSISTENCE: Tokens, passwords, private keys scrubbed from evidence.
// - DETERMINISTIC HASH GENERATION.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type DeploymentRequest,
  type DeploymentCandidate,
  type DeploymentApprovalBinding,
  type DeploymentAuthorizationBinding,
  type CanaryVerificationRecord,
  type RolloutRingLevel,
} from './deploymentTypes.js';

export interface DeploymentProvenanceChain {
  readonly taskId: string;
  readonly operatorId: string;
  readonly sessionId: string;
  readonly delegationId: string;
  readonly capabilityLeaseId: string;
  readonly releaseExecutionId: string;
  readonly candidateId: string;
  readonly candidateFingerprint: string;
  readonly ownerApprovalReviewer?: string;
  readonly authorizationTokenHash?: string;
  readonly targetRing: RolloutRingLevel;
  readonly canaryEvidenceHashes: readonly string[];
  readonly preDeploymentManifestHash: string;
  readonly postDeploymentManifestHash: string;
}

export class DeploymentProvenanceEngine {
  /**
   * Sanitizes sensitive fields from records to prevent secret leakage into audit evidence.
   * Làm sạch các trường nhạy cảm khỏi các bản ghi để ngăn chặn rò rỉ bí mật vào bằng chứng kiểm toán.
   */
  public sanitizeSecrets<T>(data: T): T {
    const raw = JSON.stringify(data);
    const scrubbed = raw
      .replace(/"(token|secret|password|key|authorization)"\s*:\s*"[^"]+"/gi, '"$1":"[REDACTED]"')
      .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]');
    return JSON.parse(scrubbed) as T;
  }

  /**
   * Assembles a deterministic SHA-256 provenance hash binding all chain stages.
   * Lắp ráp một mã băm nguồn gốc SHA-256 xác định ràng buộc tất cả các giai đoạn của chuỗi.
   */
  public computeProvenanceHash(chain: DeploymentProvenanceChain): string {
    const sanitized = this.sanitizeSecrets(chain);
    const serialized = JSON.stringify(sanitized, Object.keys(sanitized).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Builds the complete provenance chain record from deployment artifacts.
   * Xây dựng bản ghi chuỗi nguồn gốc hoàn chỉnh từ các tạo tác triển khai.
   */
  public buildChain(options: {
    readonly request: DeploymentRequest;
    readonly candidate: DeploymentCandidate;
    readonly approval?: DeploymentApprovalBinding;
    readonly authorization?: DeploymentAuthorizationBinding;
    readonly targetRing: RolloutRingLevel;
    readonly canaryRecords: readonly CanaryVerificationRecord[];
    readonly preDeploymentManifestHash: string;
    readonly postDeploymentManifestHash: string;
  }): { readonly chain: DeploymentProvenanceChain; readonly provenanceHash: string } {
    const canaryEvidenceHashes = options.canaryRecords.map(r => r.evidenceHash);

    const chain: DeploymentProvenanceChain = {
      taskId: options.request.taskId,
      operatorId: options.request.operatorId,
      sessionId: options.request.sessionId,
      delegationId: options.request.delegationId,
      capabilityLeaseId: options.request.capabilityLeaseId,
      releaseExecutionId: options.request.releaseExecutionId,
      candidateId: options.candidate.candidateId,
      candidateFingerprint: options.candidate.candidateFingerprint,
      ownerApprovalReviewer: options.approval?.reviewerId,
      authorizationTokenHash: options.authorization?.tokenHash,
      targetRing: options.targetRing,
      canaryEvidenceHashes,
      preDeploymentManifestHash: options.preDeploymentManifestHash,
      postDeploymentManifestHash: options.postDeploymentManifestHash,
    };

    const provenanceHash = this.computeProvenanceHash(chain);
    return { chain, provenanceHash };
  }
}
