// src/core/execution/toolExecutor.ts
// BOWCON V4.0 — MILESTONE 1.3.12: CONTROLLED TOOL EXECUTOR
//
// EN:
// Executes authorized capabilities with strict failure isolation (INV-11).
// Catches errors gracefully, prevents loop crashes, scrubs secrets from outputs/errors (INV-12),
// and returns structured, immutable GovernedToolExecutionResult.
//
// VI:
// Thực thi các capability đã được ủy quyền với sự cô lập lỗi nghiêm ngặt (INV-11).
// Bắt lỗi an toàn, ngăn chặn sập loop, khử trùng bí mật khỏi kết quả/lỗi (INV-12),
// và trả về GovernedToolExecutionResult bất biến có cấu trúc.

import type { CapabilityRegistry } from './capabilityRegistry.js';
import type { ToolCapability } from './capabilityTypes.js';
import { createExecutionRecord } from './executionRecord.js';
import type {
  ToolExecutionRequest,
  GovernedToolExecutionResult,
  ExecutionAuthorization,
} from './executionTypes.js';
import { redactSecrets } from './executionValidator.js';

export class ToolExecutor {
  private readonly registry?: CapabilityRegistry;

  constructor(registry?: CapabilityRegistry) {
    this.registry = registry;
  }

  /**
   * EN: Executes an authorized tool request. Fails closed if authorization is missing.
   * VI: Thực thi một yêu cầu tool đã được ủy quyền. Thất bại theo dạng đóng (fail-closed) nếu thiếu ủy quyền.
   */
  public execute(
    requestOrCap: ToolExecutionRequest | ToolCapability,
    maybeReq?: ToolExecutionRequest,
    maybeAuth?: ExecutionAuthorization,
  ): GovernedToolExecutionResult {
    let request: ToolExecutionRequest;
    let explicitCap: ToolCapability | undefined;

    if (maybeReq) {
      explicitCap = requestOrCap as ToolCapability;
      request = {
        ...maybeReq,
        authorization: maybeAuth || maybeReq.authorization,
      };
    } else {
      request = requestOrCap as ToolExecutionRequest;
    }

    const startTime = Date.now();
    const actor = request.actor || {
      userId: request.userId || 'unknown',
      sessionId: request.sessionId || 'unknown',
    };
    const toolName = request.toolName || request.actionName || explicitCap?.name || 'unknown';
    const args = request.args || request.parameters || {};

    // 1. Authorization Gate Pre-Check
    const authorization = request.authorization;
    if (!authorization || !authorization.authorized) {
      const errorMsg = authorization?.reason || 'UNAUTHORIZED: Request lacks valid execution authorization.';
      const sanitizedError = redactSecrets(errorMsg);
      const record = createExecutionRecord({
        executionFingerprint: request.executionFingerprint,
        userId: actor.userId,
        sessionId: actor.sessionId,
        toolId: toolName,
        status: 'FAILED',
        success: false,
        error: sanitizedError,
      });

      return Object.freeze({
        success: false,
        status: 'FAILED',
        outcome: 'AUTHORIZATION_DENIED',
        toolName,
        actionName: toolName,
        error: { message: sanitizedError },
        executionDurationMs: Date.now() - startTime,
        isReplay: false,
        record,
      });
    }

    // 2. Resolve Capability
    const capability = explicitCap || (this.registry ? this.registry.get(toolName) : undefined);
    if (!capability) {
      const errorMsg = `UNKNOWN_CAPABILITY: Capability "${toolName}" is not registered.`;
      const sanitizedError = redactSecrets(errorMsg);
      const record = createExecutionRecord({
        executionFingerprint: request.executionFingerprint,
        userId: actor.userId,
        sessionId: actor.sessionId,
        toolId: toolName,
        status: 'FAILED',
        success: false,
        error: sanitizedError,
      });

      return Object.freeze({
        success: false,
        status: 'FAILED',
        outcome: 'CAPABILITY_NOT_FOUND',
        toolName,
        actionName: toolName,
        error: { message: sanitizedError },
        executionDurationMs: Date.now() - startTime,
        isReplay: false,
        record,
      });
    }

    // 3. Controlled Execution with Failure Isolation (INV-11)
    try {
      const rawOutput = capability.handler(args, {
        actor,
        fingerprint: request.executionFingerprint,
      });

      const executionDurationMs = Date.now() - startTime;
      const record = createExecutionRecord({
        executionFingerprint: request.executionFingerprint,
        userId: actor.userId,
        sessionId: actor.sessionId,
        toolId: toolName,
        domain: capability.domain,
        risk: capability.risk,
        status: 'SUCCESS',
        success: true,
        outputMetadata: typeof rawOutput === 'object' && rawOutput !== null ? (rawOutput as Record<string, unknown>) : {},
      });

      return Object.freeze({
        success: true,
        status: 'SUCCESS',
        outcome: 'COMPLETED',
        toolName,
        actionName: toolName,
        riskLevel: capability.risk,
        result: { data: rawOutput },
        output: rawOutput,
        executionDurationMs,
        isReplay: false,
        record,
      });
    } catch (err: any) {
      // Failure Isolation: A tool error must NEVER crash the agent loop (INV-11)
      const rawMessage = err?.message || 'Tool execution encountered an unknown error.';
      const sanitizedError = redactSecrets(rawMessage);
      const executionDurationMs = Date.now() - startTime;

      const record = createExecutionRecord({
        executionFingerprint: request.executionFingerprint,
        userId: actor.userId,
        sessionId: actor.sessionId,
        toolId: toolName,
        domain: capability.domain,
        risk: capability.risk,
        status: 'FAILED',
        success: false,
        error: sanitizedError,
      });

      return Object.freeze({
        success: false,
        status: 'FAILED',
        outcome: 'HANDLER_FAILED',
        toolName,
        actionName: toolName,
        riskLevel: capability.risk,
        error: { message: sanitizedError },
        executionDurationMs,
        isReplay: false,
        record,
      });
    }
  }
}
