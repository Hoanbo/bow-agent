// src/core/orchestration/executionRequest.ts
// BOWCON V4.0 — MILESTONE 1.3.11: STRUCTURED EXECUTION REQUEST BUILDER
//
// EN:
// Translates ExecutionIntent into a structured ExecutionRequest for PDP and ToolRegistry.
// Separates decision from intent, intent from request, and request from actual execution.
//
// VI:
// Chuyển dịch ExecutionIntent thành ExecutionRequest có cấu trúc cho PDP và ToolRegistry.
// Phân tách quyết định khỏi ý định, ý định khỏi yêu cầu, và yêu cầu khỏi thực thi thực tế.

import type { ExecutionIntent, ExecutionRequest, OrchestrationStatus } from './orchestrationTypes.js';
import { computeDeterministicExecutionFingerprint } from './orchestrationFingerprint.js';

/**
 * EN: Maps intent types to corresponding tool names registered in the agent ecosystem.
 * VI: Ánh xạ các loại intent sang tên công cụ tương ứng được đăng ký trong hệ sinh thái agent.
 */
export function resolveToolNameForIntent(actionType: string): string | undefined {
  switch (actionType) {
    case 'CANCEL_REQUEST':
      return 'cancel_order';
    case 'DELETE_REQUEST':
      return 'delete_order';
    case 'REFUND_REQUEST':
      return 'refund_order';
    case 'STATUS_REQUEST':
    case 'ORDER_QUERY':
      return 'get_order_status';
    case 'PRODUCT_QUERY':
      return 'query_products';
    case 'VOICE_COMMAND':
      return 'configure_voice';
    default:
      return undefined;
  }
}

/**
 * EN: Builds an immutable ExecutionRequest without executing any tools.
 * VI: Xây dựng ExecutionRequest bất biến mà không thực thi bất kỳ công cụ nào.
 */
export function createExecutionRequest(
  intent: ExecutionIntent,
  status: OrchestrationStatus,
): ExecutionRequest {
  const executionFingerprint = computeDeterministicExecutionFingerprint(
    intent.userId,
    intent.sessionId,
    intent.actionType,
    intent.sourceDecisionFingerprint,
    intent.parameters,
  );

  const toolName = resolveToolNameForIntent(intent.actionType);

  return Object.freeze({
    requestId: `req_${executionFingerprint.replace(/^exec_/, '')}`,
    intent,
    executionFingerprint,
    status,
    toolName,
    args: intent.parameters,
    metadata: Object.freeze({
      governed: intent.governanceRequired,
      approvalDemanded: intent.approvalRequired,
      domain: intent.targetDomain,
      risk: intent.risk,
    }),
  });
}
