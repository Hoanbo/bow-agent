// src/core/promotion/promotionConflictEngine.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Detects concurrent, overlapping, and content conflicts between proposal and live target state.
// Phát hiện các xung đột đồng thời, chồng lấn và nội dung giữa đề xuất và trạng thái mục tiêu thực tế.
//
// STRICT INVARIANTS:
// - AGENT_COUNT != AUTHORITY_COUNT (No collective authority; conflicts are never resolved by voting).
// - CONFLICTS -> FAIL CLOSED & PRESERVE FOR SUPERVISORY RESOLUTION
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
  type PromotionConflict,
  type PromotionConflictType,
  PromotionError,
} from './promotionTypes.js';
import { PromotionScopeValidator } from './promotionScopeValidator.js';
import type { SandboxEntry } from '../sandbox/sandboxTypes.js';
import { SandboxFilesystemEngine } from '../sandbox/sandboxFilesystemEngine.js';

export interface ConflictCheckInput {
  readonly proposal: PromotionProposal;
  readonly targetEntries?: readonly SandboxEntry[];
  readonly targetBaseManifestHash?: string;
  readonly concurrentActiveProposals?: readonly PromotionProposal[];
}

export class PromotionConflictEngine {
  /**
   * Evaluates conflicts between proposed changes and current target project state.
   * Đánh giá các xung đột giữa các thay đổi đề xuất và trạng thái hiện tại của dự án mục tiêu.
   */
  public detectConflicts(input: ConflictCheckInput): PromotionConflict[] {
    // 1. Guard against protected workspace C:\BOW\shopofbow.
    // 1. Bảo vệ chống lại không gian làm việc được bảo vệ C:\BOW\shopofbow.
    PromotionScopeValidator.assertNotProtectedWorkspace(input.proposal.targetProjectRoot);

    const conflicts: PromotionConflict[] = [];
    const now = Date.now();

    // Map target entries by normalized relative path.
    // Lập bản đồ các mục tiêu theo đường dẫn tương đối đã chuẩn hóa.
    const targetMap = new Map<string, SandboxEntry>();
    for (const entry of input.targetEntries || []) {
      targetMap.set(entry.relativePath, entry);
    }

    // 2. Base manifest hash check (Global staleness detection).
    // 2. Kiểm tra mã băm bản kê khai gốc (Phát hiện độ cũ kỹ toàn cục).
    if (
      input.targetBaseManifestHash &&
      input.proposal.baseManifestHash &&
      input.targetBaseManifestHash !== input.proposal.baseManifestHash
    ) {
      conflicts.push({
        conflictId: `conf_${now}_${crypto.randomBytes(3).toString('hex')}`,
        type: 'BASE_HASH_MISMATCH',
        relativePath: '',
        details: `Target base manifest hash "${input.targetBaseManifestHash}" does not match proposal base hash "${input.proposal.baseManifestHash}".`,
        expectedHash: input.proposal.baseManifestHash,
        actualHash: input.targetBaseManifestHash,
        detectedAt: now,
      });
    }

    // 3. Per-change conflict inspection.
    // 3. Kiểm tra xung đột cho từng thay đổi.
    for (const change of input.proposal.proposedChanges) {
      const targetEntry = targetMap.get(change.relativePath);

      if (change.changeType === 'ADDED') {
        // If file is marked ADDED in proposal but already exists in target with different content.
        // Nếu tệp được đánh dấu ADDED trong đề xuất nhưng đã tồn tại ở mục tiêu với nội dung khác.
        if (targetEntry && targetEntry.entryType === 'FILE') {
          if (targetEntry.contentHash !== change.newHash) {
            conflicts.push({
              conflictId: `conf_${now}_${crypto.randomBytes(3).toString('hex')}`,
              type: 'FILE_CONTENT_COLLISION',
              relativePath: change.relativePath,
              details: `File "${change.relativePath}" marked ADDED already exists in target with conflicting content hash "${targetEntry.contentHash}".`,
              expectedHash: change.newHash,
              actualHash: targetEntry.contentHash,
              detectedAt: now,
            });
          }
        }
      } else if (change.changeType === 'MODIFIED') {
        // If file is marked MODIFIED, target's current hash must match proposal's previousHash.
        // Nếu tệp được đánh dấu MODIFIED, mã băm hiện tại của mục tiêu phải khớp với previousHash của đề xuất.
        if (!targetEntry) {
          conflicts.push({
            conflictId: `conf_${now}_${crypto.randomBytes(3).toString('hex')}`,
            type: 'FILE_CONTENT_COLLISION',
            relativePath: change.relativePath,
            details: `File "${change.relativePath}" marked MODIFIED does not exist in target project.`,
            expectedHash: change.previousHash,
            actualHash: undefined,
            detectedAt: now,
          });
        } else if (change.previousHash && targetEntry.contentHash !== change.previousHash) {
          conflicts.push({
            conflictId: `conf_${now}_${crypto.randomBytes(3).toString('hex')}`,
            type: 'TARGET_MODIFIED_CONCURRENTLY',
            relativePath: change.relativePath,
            details: `Target file "${change.relativePath}" was modified concurrently. Current hash "${targetEntry.contentHash}" != base hash "${change.previousHash}".`,
            expectedHash: change.previousHash,
            actualHash: targetEntry.contentHash,
            detectedAt: now,
          });
        }
      } else if (change.changeType === 'DELETED') {
        // If file is marked DELETED, but has been modified in target since base generation.
        // Nếu tệp được đánh dấu DELETED nhưng đã bị sửa đổi ở mục tiêu kể từ khi tạo cơ sở.
        if (targetEntry && change.previousHash && targetEntry.contentHash !== change.previousHash) {
          conflicts.push({
            conflictId: `conf_${now}_${crypto.randomBytes(3).toString('hex')}`,
            type: 'DELETED_FILE_MODIFIED_IN_TARGET',
            relativePath: change.relativePath,
            details: `File "${change.relativePath}" was scheduled for deletion but modified in target (hash "${targetEntry.contentHash}").`,
            expectedHash: change.previousHash,
            actualHash: targetEntry.contentHash,
            detectedAt: now,
          });
        }
      } else if (change.changeType === 'RENAMED') {
        // If file is marked RENAMED, the original source must exist in target.
        // Nếu tệp được đánh dấu RENAMED, nguồn ban đầu phải tồn tại ở mục tiêu.
        if (change.previousPath && !targetMap.has(change.previousPath)) {
          conflicts.push({
            conflictId: `conf_${now}_${crypto.randomBytes(3).toString('hex')}`,
            type: 'RENAMED_FILE_MISSING_IN_TARGET',
            relativePath: change.previousPath,
            details: `Original file "${change.previousPath}" for rename to "${change.relativePath}" missing in target.`,
            detectedAt: now,
          });
        }
      }
    }

    // 4. Overlapping concurrent promotion check.
    // 4. Kiểm tra sự trùng lặp với các xúc tiến đồng thời đang hoạt động.
    if (input.concurrentActiveProposals) {
      const currentProposalPaths = new Set(input.proposal.proposedChanges.map((c) => c.relativePath));
      for (const other of input.concurrentActiveProposals) {
        if (other.promotionId === input.proposal.promotionId) continue;
        if (path.resolve(other.targetProjectRoot) !== path.resolve(input.proposal.targetProjectRoot)) continue;

        for (const otherChange of other.proposedChanges) {
          if (currentProposalPaths.has(otherChange.relativePath)) {
            conflicts.push({
              conflictId: `conf_${now}_${crypto.randomBytes(3).toString('hex')}`,
              type: 'OVERLAPPING_PROMOTION_ACTIVE',
              relativePath: otherChange.relativePath,
              details: `File "${otherChange.relativePath}" is already being modified by concurrent promotion "${other.promotionId}".`,
              detectedAt: now,
            });
          }
        }
      }
    }

    return conflicts;
  }
}
