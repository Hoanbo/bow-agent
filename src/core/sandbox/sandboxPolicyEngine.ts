// src/core/sandbox/sandboxPolicyEngine.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - CAPABILITY != AUTHORIZATION
// - SESSION_MATCHING == STRICT
// - CROSS_SESSION ACCESS = FAIL CLOSED
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import path from 'node:path';
import {
  type SandboxDescriptor,
  type SandboxOperationType,
  type SandboxViolation,
  type SandboxFileOperation,
  SandboxError,
} from './sandboxTypes.js';
import { SandboxPathGuard } from './sandboxPathGuard.js';
import type { CapabilityLeaseManager } from '../delegation/capabilityLeaseManager.js';
import type { DelegationGovernanceRuntime } from '../delegation/delegationGovernanceRuntime.js';

export interface EvaluateOperationInput {
  readonly sandbox: SandboxDescriptor;
  readonly operationType: SandboxOperationType;
  readonly relativePath: string;
  readonly targetPath?: string;
  readonly sessionId: string;
  readonly taskId: string;
  readonly agentId: string;
  readonly deviceId: string;
  readonly currentFileCount?: number;
  readonly currentSizeBytes?: number;
  readonly incomingPayloadSizeBytes?: number;
}

export class SandboxPolicyEngine {
  private _isUserStopped = false;
  private _userStopReason = '';
  private violations: SandboxViolation[] = [];

  constructor(
    private readonly delegationRuntime?: DelegationGovernanceRuntime,
    private readonly leaseManager?: CapabilityLeaseManager
  ) {}

  /**
   * Activates emergency USER_STOP, halting all sandbox policy permissions immediately.
   * Kích hoạt USER_STOP khẩn cấp, dừng ngay lập tức mọi quyền hạn chính sách sandbox.
   */
  public requestUserStop(reason: string): void {
    this._isUserStopped = true;
    this._userStopReason = reason;
  }

  /**
   * Resets USER_STOP only under authoritative Master Owner reset.
   * Đặt lại USER_STOP chỉ dưới sự thiết lập lại có thẩm quyền của Master Owner.
   */
  public resetUserStop(): void {
    this._isUserStopped = false;
    this._userStopReason = '';
  }

  /**
   * Returns whether emergency USER_STOP is active.
   * Trả về trạng thái liệu lệnh dừng khẩn cấp USER_STOP có đang hoạt động hay không.
   */
  public isUserStopped(): boolean {
    return this._isUserStopped;
  }

  /**
   * Returns all recorded policy and security violations.
   * Trả về tất cả các vi phạm chính sách và an ninh đã ghi nhận.
   */
  public getViolations(): readonly SandboxViolation[] {
    return [...this.violations];
  }

  /**
   * Records an explicit security or policy violation.
   * Ghi lại một vi phạm an ninh hoặc chính sách rõ ràng.
   */
  private recordViolation(
    code: any,
    message: string,
    sessionId: string,
    sandboxId?: any,
    agentId?: string,
    filePath?: string
  ): void {
    const v: SandboxViolation = {
      violationId: `violation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      code,
      message,
      path: filePath,
      timestamp: Date.now(),
      sessionId,
      sandboxId,
      agentId,
    };
    this.violations.push(v);
  }

  /**
   * Validates whether a file operation is permitted within a governed sandbox.
   * Fails closed if any governance, session, capability, path, or policy boundary is breached.
   *
   * Xác thực xem thao tác tệp có được phép trong sandbox được quản trị hay không.
   * Đóng thất bại nếu bất kỳ ranh giới quản trị, phiên, năng lực, đường dẫn hoặc chính sách nào bị vi phạm.
   */
  public validateOperation(input: EvaluateOperationInput): void {
    const { sandbox, operationType, relativePath, sessionId, taskId, agentId, deviceId } = input;

    // 1. Enforce absolute USER_STOP supremacy.
    // 1. Thực thi tính tối thượng tuyệt đối của USER_STOP.
    if (this._isUserStopped || sandbox.isStopped) {
      this.recordViolation(
        'USER_STOP_ACTIVE',
        `Operation rejected: USER_STOP is active (${this._userStopReason || 'Emergency Stop'}).`,
        sessionId,
        sandbox.id,
        agentId,
        relativePath
      );
      throw new SandboxError(
        'USER_STOP_ACTIVE',
        `USER_STOP is active. Operation ${operationType} on "${relativePath}" is rejected.`
      );
    }

    // 2. Enforce strict session isolation.
    // 2. Thực thi cô lập phiên nghiêm ngặt.
    if (sessionId !== sandbox.binding.sessionId) {
      this.recordViolation(
        'CROSS_SESSION_SANDBOX_REJECTED',
        `Session mismatch: request session "${sessionId}" does not match sandbox session "${sandbox.binding.sessionId}".`,
        sessionId,
        sandbox.id,
        agentId,
        relativePath
      );
      throw new SandboxError(
        'CROSS_SESSION_SANDBOX_REJECTED',
        `Cross-session sandbox access rejected: "${sessionId}" != "${sandbox.binding.sessionId}".`
      );
    }

    // 3. Enforce task binding.
    // 3. Thực thi ràng buộc tác vụ.
    if (taskId !== sandbox.binding.taskId) {
      this.recordViolation(
        'POLICY_VIOLATION',
        `Task mismatch: request task "${taskId}" does not match sandbox task "${sandbox.binding.taskId}".`,
        sessionId,
        sandbox.id,
        agentId,
        relativePath
      );
      throw new SandboxError(
        'POLICY_VIOLATION',
        `Task mismatch: "${taskId}" is not authorized for sandbox "${sandbox.id}".`
      );
    }

    // 4. Enforce agent identity separation and binding.
    // 4. Thực thi phân tách và ràng buộc định danh tác nhân.
    if (agentId !== sandbox.binding.agentId) {
      this.recordViolation(
        'POLICY_VIOLATION',
        `Agent mismatch: request agent "${agentId}" does not match sandbox agent "${sandbox.binding.agentId}".`,
        sessionId,
        sandbox.id,
        agentId,
        relativePath
      );
      throw new SandboxError(
        'POLICY_VIOLATION',
        `Agent "${agentId}" is not authorized to operate sandbox "${sandbox.id}".`
      );
    }

    // 5. Enforce device binding.
    // 5. Thực thi ràng buộc thiết bị.
    if (deviceId !== sandbox.binding.deviceId) {
      this.recordViolation(
        'POLICY_VIOLATION',
        `Device mismatch: request device "${deviceId}" does not match sandbox device "${sandbox.binding.deviceId}".`,
        sessionId,
        sandbox.id,
        agentId,
        relativePath
      );
      throw new SandboxError(
        'POLICY_VIOLATION',
        `Device "${deviceId}" is not authorized for sandbox "${sandbox.id}".`
      );
    }

    // 6. Enforce sandbox revocation and expiration.
    // 6. Thực thi thu hồi và hết hạn sandbox.
    if (sandbox.isRevoked || sandbox.state === 'REVOKED') {
      this.recordViolation(
        'REVOKED_DELEGATION',
        `Operation rejected: sandbox "${sandbox.id}" has been revoked.`,
        sessionId,
        sandbox.id,
        agentId,
        relativePath
      );
      throw new SandboxError('REVOKED_DELEGATION', `Sandbox "${sandbox.id}" is revoked.`);
    }

    const now = Date.now();
    if (now > sandbox.expiresAt || sandbox.state === 'EXPIRED') {
      this.recordViolation(
        'SANDBOX_EXPIRED',
        `Operation rejected: sandbox "${sandbox.id}" expired at ${new Date(sandbox.expiresAt).toISOString()}.`,
        sessionId,
        sandbox.id,
        agentId,
        relativePath
      );
      throw new SandboxError('SANDBOX_EXPIRED', `Sandbox "${sandbox.id}" has expired.`);
    }

    // 7. Enforce sandbox active operational state.
    // 7. Thực thi trạng thái hoạt động của sandbox.
    const validStates = ['INITIALIZED', 'ACTIVE', 'MODIFICATION_PENDING', 'VALIDATING'];
    if (!validStates.includes(sandbox.state)) {
      this.recordViolation(
        'SANDBOX_NOT_ACTIVE',
        `Sandbox "${sandbox.id}" is in non-operational state: "${sandbox.state}".`,
        sessionId,
        sandbox.id,
        agentId,
        relativePath
      );
      throw new SandboxError(
        'SANDBOX_NOT_ACTIVE',
        `Cannot execute operation in sandbox state: "${sandbox.state}".`
      );
    }

    // 8. Validate underlying delegation status if DelegationGovernanceRuntime is attached.
    // 8. Xác thực trạng thái ủy quyền cơ bản nếu DelegationGovernanceRuntime được đính kèm.
    if (this.delegationRuntime) {
      const delegation = this.delegationRuntime.getDelegation(sandbox.binding.delegationId);
      if (!delegation) {
        throw new SandboxError('REVOKED_DELEGATION', `Underlying delegation "${sandbox.binding.delegationId}" not found.`);
      }
      if (delegation.status === 'REVOKED') {
        throw new SandboxError('REVOKED_DELEGATION', `Underlying delegation "${delegation.delegationId}" is revoked.`);
      }
      if (delegation.status === 'EXPIRED' || (delegation.expiresAt && now > delegation.expiresAt)) {
        throw new SandboxError('EXPIRED_DELEGATION', `Underlying delegation "${delegation.delegationId}" is expired.`);
      }
    }

    // 9. Validate capability lease if CapabilityLeaseManager is attached.
    // 9. Xác thực hợp đồng thuê năng lực nếu CapabilityLeaseManager được đính kèm.
    if (this.leaseManager) {
      try {
        const lease = this.leaseManager.getLease(sandbox.binding.capabilityLeaseId);
        if (!lease) {
          throw new SandboxError('INVALID_CAPABILITY_LEASE', `Capability lease "${sandbox.binding.capabilityLeaseId}" not found.`);
        }
        this.leaseManager.validateLease(
          sandbox.binding.capabilityLeaseId,
          {
            sessionId,
            capabilityId: lease.capabilityId,
          }
        );
      } catch (err: any) {
        this.recordViolation(
          'INVALID_CAPABILITY_LEASE',
          `Capability lease validation failed: ${err.message}`,
          sessionId,
          sandbox.id,
          agentId,
          relativePath
        );
        throw new SandboxError('INVALID_CAPABILITY_LEASE', `Capability lease invalid: ${err.message}`);
      }
    }

    // 10. Enforce operation category whitelist.
    // 10. Thực thi danh sách trắng các loại thao tác được phép.
    if (!sandbox.scope.allowedOperations.includes(operationType)) {
      this.recordViolation(
        'POLICY_VIOLATION',
        `Operation "${operationType}" is not permitted in sandbox scope.`,
        sessionId,
        sandbox.id,
        agentId,
        relativePath
      );
      throw new SandboxError(
        'POLICY_VIOLATION',
        `Operation type "${operationType}" is not permitted by sandbox scope.`
      );
    }

    // 11. Assert path does not touch protected workspace C:\BOW\shopofbow.
    // 11. Khẳng định đường dẫn không chạm tới không gian làm việc được bảo vệ C:\BOW\shopofbow.
    SandboxPathGuard.assertNotProtectedWorkspace(relativePath);
    if (input.targetPath) {
      SandboxPathGuard.assertNotProtectedWorkspace(input.targetPath);
    }

    // 12. Enforce allowed file extension policy if specified.
    // 12. Thực thi chính sách phần mở rộng tệp được phép nếu được chỉ định.
    if (sandbox.scope.allowedFileExtensions && sandbox.scope.allowedFileExtensions.length > 0) {
      const ext = path.extname(relativePath).toLowerCase();
      // Allow directory listing or stat without extension; for file mutations extension must be allowed.
      // Cho phép liệt kê thư mục hoặc stat không có phần mở rộng; với thay đổi tệp phần mở rộng phải được cho phép.
      if (operationType === 'CREATE' || operationType === 'UPDATE') {
        const isAllowedExt = sandbox.scope.allowedFileExtensions
          .map((e) => e.toLowerCase())
          .includes(ext);
        if (!isAllowedExt) {
          this.recordViolation(
            'POLICY_VIOLATION',
            `File extension "${ext}" is not permitted in sandbox scope.`,
            sessionId,
            sandbox.id,
            agentId,
            relativePath
          );
          throw new SandboxError(
            'POLICY_VIOLATION',
            `File extension "${ext}" is forbidden by sandbox scope.`
          );
        }
      }
    }

    // 13. Enforce denied file patterns (e.g. secret files, credentials, .env).
    // 13. Thực thi các mẫu tệp bị từ chối (ví dụ tệp bí mật, thông tin xác thực, .env).
    if (sandbox.scope.deniedFilePatterns && sandbox.scope.deniedFilePatterns.length > 0) {
      const lowerRel = relativePath.toLowerCase();
      for (const pattern of sandbox.scope.deniedFilePatterns) {
        if (lowerRel.includes(pattern.toLowerCase())) {
          this.recordViolation(
            'POLICY_VIOLATION',
            `Path matches denied file pattern: "${pattern}".`,
            sessionId,
            sandbox.id,
            agentId,
            relativePath
          );
          throw new SandboxError(
            'POLICY_VIOLATION',
            `File path "${relativePath}" matches denied pattern "${pattern}".`
          );
        }
      }
    }

    // 14. Enforce resource limits (max file count and max workspace size).
    // 14. Thực thi giới hạn tài nguyên (số lượng tệp tối đa và dung lượng không gian làm việc tối đa).
    if (operationType === 'CREATE' && sandbox.scope.maxFileCount !== undefined) {
      if ((input.currentFileCount ?? 0) >= sandbox.scope.maxFileCount) {
        throw new SandboxError(
          'POLICY_VIOLATION',
          `Sandbox file count limit reached: ${sandbox.scope.maxFileCount} files.`
        );
      }
    }

    if (
      (operationType === 'CREATE' || operationType === 'UPDATE') &&
      sandbox.scope.maxWorkspaceSizeBytes !== undefined
    ) {
      const totalSize = (input.currentSizeBytes ?? 0) + (input.incomingPayloadSizeBytes ?? 0);
      if (totalSize > sandbox.scope.maxWorkspaceSizeBytes) {
        throw new SandboxError(
          'POLICY_VIOLATION',
          `Sandbox workspace size limit exceeded: ${totalSize} > ${sandbox.scope.maxWorkspaceSizeBytes} bytes.`
        );
      }
    }
  }

  /**
   * Clears violation history.
   * Xóa lịch sử vi phạm.
   */
  public clear(): void {
    this.violations = [];
    this._isUserStopped = false;
    this._userStopReason = '';
  }
}
