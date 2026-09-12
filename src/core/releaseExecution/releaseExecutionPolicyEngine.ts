// src/core/releaseExecution/releaseExecutionPolicyEngine.ts
// BOWCON V4.0 — MS-1.3.51: GOVERNED RELEASE EXECUTION & AUTHORIZED DEPLOYMENT BOUNDARY
//
// Fail-closed policy validation engine for governed release execution.
// Động cơ xác thực chính sách fail-closed cho thực thi phát hành có quản trị.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
// - ZERO SHELL EXECUTION.
// - RELEASE_TARGET <= AUTHORIZED_PROJECT_SCOPE.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import path from 'node:path';
import {
  type ReleaseExecutionRequest,
  type ReleaseExecutionTarget,
  ReleaseExecutionError,
} from './releaseExecutionTypes.js';
import type { ReleaseCandidate, ReleaseVerificationRecord } from '../release/releaseTypes.js';

export class ReleaseExecutionPolicyEngine {
  /**
   * Absolute canonical path for the protected workspace.
   * Đường dẫn tuyệt đối chuẩn tắc cho không gian làm việc được bảo vệ.
   */
  private static readonly PROTECTED_WORKSPACE_NORMALIZED = path.normalize('C:/BOW/shopofbow').toLowerCase();

  /**
   * Asserts that a target path does not touch or traverse into C:\BOW\shopofbow.
   * Khẳng định rằng đường dẫn mục tiêu không chạm vào hoặc đi vào C:\BOW\shopofbow.
   */
  public static assertNotProtectedWorkspace(targetPath: string): void {
    const normalized = path.normalize(path.resolve(targetPath)).toLowerCase();
    if (
      normalized === ReleaseExecutionPolicyEngine.PROTECTED_WORKSPACE_NORMALIZED ||
      normalized.startsWith(ReleaseExecutionPolicyEngine.PROTECTED_WORKSPACE_NORMALIZED + path.sep)
    ) {
      throw new ReleaseExecutionError(
        'PROTECTED_WORKSPACE_VIOLATION',
        `Release target cannot be inside protected workspace "${targetPath}". Isolation invariant strictly enforced.`
      );
    }
  }

  /**
   * Asserts that a target path has no path traversal elements.
   * Khẳng định rằng đường dẫn mục tiêu không có phần tử duyệt đường dẫn nguy hiểm.
   */
  public static assertSafePath(targetPath: string): void {
    if (!targetPath || typeof targetPath !== 'string') {
      throw new ReleaseExecutionError('PATH_TRAVERSAL_DETECTED', 'Target path must be a non-empty string.');
    }

    // Check for null bytes and UNC paths.
    // Kiểm tra ký tự null byte và đường dẫn UNC.
    if (targetPath.includes('\0') || targetPath.startsWith('\\\\') || targetPath.startsWith('//')) {
      throw new ReleaseExecutionError(
        'PATH_TRAVERSAL_DETECTED',
        `Unsafe path components detected in "${targetPath}".`
      );
    }

    const resolved = path.resolve(targetPath);
    const normalized = path.normalize(resolved);

    // Reject traversal patterns.
    // Từ chối các mẫu duyệt đường dẫn.
    if (targetPath.includes('..')) {
      const parts = targetPath.split(/[/\\]/);
      if (parts.includes('..')) {
        throw new ReleaseExecutionError(
          'PATH_TRAVERSAL_DETECTED',
          `Path traversal ".." detected in target "${targetPath}".`
        );
      }
    }
  }

  /**
   * Asserts that USER_STOP is not active.
   * Khẳng định rằng USER_STOP không hoạt động.
   */
  public static assertNotUserStopped(isUserStopActive?: boolean): void {
    if (isUserStopActive) {
      throw new ReleaseExecutionError(
        'USER_STOP_ACTIVE',
        'Release execution halted: USER_STOP is currently active. User supremacy enforced.'
      );
    }
  }

  /**
   * Asserts that capability lease or delegation is not revoked.
   * Khẳng định rằng hợp đồng thuê năng lực hoặc ủy quyền chưa bị thu hồi.
   */
  public static assertNotRevoked(isRevoked?: boolean): void {
    if (isRevoked) {
      throw new ReleaseExecutionError(
        'REVOCATION_ACTIVE',
        'Release execution halted: Authority lease or delegation has been revoked.'
      );
    }
  }

  /**
   * Validates a release candidate before execution scheduling.
   * Xác thực ứng viên phát hành trước khi lên lịch thực thi.
   */
  public static validateCandidate(candidate: ReleaseCandidate): void {
    const now = Date.now();

    if (now > candidate.expiresAt) {
      throw new ReleaseExecutionError(
        'INVALID_CANDIDATE',
        `Release candidate "${candidate.candidateId}" has expired at ${new Date(candidate.expiresAt).toISOString()}.`
      );
    }

    if (
      candidate.state === 'FAILED' ||
      candidate.state === 'BLOCKED' ||
      candidate.state === 'STALE' ||
      candidate.state === 'REVOKED' ||
      candidate.state === 'REJECTED'
    ) {
      throw new ReleaseExecutionError(
        'INVALID_CANDIDATE',
        `Release candidate "${candidate.candidateId}" is in terminal failure state "${candidate.state}".`
      );
    }
  }

  /**
   * Validates that the verification record is in PASS state.
   * Xác thực rằng bản ghi xác minh ở trạng thái PASS.
   */
  public static validateVerificationRecord(
    record: ReleaseVerificationRecord,
    candidate: ReleaseCandidate
  ): void {
    if (record.candidateId !== candidate.candidateId) {
      throw new ReleaseExecutionError(
        'CANDIDATE_NOT_VERIFIED',
        `Verification record candidateId "${record.candidateId}" does not match candidate "${candidate.candidateId}".`
      );
    }

    if (record.verificationState !== 'PASS') {
      throw new ReleaseExecutionError(
        'CANDIDATE_NOT_VERIFIED',
        `Release candidate "${candidate.candidateId}" has not achieved PASS verification (current: "${record.verificationState}").`
      );
    }

    if (record.contradictions.length > 0) {
      throw new ReleaseExecutionError(
        'CONTRADICTION_DETECTED',
        `Release verification record contains unresolved multi-agent contradictions.`
      );
    }
  }

  /**
   * Validates the execution request target against policy constraints.
   * Xác thực mục tiêu yêu cầu thực thi so với các ràng buộc chính sách.
   */
  public static validateTarget(target: ReleaseExecutionTarget): void {
    ReleaseExecutionPolicyEngine.assertSafePath(target.projectRoot);
    ReleaseExecutionPolicyEngine.assertNotProtectedWorkspace(target.projectRoot);

    if (!target.targetId || target.targetId.trim() === '') {
      throw new ReleaseExecutionError('UNAUTHORIZED_TARGET', 'Target must have a non-empty targetId.');
    }
  }

  /**
   * Comprehensive pre-execution policy gate check.
   * Kiểm tra cổng chính sách toàn diện trước khi thực thi.
   */
  public static validateExecutionRequest(
    request: ReleaseExecutionRequest,
    candidate: ReleaseCandidate,
    verification: ReleaseVerificationRecord,
    options?: {
      isUserStopActive?: boolean;
      isRevoked?: boolean;
    }
  ): void {
    ReleaseExecutionPolicyEngine.assertNotUserStopped(options?.isUserStopActive);
    ReleaseExecutionPolicyEngine.assertNotRevoked(options?.isRevoked);

    if (request.candidateId !== candidate.candidateId) {
      throw new ReleaseExecutionError(
        'INVALID_CANDIDATE',
        `Request candidateId "${request.candidateId}" does not match provided candidate "${candidate.candidateId}".`
      );
    }

    if (request.verificationId !== verification.verificationId) {
      throw new ReleaseExecutionError(
        'STALE_VERIFICATION_PACKET',
        `Request verificationId "${request.verificationId}" does not match provided verification "${verification.verificationId}".`
      );
    }

    // Validate identity bindings.
    // Xác thực các ràng buộc định danh.
    if (!request.operatorId || !request.sessionId || !request.taskId || !request.delegationId || !request.capabilityLeaseId) {
      throw new ReleaseExecutionError(
        'MISSING_REQUIRED_BINDING',
        'Release execution request is missing mandatory governance identity bindings.'
      );
    }

    // Cross-identity check with candidate.
    // Kiểm tra chéo định danh với ứng viên.
    if (request.sessionId !== candidate.sessionId) {
      throw new ReleaseExecutionError(
        'INVALID_CANDIDATE',
        `Session mismatch: request sessionId "${request.sessionId}" != candidate sessionId "${candidate.sessionId}".`
      );
    }

    if (request.taskId !== candidate.taskId) {
      throw new ReleaseExecutionError(
        'INVALID_CANDIDATE',
        `Task mismatch: request taskId "${request.taskId}" != candidate taskId "${candidate.taskId}".`
      );
    }

    ReleaseExecutionPolicyEngine.validateCandidate(candidate);
    ReleaseExecutionPolicyEngine.validateVerificationRecord(verification, candidate);
    ReleaseExecutionPolicyEngine.validateTarget(request.target);
  }
}
