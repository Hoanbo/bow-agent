// src/core/sandbox/worktreeIsolationEngine.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - Each worktree MUST belong to exactly one sandbox, session, and task group.
// - WORKTREE_SCOPE_CANNOT_EXCEED_SANDBOX: Worktree cannot expand parent sandbox scope.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  type SandboxId,
  type WorktreeId,
  type SandboxDescriptor,
  type SandboxScope,
  createWorktreeId,
  SandboxError,
} from './sandboxTypes.js';
import { SandboxPathGuard } from './sandboxPathGuard.js';

export interface WorktreeDescriptor {
  readonly worktreeId: WorktreeId;
  readonly sandboxId: SandboxId;
  readonly sessionId: string;
  readonly taskId: string;
  readonly taskGroupId?: string;
  readonly worktreeName: string;
  readonly rootPath: string;
  readonly scope: SandboxScope;
  readonly createdAt: number;
  readonly expiresAt: number;
}

export interface CreateWorktreeInput {
  readonly sandbox: SandboxDescriptor;
  readonly worktreeName: string;
  readonly customScope?: Partial<SandboxScope>;
  readonly taskGroupId?: string;
}

export class WorktreeIsolationEngine {
  private worktrees = new Map<WorktreeId, WorktreeDescriptor>();

  /**
   * Asserts that a child worktree scope does not exceed parent sandbox boundaries.
   * Khẳng định rằng phạm vi của worktree con không vượt quá ranh giới của sandbox cha.
   */
  private validateScopeContainment(parentScope: SandboxScope, childScope: SandboxScope): void {
    // 1. Validate operations subset.
    // 1. Xác thực tập con các thao tác.
    for (const op of childScope.allowedOperations) {
      if (!parentScope.allowedOperations.includes(op)) {
        throw new SandboxError(
          'WORKTREE_SCOPE_CANNOT_EXCEED_SANDBOX',
          `Child worktree requested operation "${op}" not permitted in parent sandbox scope.`
        );
      }
    }

    // 2. Validate maxFileCount containment.
    // 2. Xác thực giới hạn số lượng tệp tối đa.
    if (parentScope.maxFileCount !== undefined) {
      if (childScope.maxFileCount === undefined || childScope.maxFileCount > parentScope.maxFileCount) {
        throw new SandboxError(
          'WORKTREE_SCOPE_CANNOT_EXCEED_SANDBOX',
          `Child worktree maxFileCount (${childScope.maxFileCount}) exceeds parent limit (${parentScope.maxFileCount}).`
        );
      }
    }

    // 3. Validate maxWorkspaceSizeBytes containment.
    // 3. Xác thực giới hạn dung lượng không gian làm việc tối đa.
    if (parentScope.maxWorkspaceSizeBytes !== undefined) {
      if (
        childScope.maxWorkspaceSizeBytes === undefined ||
        childScope.maxWorkspaceSizeBytes > parentScope.maxWorkspaceSizeBytes
      ) {
        throw new SandboxError(
          'WORKTREE_SCOPE_CANNOT_EXCEED_SANDBOX',
          `Child worktree maxWorkspaceSizeBytes exceeds parent sandbox limit.`
        );
      }
    }
  }

  /**
   * Creates an isolated project worktree strictly contained within a parent sandbox.
   * Tạo một worktree dự án cô lập được chứa hoàn toàn bên trong một sandbox cha.
   */
  public createWorktree(input: CreateWorktreeInput): WorktreeDescriptor {
    const { sandbox, worktreeName, customScope, taskGroupId } = input;

    // 1. Check sandbox operational state.
    // 1. Kiểm tra trạng thái hoạt động của sandbox.
    if (sandbox.state === 'REVOKED' || sandbox.isRevoked) {
      throw new SandboxError('REVOKED_DELEGATION', `Cannot create worktree: parent sandbox "${sandbox.id}" is revoked.`);
    }

    if (Date.now() > sandbox.expiresAt || sandbox.state === 'EXPIRED') {
      throw new SandboxError('SANDBOX_EXPIRED', `Cannot create worktree: parent sandbox "${sandbox.id}" has expired.`);
    }

    if (sandbox.isStopped) {
      throw new SandboxError('USER_STOP_ACTIVE', `Cannot create worktree: parent sandbox "${sandbox.id}" is stopped.`);
    }

    // 2. Normalize and check worktree name.
    // 2. Chuẩn hóa và kiểm tra tên worktree.
    if (!worktreeName || typeof worktreeName !== 'string' || worktreeName.trim() === '') {
      throw new SandboxError('POLICY_VIOLATION', 'Worktree name cannot be empty.');
    }

    // Worktree name cannot contain directory separators or traversal tokens.
    // Tên worktree không được chứa dấu phân tách thư mục hoặc mã duyệt ngược.
    if (worktreeName.includes('/') || worktreeName.includes('\\') || worktreeName.includes('..')) {
      throw new SandboxError('PATH_TRAVERSAL_REJECTED', `Invalid worktree name: "${worktreeName}"`);
    }

    // 3. Compute effective scope.
    // 3. Tính toán phạm vi hiệu lực.
    const effectiveScope: SandboxScope = {
      allowedProjectRoots: customScope?.allowedProjectRoots ?? [...sandbox.scope.allowedProjectRoots],
      allowedOperations: customScope?.allowedOperations ?? [...sandbox.scope.allowedOperations],
      maxFileCount: customScope?.maxFileCount ?? sandbox.scope.maxFileCount,
      maxWorkspaceSizeBytes: customScope?.maxWorkspaceSizeBytes ?? sandbox.scope.maxWorkspaceSizeBytes,
      allowedFileExtensions: customScope?.allowedFileExtensions ?? sandbox.scope.allowedFileExtensions,
      deniedFilePatterns: customScope?.deniedFilePatterns ?? sandbox.scope.deniedFilePatterns,
    };

    // 4. Enforce scope containment: child cannot expand parent scope.
    // 4. Thực thi bao chứa phạm vi: con không thể mở rộng phạm vi của cha.
    this.validateScopeContainment(sandbox.scope, effectiveScope);

    // 5. Establish worktree directory inside sandbox root.
    // 5. Thiết lập thư mục worktree bên trong thư mục gốc của sandbox.
    const relativeWorktreeDir = path.join('worktrees', worktreeName);
    const { absolutePath: worktreeAbs } = SandboxPathGuard.resolveAndAssertContainedPath(
      sandbox.rootPath,
      relativeWorktreeDir
    );

    if (!fs.existsSync(worktreeAbs)) {
      fs.mkdirSync(worktreeAbs, { recursive: true });
    }

    const rawId = `wt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const worktreeId = createWorktreeId(rawId);

    const descriptor: WorktreeDescriptor = {
      worktreeId,
      sandboxId: sandbox.id,
      sessionId: sandbox.binding.sessionId,
      taskId: sandbox.binding.taskId,
      taskGroupId: taskGroupId ?? sandbox.binding.taskGroupId,
      worktreeName,
      rootPath: worktreeAbs,
      scope: effectiveScope,
      createdAt: Date.now(),
      expiresAt: sandbox.expiresAt,
    };

    this.worktrees.set(worktreeId, descriptor);
    return descriptor;
  }

  /**
   * Retrieves a worktree descriptor by id.
   * Lấy bộ mô tả worktree theo định danh.
   */
  public getWorktree(worktreeId: WorktreeId): WorktreeDescriptor | undefined {
    return this.worktrees.get(worktreeId);
  }

  /**
   * Lists worktrees belonging to a specific sandbox.
   * Liệt kê các worktree thuộc về một sandbox cụ thể.
   */
  public listWorktrees(sandboxId: SandboxId): readonly WorktreeDescriptor[] {
    return Array.from(this.worktrees.values()).filter((w) => w.sandboxId === sandboxId);
  }

  /**
   * Clears in-memory worktrees.
   * Xóa danh sách worktree trong bộ nhớ.
   */
  public clear(): void {
    this.worktrees.clear();
  }
}
