// src/core/policyEnforcement/failClosedBaselineFallback.ts
// BOWCON V4.0 — MS-1.3.59: GOVERNED RUNTIME POLICY ENFORCEMENT POINT (PEP),
// DYNAMIC PDP SYNCHRONIZATION & LIVE GUARDRAIL EXECUTION PIPELINE
//
// Immutable fail-closed baseline fallback provider.
// Guarantees that upon corrupted snapshots, drift, tampering, or missing tenant policies,
// runtime policy evaluation immediately falls back to the authoritative locked baseline.
// Hard-forbidden actions are permanently protected from downgrade.
// Bộ cung cấp dự phòng đường cơ sở đóng an toàn bất biến.
// Đảm bảo rằng khi bản chụp bị hỏng, lệch, bị can thiệp hoặc thiếu chính sách người thuê,
// đánh giá chính sách thời gian chạy sẽ ngay lập tức quay về đường cơ sở bị khóa có thẩm quyền.
// Các hành động bị cấm tuyệt đối được bảo vệ vĩnh viễn khỏi việc bị hạ cấp.
//
// Authority Invariants:
// - Level 0 Read-Only Inspection / Baseline Fallback Resolution
// - HARD_FORBIDDEN_POLICY > DYNAMIC_POLICY
// - FAIL_CLOSED > SPECULATIVE_EXECUTION
// - Zero autonomous token issuance, zero self-approval.

import {
  type PolicyConfiguration,
  type EvolutionVersionId,
  createEvolutionVersionId,
} from '../policyEvolution/policyEvolutionTypes.js';
import {
  createBaselinePolicyConfiguration,
  DEFAULT_BASELINE_CLASSIFICATIONS,
} from '../policyEvolution/policySnapshotStore.js';
import type { ActionClassification } from '../policyDecisionPoint.js';
import {
  CANONICAL_HARD_FORBIDDEN_ACTIONS,
  type FailClosedReason,
  type EnforcementDecision,
  createEnforcementDecisionId,
} from './policyEnforcementTypes.js';

export class FailClosedBaselineFallback {
  private readonly baselineConfig: PolicyConfiguration;

  constructor() {
    this.baselineConfig = Object.freeze(createBaselinePolicyConfiguration());
  }

  /**
   * Retrieves the immutable nominal baseline policy configuration.
   * Lấy cấu hình chính sách đường cơ sở danh nghĩa bất biến.
   */
  public getBaselineConfiguration(): PolicyConfiguration {
    return this.baselineConfig;
  }

  /**
   * Checks if an action is canonically hard-forbidden.
   * Kiểm tra xem một hành động có bị cấm tuyệt đối theo chuẩn tắc hay không.
   */
  public isHardForbidden(actionName: string): boolean {
    return CANONICAL_HARD_FORBIDDEN_ACTIONS.includes(actionName);
  }

  /**
   * Asserts that a candidate classification does NOT downgrade any hard-forbidden action.
   * Throws an error immediately if an illegal downgrade attempt is detected.
   * Khẳng định rằng phân loại ứng viên KHÔNG hạ cấp bất kỳ hành động bị cấm tuyệt đối nào.
   * Ném ra lỗi ngay lập tức nếu phát hiện nỗ lực hạ cấp bất hợp pháp.
   */
  public assertHardForbiddenImmutable(actionName: string, candidateClassification: ActionClassification): void {
    if (this.isHardForbidden(actionName) && candidateClassification !== 'FORBIDDEN') {
      throw new Error(
        `ILLEGAL_POLICY_DOWNGRADE: Action '${actionName}' is permanently FORBIDDEN and cannot be reclassified to '${candidateClassification}'.`
      );
    }
  }

  /**
   * Verifies an entire dictionary of action classifications against the immutable safety floor.
   * Returns true if all hard-forbidden actions are preserved, or false if any violation is found.
   * Xác minh toàn bộ từ điển phân loại hành động đối với sàn an toàn bất biến.
   * Trả về true nếu tất cả hành động bị cấm tuyệt đối được bảo toàn, hoặc false nếu tìm thấy vi phạm.
   */
  public verifyClassificationSafetyFloor(classifications: Record<string, ActionClassification>): boolean {
    for (const action of CANONICAL_HARD_FORBIDDEN_ACTIONS) {
      if (classifications[action] && classifications[action] !== 'FORBIDDEN') {
        return false;
      }
    }
    return true;
  }

  /**
   * Constructs an authoritative fail-closed denial decision.
   * Xây dựng quyết định từ chối đóng an toàn có thẩm quyền.
   */
  public createFailClosedDecision(params: {
    readonly toolName: string;
    readonly reason: string;
    readonly failClosedReason: FailClosedReason;
    readonly policyVersion?: string;
  }): EnforcementDecision {
    const isForbidden = this.isHardForbidden(params.toolName);
    const classification: ActionClassification = isForbidden ? 'FORBIDDEN' : 'HIGH_IMPACT';

    return {
      decisionId: createEnforcementDecisionId(`dec_fallback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      allowed: false,
      classification,
      requiresApproval: !isForbidden,
      policyVersion: params.policyVersion || this.baselineConfig.versionId,
      policyChecksum: this.baselineConfig.checksum,
      isBaselineFallback: true,
      reason: `FAIL_CLOSED: ${params.reason} (Code: ${params.failClosedReason})`,
      decisionTimestamp: new Date().toISOString(),
      failClosedReason: params.failClosedReason,
    };
  }
}

export const globalFailClosedBaselineFallback = new FailClosedBaselineFallback();
