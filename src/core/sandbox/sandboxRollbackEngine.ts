// src/core/sandbox/sandboxRollbackEngine.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - Rollback MUST respect USER_STOP, REVOCATION, SESSION_ISOLATION, and PROTECTED_WORKSPACE_GUARD.
// - Rollback MUST NOT touch files outside the authorized sandbox root.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  type SandboxDescriptor,
  type SandboxManifest,
  type SandboxRollback,
  SandboxError,
} from './sandboxTypes.js';
import { SandboxPathGuard } from './sandboxPathGuard.js';
import { SandboxFilesystemEngine, type FileOperationContext } from './sandboxFilesystemEngine.js';
import { SandboxPolicyEngine } from './sandboxPolicyEngine.js';

export class SandboxRollbackEngine {
  constructor(
    private readonly fsEngine: SandboxFilesystemEngine,
    private readonly policyEngine: SandboxPolicyEngine
  ) {}

  /**
   * Rolls back all modifications in a sandbox to restore state or discard uncommitted changes.
   * Hoàn tác tất cả các sửa đổi trong một sandbox để khôi phục trạng thái hoặc hủy bỏ các thay đổi chưa commit.
   */
  public rollbackAll(
    sandbox: SandboxDescriptor,
    context: FileOperationContext,
    reason: string = 'Governed rollback requested'
  ): SandboxRollback {
    // 1. Enforce USER_STOP supremacy.
    // 1. Thực thi tính tối thượng của USER_STOP.
    if (this.policyEngine.isUserStopped() || sandbox.isStopped) {
      throw new SandboxError('USER_STOP_ACTIVE', 'Cannot perform rollback: USER_STOP is active.');
    }

    // 2. Enforce session isolation.
    // 2. Thực thi cô lập phiên.
    if (context.sessionId !== sandbox.binding.sessionId) {
      throw new SandboxError(
        'CROSS_SESSION_SANDBOX_REJECTED',
        `Cannot rollback sandbox across sessions: "${context.sessionId}" != "${sandbox.binding.sessionId}".`
      );
    }

    // 3. Assert sandbox root containment.
    // 3. Khẳng định tính bao chứa của thư mục gốc sandbox.
    SandboxPathGuard.assertNotProtectedWorkspace(sandbox.rootPath);

    // 4. Retrieve staged changes.
    // 4. Lấy danh sách các thay đổi tạm thời đã theo dõi.
    const staged = this.fsEngine.getStagedChanges(sandbox.id);
    let restoredCount = 0;
    let removedCount = 0;

    for (const [relPath, entry] of staged.entries()) {
      const { absolutePath: absPath } = SandboxPathGuard.resolveAndAssertContainedPath(
        sandbox.rootPath,
        relPath
      );

      if (entry.originalContent !== undefined) {
        // File was modified or deleted: restore original content.
        // Tệp đã bị sửa đổi hoặc bị xóa: khôi phục nội dung ban đầu.
        const parentDir = path.dirname(absPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(absPath, entry.originalContent, 'utf8');
        restoredCount++;
      } else {
        // File was newly created: remove it to revert to initial clean state.
        // Tệp mới được tạo thêm: xóa bỏ để hoàn nguyên về trạng thái ban đầu.
        if (fs.existsSync(absPath)) {
          fs.unlinkSync(absPath);
          removedCount++;
        }
      }
    }

    // 5. Clear staging state for the sandbox.
    // 5. Xóa trạng thái staging của sandbox.
    this.fsEngine.clearStaging(sandbox.id);

    const rollbackId = `rb_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    return {
      rollbackId,
      sandboxId: sandbox.id,
      rolledBackAt: Date.now(),
      restoredFilesCount: restoredCount,
      removedFilesCount: removedCount,
      reason,
      rolledBackBy: context.agentId,
    };
  }

  /**
   * Reverts a single file to its previous content.
   * Hoàn tác một tệp đơn lẻ về nội dung trước đó của nó.
   */
  public rollbackFile(
    sandbox: SandboxDescriptor,
    relativePath: string,
    originalContent: string | undefined,
    context: FileOperationContext
  ): void {
    if (this.policyEngine.isUserStopped() || sandbox.isStopped) {
      throw new SandboxError('USER_STOP_ACTIVE', 'Cannot perform rollback: USER_STOP is active.');
    }

    if (context.sessionId !== sandbox.binding.sessionId) {
      throw new SandboxError('CROSS_SESSION_SANDBOX_REJECTED', 'Cross-session rollback rejected.');
    }

    const { absolutePath: absPath } = SandboxPathGuard.resolveAndAssertContainedPath(
      sandbox.rootPath,
      relativePath
    );

    if (originalContent !== undefined) {
      const parentDir = path.dirname(absPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(absPath, originalContent, 'utf8');
    } else {
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath);
      }
    }
  }
}
