// src/core/promotion/promotionRollbackEngine.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Governed rollback engine restoring previous target project state with full audit evidence.
// Động cơ hoàn tác có quản trị khôi phục trạng thái dự án mục tiêu trước đó với đầy đủ bằng chứng kiểm toán.
//
// STRICT INVARIANTS:
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - ROLLBACK != UNRESTRICTED_FILESYSTEM_ACCESS
// - PROVENANCE & AUDIT PRESERVATION
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import {
  type PromotionId,
  type PromotionRollbackResult,
  type PromotionExecutionResult,
  PromotionError,
} from './promotionTypes.js';
import { ControlledPromotionEngine } from './controlledPromotionEngine.js';
import { PromotionScopeValidator } from './promotionScopeValidator.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';
import { SandboxManifestEngine } from '../sandbox/sandboxManifestEngine.js';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';

export interface ExecuteRollbackInput {
  readonly promotionId: PromotionId;
  readonly rolledBackBy: string;
  readonly reason: string;
  readonly isUserStopActive?: boolean;
}

export class PromotionRollbackEngine {
  private completedRollbacks = new Map<string, PromotionRollbackResult>();

  constructor(
    private readonly promotionEngine: ControlledPromotionEngine,
    private readonly auditLedger: AuditLedger = globalAuditLedger
  ) {}

  /**
   * Executes a governed rollback of a previously promoted change set.
   * Thực thi việc hoàn tác có quản trị của một tập hợp thay đổi đã xúc tiến trước đó.
   */
  public executeRollback(input: ExecuteRollbackInput): PromotionRollbackResult {
    const now = Date.now();

    // 1. Enforce absolute USER_STOP supremacy.
    // 1. Thực thi tính tối thượng tuyệt đối của USER_STOP.
    if (input.isUserStopActive) {
      throw new PromotionError(
        'USER_STOP_ACTIVE',
        `Rollback rejected: USER_STOP is active.`
      );
    }

    // 2. Retrieve completed promotion and its backups.
    // 2. Truy xuất đợt xúc tiến đã hoàn thành và các bản sao lưu của nó.
    const completedPromotion = this.promotionEngine.getCompletedPromotion(input.promotionId);
    if (!completedPromotion) {
      throw new PromotionError(
        'PROMOTION_NOT_FOUND',
        `Cannot rollback: completed promotion "${input.promotionId}" not found.`
      );
    }

    // 3. Guard against protected workspace C:\BOW\shopofbow.
    // 3. Bảo vệ chống lại không gian làm việc được bảo vệ C:\BOW\shopofbow.
    PromotionScopeValidator.assertNotProtectedWorkspace(completedPromotion.targetProjectRoot);

    // 4. Ensure rollback hasn't already been executed.
    // 4. Đảm bảo việc hoàn tác chưa được thực thi trước đó.
    if (this.completedRollbacks.has(input.promotionId)) {
      throw new PromotionError(
        'DUPLICATE_ROLLBACK',
        `Promotion "${input.promotionId}" has already been rolled back.`
      );
    }

    const backups = this.promotionEngine.getBackups(input.promotionId);
    if (!backups) {
      throw new PromotionError(
        'ROLLBACK_BACKUP_MISSING',
        `Cannot rollback: backup state for promotion "${input.promotionId}" is unavailable.`
      );
    }

    const targetRootAbs = path.resolve(completedPromotion.targetProjectRoot);
    const restoredFiles: string[] = [];

    // 5. Restore files from backup state.
    // 5. Khôi phục các tệp từ trạng thái sao lưu.
    for (const backup of backups) {
      const { absolutePath: targetAbs } = SandboxPathGuard.resolveAndAssertContainedPath(
        targetRootAbs,
        backup.relativePath
      );

      if (backup.previousExists && backup.previousContent !== undefined) {
        // Restore previous content.
        // Khôi phục nội dung trước đó.
        const parentDir = path.dirname(targetAbs);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(targetAbs, backup.previousContent, 'utf8');
        restoredFiles.push(backup.relativePath);
      } else {
        // File was newly created by promotion; remove it.
        // Tệp mới được tạo bởi đợt xúc tiến; loại bỏ nó.
        if (fs.existsSync(targetAbs)) {
          fs.unlinkSync(targetAbs);
          restoredFiles.push(backup.relativePath);
        }
      }
    }

    // 6. Compute post-rollback manifest.
    // 6. Tính toán bản kê khai sau khi hoàn tác.
    const postEntries = SandboxManifestEngine.scanProjectDirectory(targetRootAbs);
    const rollbackManifestHash = SandboxManifestEngine.calculateManifestHash(postEntries);

    // 7. Record canonical audit ledger entry.
    // 7. Ghi nhật ký kiểm toán chuẩn tắc.
    const auditRecordId = this.logAudit(
      input.rolledBackBy,
      'PROMOTION_ROLLED_BACK',
      completedPromotion.targetProjectRoot,
      'PERMIT',
      'SUCCESS',
      {
        promotionId: input.promotionId,
        reason: input.reason,
        previousManifestHash: completedPromotion.promotedManifestHash,
        rollbackManifestHash,
        restoredFileCount: restoredFiles.length,
      }
    );

    const rollbackResult: PromotionRollbackResult = {
      rollbackId: `rb_${now}_${crypto.randomBytes(3).toString('hex')}`,
      promotionId: input.promotionId,
      targetProjectRoot: completedPromotion.targetProjectRoot,
      restoredFiles,
      previousManifestHash: completedPromotion.promotedManifestHash,
      rollbackManifestHash,
      rolledBackAt: now,
      rolledBackBy: input.rolledBackBy,
      reason: input.reason,
      auditRecordId,
    };

    this.completedRollbacks.set(input.promotionId, rollbackResult);
    return rollbackResult;
  }

  /**
   * Records a canonical audit ledger event.
   * Ghi lại một sự kiện nhật ký kiểm toán chuẩn tắc.
   */
  private logAudit(
    actorId: string,
    action: string,
    target: string,
    decision: 'PERMIT' | 'DENY',
    status: 'SUCCESS' | 'FAILURE' | 'BLOCKED',
    metadata: Record<string, any>
  ): string {
    const rawPayload = JSON.stringify({ target, ...metadata });
    const argumentsHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const event = this.auditLedger.record({
      timestamp: new Date().toISOString(),
      actor: {
        userId: actorId,
        role: 'PROMOTION_ROLLBACK_ENGINE',
        channel: 'INTERNAL',
      },
      domain: 'PROMOTION_GOVERNANCE',
      toolName: action,
      classification: status === 'BLOCKED' ? 'SAFETY' : 'MUTATION',
      argumentsHash,
      policyDecision: decision,
      executionStatus: status,
      resultHash: argumentsHash,
    });
    return event.eventId;
  }

  /**
   * Retrieves an existing rollback result by promotionId.
   * Lấy kết quả hoàn tác hiện có theo promotionId.
   */
  public getRollbackResult(promotionId: string): PromotionRollbackResult | undefined {
    return this.completedRollbacks.get(promotionId);
  }

  /**
   * Clears in-memory rollback records.
   * Xóa sạch các bản ghi hoàn tác trong bộ nhớ.
   */
  public clear(): void {
    this.completedRollbacks.clear();
  }
}
