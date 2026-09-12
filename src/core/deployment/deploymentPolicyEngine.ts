// src/core/deployment/deploymentPolicyEngine.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Fail-closed policy evaluator for governed production deployment and canary boundaries.
// Bộ đánh giá chính sách đóng khi thất bại cho ranh giới triển khai sản xuất và canary có quản trị.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
// - ZERO SHELL EXECUTION.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import path from 'node:path';
import {
  type DeploymentRequest,
  type DeploymentCandidate,
  type DeploymentTarget,
  type RolloutRingLevel,
  ROLLOUT_RING_ORDER,
  DeploymentError,
} from './deploymentTypes.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';

export class DeploymentPolicyEngine {
  /**
   * Asserts that a target path does not touch the protected workspace C:\BOW\shopofbow.
   * Khẳng định rằng đường dẫn mục tiêu không chạm vào không gian làm việc được bảo vệ C:\BOW\shopofbow.
   */
  public assertProtectedWorkspaceIsolation(targetPath: string): void {
    const normalized = path.normalize(targetPath).toLowerCase();
    if (
      normalized.includes('shopofbow') ||
      normalized.includes('c:\\bow\\shopofbow') ||
      normalized.includes('c:/bow/shopofbow')
    ) {
      throw new DeploymentError(
        'PROTECTED_WORKSPACE_VIOLATION',
        `Target path "${targetPath}" references permanently protected workspace C:\\BOW\\shopofbow.`
      );
    }

    SandboxPathGuard.assertNotProtectedWorkspace(targetPath);
  }

  /**
   * Validates target boundaries and path traversal guards.
   * Xác thực ranh giới mục tiêu và các biện pháp bảo vệ duyệt đường dẫn.
   */
  public validateTarget(target: DeploymentTarget): void {
    if (!target.targetId || target.targetId.trim().length === 0) {
      throw new DeploymentError('UNAUTHORIZED_TARGET', 'DeploymentTarget targetId cannot be empty.');
    }

    if (!target.rootDirectory || target.rootDirectory.trim().length === 0) {
      throw new DeploymentError('UNAUTHORIZED_TARGET', 'DeploymentTarget rootDirectory cannot be empty.');
    }

    // 1. Enforce protected workspace isolation.
    // 1. Thực thi cô lập không gian làm việc được bảo vệ.
    this.assertProtectedWorkspaceIsolation(target.rootDirectory);

    // 2. Prevent path traversal in root directory.
    // 2. Ngăn chặn duyệt đường dẫn trong thư mục gốc.
    if (
      target.rootDirectory.includes('\0') ||
      target.rootDirectory.includes('..') ||
      target.rootDirectory.startsWith('\\\\') ||
      target.rootDirectory.startsWith('//')
    ) {
      throw new DeploymentError(
        'PATH_TRAVERSAL_DETECTED',
        `Forbidden path traversal characters in target rootDirectory: "${target.rootDirectory}".`
      );
    }

    // 3. Prevent path traversal in allowed relative paths.
    // 3. Ngăn chặn duyệt đường dẫn trong các đường dẫn tương đối được phép.
    for (const rel of target.allowedRelativePaths) {
      if (
        rel.includes('\0') ||
        rel.includes('..') ||
        path.isAbsolute(rel) ||
        rel.startsWith('\\\\') ||
        rel.startsWith('//')
      ) {
        throw new DeploymentError(
          'PATH_TRAVERSAL_DETECTED',
          `Forbidden path traversal or absolute escape in allowedRelativePaths: "${rel}".`
        );
      }
    }
  }

  /**
   * Validates deployment candidate freshness, fingerprint, and expiration.
   * Xác thực độ tươi mới, vân tay và thời hạn của ứng viên triển khai.
   */
  public validateCandidate(candidate: DeploymentCandidate): void {
    const now = Date.now();

    if (!candidate.candidateId || candidate.candidateId.trim().length === 0) {
      throw new DeploymentError('STALE_CANDIDATE', 'Deployment candidateId cannot be empty.');
    }

    if (!candidate.candidateFingerprint || candidate.candidateFingerprint.trim().length === 0) {
      throw new DeploymentError('STALE_CANDIDATE', 'Deployment candidateFingerprint cannot be empty.');
    }

    if (now > candidate.expiresAt) {
      throw new DeploymentError(
        'STALE_CANDIDATE',
        `Deployment candidate "${candidate.candidateId}" has expired at ${candidate.expiresAt} (current: ${now}).`
      );
    }

    this.validateTarget(candidate.target);
  }

  /**
   * Validates deployment request integrity, bindings, and emergency flags.
   * Xác thực tính toàn vẹn của yêu cầu triển khai, các ràng buộc và cờ khẩn cấp.
   */
  public validateRequest(
    request: DeploymentRequest,
    candidate: DeploymentCandidate,
    options?: {
      readonly isUserStopActive?: boolean;
      readonly isRevoked?: boolean;
    }
  ): void {
    // 1. Enforce emergency USER_STOP supremacy.
    // 1. Thực thi tính tối thượng của USER_STOP khẩn cấp.
    if (options?.isUserStopActive) {
      throw new DeploymentError(
        'USER_STOP_ACTIVE',
        'Operation rejected: USER_STOP is currently active across the system.'
      );
    }

    // 2. Enforce REVOCATION supremacy.
    // 2. Thực thi tính tối thượng của THU HỒI QUYỀN.
    if (options?.isRevoked) {
      throw new DeploymentError(
        'REVOCATION_ACTIVE',
        'Operation rejected: REVOCATION is active for this context.'
      );
    }

    // 3. Enforce candidate binding integrity.
    // 3. Thực thi tính toàn vẹn của ràng buộc ứng viên.
    if (request.candidateId !== candidate.candidateId) {
      throw new DeploymentError(
        'STALE_CANDIDATE',
        `Request candidateId "${request.candidateId}" does not match candidate "${candidate.candidateId}".`
      );
    }

    // 4. Validate candidate freshness & scope.
    // 4. Xác thực độ tươi mới & phạm vi của ứng viên.
    this.validateCandidate(candidate);

    // 5. Enforce task, agent, delegation, capability lease, and session bindings.
    // 5. Thực thi các ràng buộc nhiệm vụ, tác nhân, ủy quyền, hợp đồng năng lực và phiên.
    if (!request.taskId || request.taskId.trim().length === 0) {
      throw new DeploymentError('UNAUTHORIZED_TARGET', 'DeploymentRequest taskId cannot be empty.');
    }
    if (!request.operatorId || request.operatorId.trim().length === 0) {
      throw new DeploymentError('UNAUTHORIZED_TARGET', 'DeploymentRequest operatorId cannot be empty.');
    }
    if (!request.sessionId || request.sessionId.trim().length === 0) {
      throw new DeploymentError('UNAUTHORIZED_TARGET', 'DeploymentRequest sessionId cannot be empty.');
    }
    if (!request.delegationId || request.delegationId.trim().length === 0) {
      throw new DeploymentError('UNAUTHORIZED_TARGET', 'DeploymentRequest delegationId cannot be empty.');
    }
    if (!request.capabilityLeaseId || request.capabilityLeaseId.trim().length === 0) {
      throw new DeploymentError('UNAUTHORIZED_TARGET', 'DeploymentRequest capabilityLeaseId cannot be empty.');
    }

    // 6. Validate target match.
    // 6. Xác thực sự khớp nối mục tiêu.
    if (request.targetId !== candidate.target.targetId) {
      throw new DeploymentError(
        'UNAUTHORIZED_TARGET',
        `Request targetId "${request.targetId}" does not match candidate target "${candidate.target.targetId}".`
      );
    }

    // 7. Validate initial ring and target ring progression order.
    // 7. Xác thực vòng ban đầu và thứ tự tiến triển vòng mục tiêu.
    this.validateRingProgression(request.initialRing, request.targetRing);
  }

  /**
   * Validates that ring progression follows the deterministic rollout ring order without illegal skips.
   * Xác thực rằng tiến trình vòng tuân theo thứ tự vòng triển khai xác định mà không nhảy cóc trái phép.
   */
  public validateRingProgression(currentRing: RolloutRingLevel, nextRing: RolloutRingLevel): void {
    const currentIdx = ROLLOUT_RING_ORDER.indexOf(currentRing);
    const nextIdx = ROLLOUT_RING_ORDER.indexOf(nextRing);

    if (currentIdx === -1 || nextIdx === -1) {
      throw new DeploymentError(
        'UNAUTHORIZED_RING_TRANSITION',
        `Invalid ring levels: current="${currentRing}", next="${nextRing}".`
      );
    }

    if (nextIdx < currentIdx) {
      // Demotions / rollbacks are allowed only via explicit rollback flow.
      // Việc hạ cấp / hoàn nguyên chỉ được phép thông qua luồng hoàn nguyên rõ ràng.
      throw new DeploymentError(
        'UNAUTHORIZED_RING_TRANSITION',
        `Cannot demote ring progression from "${currentRing}" to "${nextRing}" via standard rollout progression.`
      );
    }

    if (nextIdx - currentIdx > 1) {
      throw new DeploymentError(
        'UNAUTHORIZED_RING_TRANSITION',
        `Cannot skip rollout rings: transition from "${currentRing}" to "${nextRing}" violates deterministic ring order.`
      );
    }
  }
}
