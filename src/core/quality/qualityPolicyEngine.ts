// src/core/quality/qualityPolicyEngine.ts
// BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
//
// Policy engine validating command scope, sandbox binding, delegation, and USER_STOP supremacy.
// Động cơ chính sách xác thực phạm vi lệnh, liên kết sandbox, ủy quyền và quyền tối cao của USER_STOP.
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - COMMAND_SCOPE <= SANDBOX_SCOPE
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import path from 'node:path';
import {
  type CommandExecutionContext,
  type GovernedQualityCommand,
  QualityError,
  QualityErrorCode,
} from './qualityTypes.js';
import type { SandboxDescriptor } from '../sandbox/sandboxTypes.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';
import type { DelegationRecord, CapabilityLease } from '../delegation/delegationTypes.js';

export class QualityPolicyEngine {
  /**
   * Asserts that a target path does not target or traverse into the protected workspace C:\BOW\shopofbow.
   * Khẳng định rằng đường dẫn mục tiêu không nhắm tới hoặc duyệt vào không gian làm việc được bảo vệ C:\BOW\shopofbow.
   */
  public static assertNotProtectedWorkspace(targetPath: string): void {
    const normalized = path.normalize(targetPath).toLowerCase();
    if (normalized === 'c:\\bow\\shopofbow' || normalized.startsWith('c:\\bow\\shopofbow\\')) {
      throw new QualityError(
        QualityErrorCode.PROTECTED_WORKSPACE_VIOLATION,
        `Operation targets protected workspace C:\\BOW\\shopofbow. Execution denied.`
      );
    }
  }

  /**
   * Validates that an in-sandbox command request satisfies all governance constraints.
   * Xác thực rằng yêu cầu lệnh trong sandbox thỏa mãn tất cả các ràng buộc quản trị.
   */
  public static validateCommandExecution(
    command: GovernedQualityCommand,
    context: CommandExecutionContext,
    sandbox: SandboxDescriptor,
    options?: {
      readonly delegation?: DelegationRecord;
      readonly capabilityLease?: CapabilityLease;
      readonly isUserStopped?: boolean;
      readonly isRevoked?: boolean;
    }
  ): void {
    // 1. Emergency USER_STOP Supremacy
    // 1. Quyền tối cao của lệnh dừng khẩn cấp USER_STOP
    if (options?.isUserStopped || sandbox.isStopped) {
      throw new QualityError(
        QualityErrorCode.USER_STOP_ACTIVE,
        `Command "${command.commandId}" rejected: USER_STOP is currently active.`
      );
    }

    // 2. Revocation Supremacy
    // 2. Quyền tối cao của việc thu hồi (REVOCATION)
    if (options?.isRevoked || sandbox.state === 'REVOKED') {
      throw new QualityError(
        QualityErrorCode.REVOCATION_ACTIVE,
        `Command "${command.commandId}" rejected: Execution context or sandbox has been revoked.`
      );
    }

    // 3. Protected Workspace Isolation Check
    // 3. Kiểm tra cô lập không gian làm việc được bảo vệ
    QualityPolicyEngine.assertNotProtectedWorkspace(context.projectRoot);
    QualityPolicyEngine.assertNotProtectedWorkspace(sandbox.rootPath);

    // 4. Sandbox Path Guard Validation
    // 4. Xác thực bảo vệ đường dẫn sandbox
    SandboxPathGuard.assertNotProtectedWorkspace(context.projectRoot);

    // 5. Session Binding Validation
    // 5. Xác thực liên kết phiên làm việc
    if (context.sessionId !== sandbox.binding.sessionId) {
      throw new QualityError(
        QualityErrorCode.SESSION_MISMATCH,
        `Context sessionId "${context.sessionId}" does not match sandbox sessionId "${sandbox.binding.sessionId}".`
      );
    }

    // 6. Task Binding Validation
    // 6. Xác thực liên kết tác vụ
    if (context.taskId !== sandbox.binding.taskId) {
      throw new QualityError(
        QualityErrorCode.TASK_MISMATCH,
        `Context taskId "${context.taskId}" does not match sandbox taskId "${sandbox.binding.taskId}".`
      );
    }

    // 7. Delegation Validity Check
    // 7. Kiểm tra tính hợp lệ của hợp đồng ủy quyền
    if (options?.delegation) {
      const now = Date.now();
      if (options.delegation.revocationState?.isRevoked || options.delegation.status === 'REVOKED') {
        throw new QualityError(
          QualityErrorCode.REVOCATION_ACTIVE,
          `Delegation "${options.delegation.delegationId}" has been revoked.`
        );
      }
      if (options.delegation.expiresAt <= now) {
        throw new QualityError(
          QualityErrorCode.DELEGATION_INVALID,
          `Delegation "${options.delegation.delegationId}" has expired.`
        );
      }
    }

    // 8. Capability Lease Validity Check
    // 8. Kiểm tra tính hợp lệ của hợp đồng thuê năng lực
    if (options?.capabilityLease) {
      const now = Date.now();
      if (options.capabilityLease.revokedAt || options.capabilityLease.status === 'REVOKED') {
        throw new QualityError(
          QualityErrorCode.REVOCATION_ACTIVE,
          `Capability lease "${options.capabilityLease.leaseId}" has been revoked.`
        );
      }
      if (options.capabilityLease.expiresAt <= now) {
        throw new QualityError(
          QualityErrorCode.CAPABILITY_LEASE_INVALID,
          `Capability lease "${options.capabilityLease.leaseId}" has expired.`
        );
      }
    }
  }
}
