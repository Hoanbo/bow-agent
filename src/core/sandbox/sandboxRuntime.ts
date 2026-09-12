// src/core/sandbox/sandboxRuntime.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - SANDBOX != AUTHORITY
// - WORKTREE != AUTHORITY
// - DIFF != AUTHORIZATION
// - VALIDATION != AUTHORIZATION
// - EVIDENCE != AUTHORITY
// - CAPABILITY != AUTHORIZATION
// - DELEGATION != EXECUTION
// - AGENT != MASTER_OWNER
// - DEVICE != MASTER_OWNER
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type SandboxId,
  type SandboxState,
  type SandboxDescriptor,
  type CreateSandboxInput,
  type SandboxFileOperation,
  type SandboxManifest,
  type SandboxDiff,
  type SandboxRollback,
  type SandboxExport,
  SandboxError,
} from './sandboxTypes.js';
import { SandboxPathGuard } from './sandboxPathGuard.js';
import { SandboxPolicyEngine } from './sandboxPolicyEngine.js';
import { GovernedSandboxManager } from './governedSandboxManager.js';
import { SandboxFilesystemEngine, type FileOperationContext } from './sandboxFilesystemEngine.js';
import { WorktreeIsolationEngine, type WorktreeDescriptor, type CreateWorktreeInput } from './worktreeIsolationEngine.js';
import { SandboxManifestEngine } from './sandboxManifestEngine.js';
import { SandboxDiffEngine } from './sandboxDiffEngine.js';
import { SandboxRollbackEngine } from './sandboxRollbackEngine.js';
import { SandboxReviewEngine, type SandboxReviewInput, type SandboxReviewRecord } from './sandboxReviewEngine.js';
import { SandboxExportEngine, type ExecuteExportInput } from './sandboxExportEngine.js';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import {
  globalMasterHumanAuthority,
} from '../authority/masterHumanAuthority.js';
import type { DelegationGovernanceRuntime } from '../delegation/delegationGovernanceRuntime.js';
import type { CapabilityLeaseManager } from '../delegation/capabilityLeaseManager.js';

export class SandboxRuntime {
  public readonly policyEngine: SandboxPolicyEngine;
  public readonly sandboxManager: GovernedSandboxManager;
  public readonly fsEngine: SandboxFilesystemEngine;
  public readonly worktreeEngine: WorktreeIsolationEngine;
  public readonly manifestEngine: SandboxManifestEngine;
  public readonly diffEngine: SandboxDiffEngine;
  public readonly rollbackEngine: SandboxRollbackEngine;
  public readonly reviewEngine: SandboxReviewEngine;
  public readonly exportEngine: SandboxExportEngine;

  private _isStopped = false;
  private _stopReason = '';

  constructor(
    private readonly auditLedger: AuditLedger = globalAuditLedger,
    delegationRuntime?: DelegationGovernanceRuntime,
    leaseManager?: CapabilityLeaseManager
  ) {
    this.policyEngine = new SandboxPolicyEngine(delegationRuntime, leaseManager);
    this.sandboxManager = new GovernedSandboxManager();
    this.fsEngine = new SandboxFilesystemEngine(this.policyEngine);
    this.worktreeEngine = new WorktreeIsolationEngine();
    this.manifestEngine = new SandboxManifestEngine(this.fsEngine);
    this.diffEngine = new SandboxDiffEngine();
    this.rollbackEngine = new SandboxRollbackEngine(this.fsEngine, this.policyEngine);
    this.reviewEngine = new SandboxReviewEngine();
    this.exportEngine = new SandboxExportEngine(this.auditLedger);
  }

  /**
   * Asserts that emergency USER_STOP is not active.
   * Khẳng định rằng lệnh dừng khẩn cấp USER_STOP không đang kích hoạt.
   */
  private assertNotStopped(opName: string): void {
    if (this._isStopped || globalMasterHumanAuthority.isUserStopActive) {
      throw new SandboxError(
        'USER_STOP_ACTIVE',
        `Operation "${opName}" rejected: USER_STOP is active (${this._stopReason || 'Emergency Stop'}).`
      );
    }
  }

  /**
   * Activates universal USER_STOP across all sandbox operations.
   * Kích hoạt USER_STOP toàn cục trên tất cả các thao tác sandbox.
   */
  public requestUserStop(reason: string): void {
    this._isStopped = true;
    this._stopReason = reason;
    this.policyEngine.requestUserStop(reason);
    this.sandboxManager.requestUserStop(reason);
    this.logAudit('requestUserStop', 'all_sandboxes', 'BLOCKED', { reason });
  }

  /**
   * Resets USER_STOP under Master Owner authority.
   * Thiết lập lại USER_STOP dưới quyền của Master Owner.
   */
  public resetUserStop(): void {
    this._isStopped = false;
    this._stopReason = '';
    this.policyEngine.resetUserStop();
    this.sandboxManager.resetUserStop();
    this.logAudit('resetUserStop', 'all_sandboxes', 'SUCCESS', {});
  }

  /**
   * Creates a new governed sandbox.
   * Tạo một sandbox mới được quản trị.
   */
  public createSandbox(input: CreateSandboxInput): SandboxDescriptor {
    this.assertNotStopped('createSandbox');
    const sb = this.sandboxManager.createSandbox(input);
    this.logAudit('createSandbox', sb.id, 'SUCCESS', {
      sessionId: input.sessionId,
      taskId: input.taskId,
      delegationId: input.delegationId,
    });
    return sb;
  }

  /**
   * Creates a file in a sandbox.
   * Tạo một tệp trong sandbox.
   */
  public createFile(
    sandboxId: SandboxId,
    relativePath: string,
    content: string,
    context: FileOperationContext
  ): SandboxFileOperation {
    this.assertNotStopped('createFile');
    const sb = this.getSandboxOrThrow(sandboxId);
    const op = this.fsEngine.createFile(sb, relativePath, content, context);
    this.logAudit('createFile', `${sandboxId}:${relativePath}`, 'SUCCESS', {
      sessionId: context.sessionId,
      taskId: context.taskId,
    });
    return op;
  }

  /**
   * Reads a file from a sandbox.
   * Đọc một tệp từ sandbox.
   */
  public readFile(
    sandboxId: SandboxId,
    relativePath: string,
    context: FileOperationContext
  ): string {
    const sb = this.getSandboxOrThrow(sandboxId);
    return this.fsEngine.readFile(sb, relativePath, context);
  }

  /**
   * Updates a file in a sandbox.
   * Cập nhật một tệp trong sandbox.
   */
  public updateFile(
    sandboxId: SandboxId,
    relativePath: string,
    content: string,
    context: FileOperationContext
  ): SandboxFileOperation {
    this.assertNotStopped('updateFile');
    const sb = this.getSandboxOrThrow(sandboxId);
    const op = this.fsEngine.updateFile(sb, relativePath, content, context);
    this.logAudit('updateFile', `${sandboxId}:${relativePath}`, 'SUCCESS', {
      sessionId: context.sessionId,
      taskId: context.taskId,
    });
    return op;
  }

  /**
   * Renames a file in a sandbox.
   * Đổi tên một tệp trong sandbox.
   */
  public renameFile(
    sandboxId: SandboxId,
    oldPath: string,
    newPath: string,
    context: FileOperationContext
  ): SandboxFileOperation {
    this.assertNotStopped('renameFile');
    const sb = this.getSandboxOrThrow(sandboxId);
    const op = this.fsEngine.renameFile(sb, oldPath, newPath, context);
    this.logAudit('renameFile', `${sandboxId}:${oldPath}->${newPath}`, 'SUCCESS', {
      sessionId: context.sessionId,
      taskId: context.taskId,
    });
    return op;
  }

  /**
   * Deletes a file in a sandbox.
   * Xóa một tệp trong sandbox.
   */
  public deleteFile(
    sandboxId: SandboxId,
    relativePath: string,
    context: FileOperationContext
  ): SandboxFileOperation {
    this.assertNotStopped('deleteFile');
    const sb = this.getSandboxOrThrow(sandboxId);
    const op = this.fsEngine.deleteFile(sb, relativePath, context);
    this.logAudit('deleteFile', `${sandboxId}:${relativePath}`, 'SUCCESS', {
      sessionId: context.sessionId,
      taskId: context.taskId,
    });
    return op;
  }

  /**
   * Creates an isolated worktree within a sandbox.
   * Tạo một worktree cô lập bên trong sandbox.
   */
  public createWorktree(input: CreateWorktreeInput): WorktreeDescriptor {
    this.assertNotStopped('createWorktree');
    const wt = this.worktreeEngine.createWorktree(input);
    this.logAudit('createWorktree', wt.worktreeId, 'SUCCESS', {
      sandboxId: input.sandbox.id,
      worktreeName: input.worktreeName,
    });
    return wt;
  }

  /**
   * Generates a deterministic manifest for a sandbox.
   * Tạo bản kê khai tất định cho một sandbox.
   */
  public generateManifest(sandboxId: SandboxId, context: FileOperationContext): SandboxManifest {
    this.assertNotStopped('generateManifest');
    const sb = this.getSandboxOrThrow(sandboxId);
    return this.manifestEngine.generateManifest(sb, context);
  }

  /**
   * Generates a deterministic diff between two manifests.
   * Tạo bản diff tất định giữa hai bản kê khai.
   */
  public generateDiff(
    sandboxId: SandboxId,
    baseManifest: SandboxManifest,
    targetManifest: SandboxManifest,
    context: FileOperationContext
  ): SandboxDiff {
    this.assertNotStopped('generateDiff');
    const sb = this.getSandboxOrThrow(sandboxId);
    return this.diffEngine.generateDiff(sb, baseManifest, targetManifest, context);
  }

  /**
   * Rolls back all modifications in a sandbox.
   * Hoàn tác tất cả các sửa đổi trong một sandbox.
   */
  public rollbackAll(
    sandboxId: SandboxId,
    context: FileOperationContext,
    reason?: string
  ): SandboxRollback {
    this.assertNotStopped('rollbackAll');
    const sb = this.getSandboxOrThrow(sandboxId);
    const rb = this.rollbackEngine.rollbackAll(sb, context, reason);
    this.sandboxManager.transitionState(sandboxId, 'ROLLED_BACK', reason);
    this.logAudit('rollbackAll', sandboxId, 'SUCCESS', {
      restoredFilesCount: rb.restoredFilesCount,
      removedFilesCount: rb.removedFilesCount,
    });
    return rb;
  }

  /**
   * Reviews sandbox state and diff prior to export.
   * Đánh giá trạng thái và bản diff của sandbox trước khi xuất.
   */
  public reviewSandbox(input: SandboxReviewInput): SandboxReviewRecord {
    this.assertNotStopped('reviewSandbox');
    const rec = this.reviewEngine.reviewSandbox(input);
    if (rec.decision === 'APPROVED') {
      this.sandboxManager.transitionState(input.sandbox.id, 'APPROVED', 'Supervisory review approved');
    } else if (rec.decision === 'REJECTED') {
      this.sandboxManager.transitionState(input.sandbox.id, 'REJECTED', 'Supervisory review rejected');
    }
    this.logAudit('reviewSandbox', input.sandbox.id, 'SUCCESS', {
      decision: rec.decision,
      ownerApproved: rec.ownerApproved,
      reviewerId: input.reviewerId,
    });
    return rec;
  }

  /**
   * Exports approved sandbox changes to an authorized destination.
   * Xuất các thay đổi sandbox đã được phê duyệt sang đích được ủy quyền.
   */
  public exportSandbox(input: ExecuteExportInput): SandboxExport {
    this.assertNotStopped('exportSandbox');
    const exp = this.exportEngine.exportChanges(input);
    this.sandboxManager.transitionState(input.sandbox.id, 'EXPORTED', 'Governed export completed');
    return exp;
  }

  /**
   * Helper to retrieve sandbox descriptor or throw SandboxError.
   * Hàm hỗ trợ lấy bộ mô tả sandbox hoặc ném SandboxError.
   */
  private getSandboxOrThrow(sandboxId: SandboxId): SandboxDescriptor {
    const sb = this.sandboxManager.getSandbox(sandboxId);
    if (!sb) {
      throw new SandboxError('POLICY_VIOLATION', `Sandbox "${sandboxId}" not found.`);
    }
    return sb;
  }

  /**
   * Appends an immutable audit event to the canonical AuditLedger.
   * Nối một sự kiện kiểm toán bất biến vào AuditLedger chuẩn tắc.
   */
  private logAudit(
    toolName: string,
    target: string,
    executionStatus: 'SUCCESS' | 'FAILURE' | 'BLOCKED',
    metadata: Record<string, unknown>
  ): void {
    try {
      this.auditLedger.record({
        timestamp: new Date().toISOString(),
        actor: {
          userId: 'sandbox_runtime',
          role: 'governed_sandbox_coordinator',
          channel: 'INTERNAL',
        },
        domain: 'sandbox_governance',
        toolName,
        classification: executionStatus === 'BLOCKED' ? 'SAFETY' : 'OBSERVE',
        argumentsHash: crypto.createHash('sha256').update(JSON.stringify({ target, ...metadata })).digest('hex'),
        policyDecision: executionStatus === 'BLOCKED' ? 'DENY' : 'PERMIT',
        executionStatus,
      });
    } catch {
      // Invariant: Do not disrupt in-memory flow if audit write is constrained in test environment
      // Bất biến: Không làm gián đoạn luồng trong bộ nhớ nếu việc ghi kiểm toán bị hạn chế trong môi trường test
    }
  }

  /**
   * Clears in-memory runtime components.
   * Xóa sạch các thành phần thời gian chạy trong bộ nhớ.
   */
  public clear(): void {
    this.sandboxManager.clear();
    this.policyEngine.clear();
    this.worktreeEngine.clear();
    this.reviewEngine.clear();
    this.exportEngine.clear();
    this._isStopped = false;
    this._stopReason = '';
  }
}

export const globalSandboxRuntime = new SandboxRuntime();
