// src/core/promotion/promotionValidationEngine.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Validates promotion proposals against base freshness, integrity, bindings, and active governance.
// Xác thực các đề xuất xúc tiến dựa trên độ tươi mới của trạng thái gốc, tính toàn vẹn, ràng buộc và quản trị hiện hành.
//
// STRICT INVARIANTS:
// - VALIDATION != AUTHORIZATION
// - PROMOTION_PROPOSAL != AUTHORIZATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - STALE_STATE -> FAIL CLOSED
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type PromotionProposal,
  type PromotionValidationResult,
  type PromotionConflict,
  PromotionError,
} from './promotionTypes.js';
import { PromotionScopeValidator } from './promotionScopeValidator.js';
import { SandboxDiffEngine } from '../sandbox/sandboxDiffEngine.js';
import type { SandboxDescriptor, SandboxManifest, SandboxDiff } from '../sandbox/sandboxTypes.js';
import type { DelegationRecord } from '../delegation/delegationTypes.js';
import type { CapabilityLease } from '../delegation/delegationTypes.js';

export interface ValidateProposalInput {
  readonly proposal: PromotionProposal;
  readonly sandbox: SandboxDescriptor;
  readonly targetCurrentManifestHash: string;
  readonly delegation?: DelegationRecord;
  readonly lease?: CapabilityLease;
  readonly isUserStopActive?: boolean;
}

export class PromotionValidationEngine {
  /**
   * Validates a promotion proposal against current live context, invariants, and staleness.
   * Xác thực đề xuất xúc tiến với ngữ cảnh trực tiếp hiện tại, các tiên đề bất biến và tính cũ kỹ.
   */
  public validate(input: ValidateProposalInput): PromotionValidationResult {
    const now = Date.now();
    const conflicts: PromotionConflict[] = [];

    // 1. Enforce absolute USER_STOP supremacy.
    // 1. Thực thi tính tối thượng tuyệt đối của USER_STOP.
    if (input.isUserStopActive) {
      return {
        valid: false,
        state: 'BLOCKED',
        reason: 'USER_STOP is active. Promotion validation blocked.',
        conflicts: [],
        isStale: false,
        validatedAt: now,
      };
    }

    // 2. Guard against protected workspace C:\BOW\shopofbow.
    // 2. Bảo vệ chống lại không gian làm việc được bảo vệ C:\BOW\shopofbow.
    PromotionScopeValidator.assertNotProtectedWorkspace(input.proposal.targetProjectRoot);

    // 3. Enforce expiration checks.
    // 3. Thực thi kiểm tra hết hạn.
    if (now > input.proposal.expiresAt) {
      return {
        valid: false,
        state: 'EXPIRED',
        reason: `Promotion proposal has expired at ${new Date(input.proposal.expiresAt).toISOString()}.`,
        conflicts: [],
        isStale: false,
        validatedAt: now,
      };
    }

    // 4. Enforce sandbox revocation & state.
    // 4. Thực thi việc thu hồi và trạng thái của sandbox.
    if (input.sandbox.isRevoked || input.sandbox.state === 'REVOKED') {
      return {
        valid: false,
        state: 'REVOKED',
        reason: 'Parent sandbox has been revoked.',
        conflicts: [],
        isStale: false,
        validatedAt: now,
      };
    }

    // 5. Enforce delegation status if provided.
    // 5. Thực thi trạng thái ủy quyền nếu được cung cấp.
    if (input.delegation) {
      if (input.delegation.status === 'REVOKED') {
        return {
          valid: false,
          state: 'REVOKED',
          reason: `Underlying delegation "${input.delegation.delegationId}" is revoked.`,
          conflicts: [],
          isStale: false,
          validatedAt: now,
        };
      }
      if (now > input.delegation.expiresAt) {
        return {
          valid: false,
          state: 'EXPIRED',
          reason: `Underlying delegation "${input.delegation.delegationId}" has expired.`,
          conflicts: [],
          isStale: false,
          validatedAt: now,
        };
      }
    }

    // 6. Enforce capability lease validity if provided.
    // 6. Thực thi tính hợp lệ của hợp đồng thuê năng lực nếu được cung cấp.
    if (input.lease) {
      if (input.lease.status === 'REVOKED') {
        return {
          valid: false,
          state: 'REVOKED',
          reason: `Capability lease "${input.lease.leaseId}" is revoked.`,
          conflicts: [],
          isStale: false,
          validatedAt: now,
        };
      }
      if (now > input.lease.expiresAt) {
        return {
          valid: false,
          state: 'EXPIRED',
          reason: `Capability lease "${input.lease.leaseId}" has expired.`,
          conflicts: [],
          isStale: false,
          validatedAt: now,
        };
      }
    }

    // 7. Validate diff integrity.
    // 7. Xác thực tính toàn vẹn của diff.
    const recomputedDiffHash = SandboxDiffEngine.calculateDiffHash(input.proposal.proposedChanges);
    if (recomputedDiffHash !== input.proposal.diffHash) {
      return {
        valid: false,
        state: 'REJECTED',
        reason: `Diff integrity violation: diffHash "${input.proposal.diffHash}" does not match recomputed hash "${recomputedDiffHash}".`,
        conflicts: [],
        isStale: false,
        validatedAt: now,
      };
    }

    // 8. Validate scope containment.
    // 8. Xác thực tính bao chứa phạm vi.
    try {
      PromotionScopeValidator.validateScope(
        input.proposal,
        input.sandbox,
        input.delegation,
        input.lease
      );
    } catch (err: any) {
      return {
        valid: false,
        state: 'REJECTED',
        reason: `Scope validation failed: ${err.message}`,
        conflicts: [],
        isStale: false,
        validatedAt: now,
      };
    }

    // 8. Detect stale base state (Target was modified since proposal creation).
    // 8. Phát hiện trạng thái gốc cũ kỹ (Mục tiêu đã bị sửa đổi kể từ khi tạo đề xuất).
    if (
      input.targetCurrentManifestHash &&
      input.proposal.baseManifestHash &&
      input.targetCurrentManifestHash !== input.proposal.baseManifestHash
    ) {
      const conflict: PromotionConflict = {
        conflictId: `conf_${now}_${crypto.randomBytes(3).toString('hex')}`,
        type: 'BASE_HASH_MISMATCH',
        relativePath: '',
        details: `Target current manifest hash "${input.targetCurrentManifestHash}" differs from proposal base manifest hash "${input.proposal.baseManifestHash}". Target state is stale.`,
        expectedHash: input.proposal.baseManifestHash,
        actualHash: input.targetCurrentManifestHash,
        detectedAt: now,
      };
      conflicts.push(conflict);

      return {
        valid: false,
        state: 'STALE',
        reason: 'Target state modified since proposal creation: STALENESS_DETECTED.',
        conflicts,
        isStale: true,
        validatedAt: now,
      };
    }

    return {
      valid: true,
      state: 'VALIDATED',
      conflicts: [],
      isStale: false,
      validatedAt: now,
    };
  }
}
