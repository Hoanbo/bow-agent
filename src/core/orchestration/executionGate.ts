// src/core/orchestration/executionGate.ts
// BOWCON V4.0 — MILESTONE 1.3.11: EXECUTION GOVERNANCE GATE
//
// EN:
// Evaluates DecisionState and risk levels to determine OrchestrationStatus.
// Enforces fail-closed semantics: errors and blocks never proceed to execution.
//
// VI:
// Đánh giá DecisionState và các cấp độ rủi ro để xác định OrchestrationStatus.
// Thực thi ngữ nghĩa fail-closed: lỗi và chặn không bao giờ được tiến vào thực thi.

import type { DecisionState } from '../decision/decisionTypes.js';
import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { OrchestrationStatus } from './orchestrationTypes.js';

export interface GateEvaluation {
  readonly status: OrchestrationStatus;
  readonly canProceedToGovernance: boolean;
  readonly reason: string;
}

/**
 * EN: Maps DecisionState and risk classification to authoritative OrchestrationStatus.
 * VI: Ánh xạ DecisionState và phân loại rủi ro sang OrchestrationStatus có thẩm quyền.
 */
export function evaluateExecutionGate(
  state: DecisionState,
  risk: PlanRiskLevel,
  hasSelectedAction: boolean,
): GateEvaluation {
  switch (state) {
    case 'BLOCK':
      return Object.freeze({
        status: 'BLOCKED',
        canProceedToGovernance: false,
        reason: 'Execution gate blocked: decision rejected by security or governance policy.',
      });

    case 'CLARIFY':
      return Object.freeze({
        status: 'CLARIFICATION_REQUIRED',
        canProceedToGovernance: false,
        reason: 'Execution gate paused: additional clarification is required from user before execution.',
      });

    case 'DEFER':
      return Object.freeze({
        status: 'DEFERRED',
        canProceedToGovernance: false,
        reason: 'Execution gate deferred: execution postponed pending prerequisites.',
      });

    case 'NO_ACTION':
      return Object.freeze({
        status: 'NO_ACTION',
        canProceedToGovernance: false,
        reason: 'No action required: query produces no side effects or tool invocations.',
      });

    case 'RESPOND':
      return Object.freeze({
        status: 'NO_ACTION',
        canProceedToGovernance: false,
        reason: 'Informational response only: direct reply without side-effect execution.',
      });

    case 'PROPOSE_ACTION':
      if (!hasSelectedAction) {
        return Object.freeze({
          status: 'REJECTED',
          canProceedToGovernance: false,
          reason: 'State is PROPOSE_ACTION but no candidate action was supplied.',
        });
      }

      if (risk === 'CRITICAL' || risk === 'HIGH') {
        return Object.freeze({
          status: 'WAITING_APPROVAL',
          canProceedToGovernance: true,
          reason: `Action carries ${risk} risk; must await human operator approval token before tool execution.`,
        });
      }

      if (risk === 'MEDIUM') {
        return Object.freeze({
          status: 'READY',
          canProceedToGovernance: true,
          reason: 'Medium risk action ready for Policy Decision Point (PDP) evaluation.',
        });
      }

      // LOW risk
      return Object.freeze({
        status: 'READY',
        canProceedToGovernance: true,
        reason: 'Low risk action ready for governed execution pipeline.',
      });

    default:
      return Object.freeze({
        status: 'BLOCKED',
        canProceedToGovernance: false,
        reason: `Unknown decision state: ${state}; failing closed.`,
      });
  }
}
