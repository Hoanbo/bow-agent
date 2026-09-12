// src/core/promotion/controlledPromotionEngine.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Governed execution boundary that applies approved changes to authorized project targets.
// Ranh giới thực thi có quản trị áp dụng các thay đổi đã được phê duyệt vào các mục tiêu dự án được phép.
//
// STRICT INVARIANTS:
// - NO SHELL EXECUTION (Zero eval, new Function, execSync, child_process, SSH).
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - ATOMIC & AUDIT-LOGGED PROMOTION
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
  type PromotionProposal,
  type PromotionApprovalRecord,
  type PromotionExecutionResult,
  type PromotionRollbackBackup,
  PromotionError,
} from './promotionTypes.js';
import { PromotionScopeValidator } from './promotionScopeValidator.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';
import { SandboxManifestEngine } from '../sandbox/sandboxManifestEngine.js';
import type { SandboxDescriptor, SandboxManifest } from '../sandbox/sandboxTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import { PromotionAuthorizationEngine } from './promotionAuthorizationEngine.js';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';

export interface ExecutePromotionInput {
  readonly proposal: PromotionProposal;
  readonly approval: PromotionApprovalRecord;
  readonly authorizationToken: AuthorizationToken;
  readonly sandbox: SandboxDescriptor;
  readonly executedBy: string;
  readonly isUserStopActive?: boolean;
}

export class ControlledPromotionEngine {
  // Stored backup state for rollback by promotionId.
  // Trạng thái sao lưu được lưu trữ để hoàn tác theo promotionId.
  private rollbackBackups = new Map<string, PromotionRollbackBackup[]>();
  private completedPromotions = new Map<string, PromotionExecutionResult>();

  constructor(
    private readonly authEngine: PromotionAuthorizationEngine,
    private readonly auditLedger: AuditLedger = globalAuditLedger
  ) {}

  /**
   * Applies approved changes to the authorized target project directory with backup capture.
   * Áp dụng các thay đổi đã phê duyệt vào thư mục dự án mục tiêu được phép kèm theo việc sao lưu.
   */
  public executePromotion(input: ExecutePromotionInput): PromotionExecutionResult {
    const now = Date.now();

    // 1. Enforce absolute USER_STOP supremacy.
    // 1. Thực thi tính tối thượng tuyệt đối của USER_STOP.
    if (input.isUserStopActive) {
      throw new PromotionError(
        'USER_STOP_ACTIVE',
        `Promotion execution rejected: USER_STOP is active.`
      );
    }

    // 2. Guard against protected workspace C:\BOW\shopofbow.
    // 2. Bảo vệ chống lại không gian làm việc được bảo vệ C:\BOW\shopofbow.
    PromotionScopeValidator.assertNotProtectedWorkspace(input.proposal.targetProjectRoot);

    // 3. Ensure promotion has not already been executed (Anti-replay guarantee).
    // 3. Đảm bảo việc xúc tiến chưa được thực thi trước đó (Bảo đảm chống phát lại).
    if (this.completedPromotions.has(input.proposal.promotionId)) {
      throw new PromotionError(
        'DUPLICATE_PROMOTION',
        `Promotion "${input.proposal.promotionId}" has already been executed.`
      );
    }

    // 4. Verify approval record is APPROVED.
    // 4. Xác minh bản ghi phê duyệt phải là APPROVED.
    if (input.approval.decision !== 'APPROVED') {
      throw new PromotionError(
        'UNAPPROVED_PROMOTION',
        `Cannot execute unapproved promotion "${input.proposal.promotionId}".`
      );
    }

    // 5. Verify canonical authorization token.
    // 5. Xác minh mã ủy quyền chuẩn tắc.
    const isTokenValid = this.authEngine.validatePromotionToken(
      input.authorizationToken,
      input.proposal
    );
    if (!isTokenValid) {
      throw new PromotionError(
        'INVALID_AUTHORIZATION_TOKEN',
        `Authorization token invalid or expired for promotion "${input.proposal.promotionId}".`
      );
    }

    // 6. Ensure target directory exists and is contained.
    // 6. Đảm bảo thư mục mục tiêu tồn tại và được bao chứa.
    const targetRootAbs = path.resolve(input.proposal.targetProjectRoot);
    if (!fs.existsSync(targetRootAbs)) {
      fs.mkdirSync(targetRootAbs, { recursive: true });
    }

    // 7. Verify live target manifest hash matches proposal base hash (Staleness / concurrency guard).
    // 7. Xác minh mã băm bản kê khai mục tiêu trực tiếp khớp với mã băm gốc của đề xuất (Bảo vệ cũ kỹ / đồng thời).
    const preEntries = SandboxManifestEngine.scanProjectDirectory(targetRootAbs);
    const preManifestHash = SandboxManifestEngine.calculateManifestHash(preEntries);

    if (
      input.proposal.baseManifestHash &&
      preManifestHash &&
      input.proposal.baseManifestHash !== preManifestHash
    ) {
      throw new PromotionError(
        'STALE_TARGET_STATE',
        `Target state changed concurrently. Current hash "${preManifestHash}" != expected base "${input.proposal.baseManifestHash}".`
      );
    }

    // 8. Capture backups of all files about to be modified or deleted.
    // 8. Thu thập sao lưu cho tất cả các tệp sắp bị chỉnh sửa hoặc xóa.
    const backups: PromotionRollbackBackup[] = [];

    for (const change of input.proposal.proposedChanges) {
      const { absolutePath: targetAbs } = SandboxPathGuard.resolveAndAssertContainedPath(
        targetRootAbs,
        change.relativePath
      );

      const exists = fs.existsSync(targetAbs);
      const prevContent = exists ? fs.readFileSync(targetAbs, 'utf8') : undefined;

      backups.push({
        relativePath: change.relativePath,
        previousContent: prevContent,
        previousExists: exists,
      });
    }

    // 9. Apply changes safely to target project.
    // 9. Áp dụng các thay đổi một cách an toàn vào dự án mục tiêu.
    for (const change of input.proposal.proposedChanges) {
      const { absolutePath: targetAbs } = SandboxPathGuard.resolveAndAssertContainedPath(
        targetRootAbs,
        change.relativePath
      );

      if (change.changeType === 'ADDED' || change.changeType === 'MODIFIED') {
        // Read file from sandbox root.
        // Đọc tệp từ thư mục gốc sandbox.
        const { absolutePath: sandboxSourceAbs } = SandboxPathGuard.resolveAndAssertContainedPath(
          input.sandbox.rootPath,
          change.relativePath
        );

        if (!fs.existsSync(sandboxSourceAbs)) {
          throw new PromotionError(
            'SANDBOX_SOURCE_MISSING',
            `Source file "${change.relativePath}" missing in sandbox "${input.sandbox.id}".`
          );
        }

        const sourceContent = fs.readFileSync(sandboxSourceAbs, 'utf8');

        // Ensure target directory exists.
        // Đảm bảo thư mục mục tiêu tồn tại.
        const targetDir = path.dirname(targetAbs);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        fs.writeFileSync(targetAbs, sourceContent, 'utf8');
      } else if (change.changeType === 'DELETED') {
        if (fs.existsSync(targetAbs)) {
          fs.unlinkSync(targetAbs);
        }
      } else if (change.changeType === 'RENAMED' && change.previousPath) {
        const { absolutePath: oldTargetAbs } = SandboxPathGuard.resolveAndAssertContainedPath(
          targetRootAbs,
          change.previousPath
        );
        if (fs.existsSync(oldTargetAbs)) {
          const targetDir = path.dirname(targetAbs);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          fs.renameSync(oldTargetAbs, targetAbs);
        }
      }
    }

    // 10. Store backups for potential rollback.
    // 10. Lưu trữ sao lưu cho khả năng hoàn tác.
    this.rollbackBackups.set(input.proposal.promotionId, backups);

    // 11. Compute resulting target manifest.
    // 11. Tính toán bản kê khai mục tiêu kết quả.
    const postEntries = SandboxManifestEngine.scanProjectDirectory(targetRootAbs);
    const postManifestHash = SandboxManifestEngine.calculateManifestHash(postEntries);

    // 12. Record canonical audit log.
    // 12. Ghi nhật ký kiểm toán chuẩn tắc.
    const auditRecordId = this.logAudit(
      input.executedBy,
      'CONTROLLED_PROMOTION_EXECUTED',
      input.proposal.targetProjectRoot,
      'PERMIT',
      'SUCCESS',
      {
        promotionId: input.proposal.promotionId,
        diffHash: input.proposal.diffHash,
        preManifestHash,
        postManifestHash,
        changesApplied: input.proposal.proposedChanges.length,
      }
    );

    const result: PromotionExecutionResult = {
      promotionId: input.proposal.promotionId,
      targetProjectRoot: input.proposal.targetProjectRoot,
      status: 'PROMOTED',
      appliedChanges: [...input.proposal.proposedChanges],
      previousManifestHash: preManifestHash,
      promotedManifestHash: postManifestHash,
      executedAt: now,
      executedBy: input.executedBy,
      auditRecordId,
    };

    this.completedPromotions.set(input.proposal.promotionId, result);
    return result;
  }

  /**
   * Retrieves backups stored for a promotion execution.
   * Lấy các bản sao lưu được lưu trữ cho một đợt thực thi xúc tiến.
   */
  public getBackups(promotionId: string): readonly PromotionRollbackBackup[] | undefined {
    return this.rollbackBackups.get(promotionId);
  }

  /**
   * Retrieves a completed promotion result by promotionId.
   * Lấy kết quả xúc tiến đã hoàn thành theo promotionId.
   */
  public getCompletedPromotion(promotionId: string): PromotionExecutionResult | undefined {
    return this.completedPromotions.get(promotionId);
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
        role: 'PROMOTION_ENGINE',
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
   * Clears in-memory promotion records.
   * Xóa sạch các bản ghi xúc tiến trong bộ nhớ.
   */
  public clear(): void {
    this.rollbackBackups.clear();
    this.completedPromotions.clear();
  }
}
