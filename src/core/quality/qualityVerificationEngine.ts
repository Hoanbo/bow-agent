// src/core/quality/qualityVerificationEngine.ts
// BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
//
// Governed engine verifying cryptographic integrity and freshness of quality evidence bundles.
// Động cơ có quản trị xác minh tính toàn vẹn mật mã và độ tươi mới của các gói bằng chứng chất lượng.
//
// STRICT INVARIANTS:
// - VERIFICATION != AUTHORIZATION
// - EVIDENCE != AUTHORITY
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import {
  type QualityEvidenceBundle,
  QualityError,
  QualityErrorCode,
} from './qualityTypes.js';
import { QualityEvidenceEngine } from './qualityEvidenceEngine.js';
import type { SandboxDescriptor, SandboxManifest } from '../sandbox/sandboxTypes.js';

export interface QualityVerificationResult {
  readonly verified: boolean;
  readonly reason?: string;
  readonly verifiedAt: number;
}

export class QualityVerificationEngine {
  /**
   * Verifies the cryptographic integrity and freshness of an evidence bundle against live sandbox state.
   * Xác minh tính toàn vẹn mật mã và độ tươi mới của một gói bằng chứng đối chiếu với trạng thái sandbox thực tế.
   */
  public verifyEvidenceBundle(
    bundle: QualityEvidenceBundle,
    sandbox: SandboxDescriptor,
    currentManifest: SandboxManifest
  ): QualityVerificationResult {
    const verifiedAt = Date.now();

    // 1. Recompute and verify bundle hash integrity.
    // 1. Tính toán lại và xác minh tính toàn vẹn của mã băm gói bằng chứng.
    const buildHashes = bundle.buildResults.map((b) => b.buildEvidenceHash);
    const testHashes = bundle.testResults.map((t) => t.testEvidenceHash);

    const recomputedHash = QualityEvidenceEngine.hashEvidenceBundle(
      bundle.evidenceId,
      bundle.context,
      bundle.manifestHash,
      buildHashes,
      testHashes,
      bundle.securityScanResult?.scanHash
    );

    if (recomputedHash !== bundle.evidenceHash) {
      throw new QualityError(
        QualityErrorCode.EVIDENCE_CORRUPTED,
        `Evidence bundle "${bundle.evidenceId}" hash mismatch: expected "${bundle.evidenceHash}", recomputed "${recomputedHash}".`
      );
    }

    // 2. Validate sandbox ID binding.
    // 2. Xác thực liên kết Sandbox ID.
    if (bundle.context.sandboxId !== sandbox.id) {
      throw new QualityError(
        QualityErrorCode.SANDBOX_NOT_FOUND,
        `Evidence sandboxId "${bundle.context.sandboxId}" does not match live sandbox "${sandbox.id}".`
      );
    }

    // 3. Validate session binding.
    // 3. Xác thực liên kết phiên làm việc (Session).
    if (bundle.context.sessionId !== sandbox.binding.sessionId) {
      throw new QualityError(
        QualityErrorCode.SESSION_MISMATCH,
        `Evidence sessionId "${bundle.context.sessionId}" does not match live sandbox session "${sandbox.binding.sessionId}".`
      );
    }

    // 4. Validate manifest freshness against current manifest.
    // 4. Xác thực độ tươi mới của manifest đối chiếu với manifest hiện tại.
    if (bundle.manifestHash !== currentManifest.manifestHash) {
      throw new QualityError(
        QualityErrorCode.MANIFEST_HASH_MISMATCH,
        `Evidence manifest hash "${bundle.manifestHash}" does not match current sandbox manifest "${currentManifest.manifestHash}". Worktree is stale.`
      );
    }

    return Object.freeze({
      verified: true,
      verifiedAt,
      reason: 'Quality evidence bundle verified cleanly.',
    });
  }
}
