// src/core/recovery/recoveryDecision.ts
// BOWCON V4.0 — MILESTONE 1.3.16: RECOVERY DECISION ENGINE
//
// EN:
// Authoritative decision synthesizer for Brain Recovery.
// Strictly maps interrupted operation classifications to safe next-step recovery decisions.
// Purely data-only: Never executes tools or mutates state.
//
// VI:
// Bộ tổng hợp quyết định có thẩm quyền cho Phục hồi Não bộ.
// Ánh xạ nghiêm ngặt phân loại thao tác bị gián đoạn sang các quyết định phục hồi bước tiếp theo an toàn.
// Thuần dữ liệu: Tuyệt đối không thực thi công cụ hoặc làm đột biến trạng thái.

import type {
  InterruptedOperationClassification,
  RecoveryDecision,
  ApprovalRecoveryStatus,
} from './recoveryTypes.js';
import type { PlanRiskLevel } from '../planning/planningTypes.js';

/**
 * EN: Determines the authoritative safe recovery decision.
 * VI: Xác định quyết định phục hồi an toàn có thẩm quyền.
 */
export function determineRecoveryDecision(
  classification: InterruptedOperationClassification,
  approvalStatus: ApprovalRecoveryStatus = 'APPROVAL_UNKNOWN',
  risk: PlanRiskLevel = 'LOW',
): RecoveryDecision {
  switch (classification) {
    case 'NO_OPERATION':
    case 'DUPLICATE_ALREADY_COMMITTED':
    case 'TERMINAL_STATE_RECOVERED':
      return 'SAFE_TO_READY';

    case 'SAFE_TO_RESUME':
      return 'SAFE_TO_RESUME';

    case 'RESUME_REQUIRES_GOVERNANCE':
      if (approvalStatus === 'APPROVAL_PENDING' || risk === 'HIGH' || risk === 'CRITICAL') {
        return 'REQUIRE_APPROVAL';
      }
      return 'REQUIRE_GOVERNANCE';

    case 'RESUME_REQUIRES_VERIFICATION':
      return 'REQUIRE_VERIFICATION';

    case 'RESUME_BLOCKED':
      return 'BLOCK_RECOVERY';

    case 'PARTIAL_COMMIT':
      return 'BLOCK_RECOVERY';

    case 'CONFLICTING_STATE':
      return 'REQUIRE_OPERATOR_INTERVENTION';

    case 'UNKNOWN_STATE':
    default:
      return 'BLOCK_RECOVERY';
  }
}
