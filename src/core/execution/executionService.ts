// src/core/execution/executionService.ts
// BOWCON V4.0 — MILESTONE 1.3.12: AUTHORITATIVE GOVERNED EXECUTION SERVICE
//
// EN:
// Central coordinator for the Governed Tool Execution Runtime.
// Orchestrates schema validation, authorization, replay/idempotency protection (INV-4),
// and failure-isolated capability execution.
//
// VI:
// Bộ điều phối trung tâm cho Runtime Thực thi Công cụ có Quản trị.
// Điều phối xác thực schema, ủy quyền, bảo vệ chống lặp lại/idempotency (INV-4),
// và thực thi capability có cô lập lỗi.

import type { CapabilityRegistry } from './capabilityRegistry.js';
import { authorizeExecution } from './executionAuthorization.js';
import { createExecutionRecord } from './executionRecord.js';
import type { ToolExecutionRequest, GovernedToolExecutionResult } from './executionTypes.js';
import { validateExecutionRequest, redactSecrets } from './executionValidator.js';
import { ToolExecutor } from './toolExecutor.js';

export interface ExecuteOptions {
  readonly orchestrationStatus?: any;
  readonly decisionState?: any;
  readonly approvalMetadata?: any;
  readonly skipReplayCheck?: boolean;
}

export class ExecutionService {
  private readonly registry: CapabilityRegistry;
  private readonly executor: ToolExecutor;
  // User/Session scoped executed fingerprints set for strict replay protection (INV-4)
  private readonly executedFingerprints = new Set<string>();

  constructor(registry: CapabilityRegistry) {
    this.registry = registry;
    this.executor = new ToolExecutor(registry);
  }

  public getRegistry(): CapabilityRegistry {
    return this.registry;
  }

  public getExecutor(): ToolExecutor {
    return this.executor;
  }

  /**
   * EN: Authoritative pipeline executing an authorized request with replay protection.
   * VI: Pipeline có thẩm quyền thực thi yêu cầu đã được ủy quyền kèm bảo vệ chống replay.
   */
  public execute(
    request: ToolExecutionRequest,
    options: ExecuteOptions = {},
  ): GovernedToolExecutionResult {
    const startTime = Date.now();
    const actor = request.actor || {
      userId: request.userId || 'unknown',
      sessionId: request.sessionId || 'unknown',
    };
    const toolName = request.toolName || request.actionName || 'unknown';

    // 1. Security & Schema Validation (INV-12, INV-13, INV-14, INV-15)
    const validation = validateExecutionRequest(request);
    if (!validation.valid) {
      const errorMsg = validation.errors.join('; ');
      const sanitizedError = redactSecrets(errorMsg);
      const record = createExecutionRecord({
        executionFingerprint: request.executionFingerprint || 'exec_invalid',
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
        outcome: 'VALIDATION_FAILED',
        toolName,
        actionName: toolName,
        error: { message: sanitizedError },
        executionDurationMs: Date.now() - startTime,
        isReplay: false,
        record,
      });
    }

    // 2. Replay & Idempotency Boundary Check (INV-4)
    // Key is bound to ${userId}::${sessionId}::${executionFingerprint}
    const replayKey = `${actor.userId}::${actor.sessionId}::${request.executionFingerprint}`;
    if (!options.skipReplayCheck && this.executedFingerprints.has(replayKey)) {
      const errorMsg = `REPLAY_REJECTED: Replay detected for fingerprint "${request.executionFingerprint}".`;
      const record = createExecutionRecord({
        executionFingerprint: request.executionFingerprint,
        userId: actor.userId,
        sessionId: actor.sessionId,
        toolId: toolName,
        status: 'FAILED',
        success: false,
        replayStatus: 'REPLAY_REJECTED',
        error: errorMsg,
      });

      return Object.freeze({
        success: false,
        status: 'FAILED',
        outcome: 'REPLAY_REJECTED',
        toolName,
        actionName: toolName,
        error: { message: errorMsg },
        executionDurationMs: Date.now() - startTime,
        isReplay: true,
        record,
      });
    }

    // 3. Allowlist Capability Presence Check (INV-6)
    if (!this.registry.has(toolName)) {
      const errorMsg = `UNKNOWN_CAPABILITY: Capability "${toolName}" not found in registry.`;
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

    // 4. Execution Authorization Gate (INV-1, INV-2, INV-3)
    const authorization = request.authorization || authorizeExecution({
      request,
      registry: this.registry,
      orchestrationStatus: options.orchestrationStatus,
      decisionState: options.decisionState,
      approvalMetadata: options.approvalMetadata || (request as any).approvalMetadata,
    });

    if (!authorization.authorized) {
      const errorMsg = authorization.reason || 'UNAUTHORIZED: Execution authorization denied by gate.';
      const sanitizedError = redactSecrets(errorMsg);
      const record = createExecutionRecord({
        executionFingerprint: request.executionFingerprint,
        userId: actor.userId,
        sessionId: actor.sessionId,
        toolId: toolName,
        risk: authorization.risk,
        status: 'BLOCKED',
        success: false,
        error: sanitizedError,
      });

      return Object.freeze({
        success: false,
        status: 'BLOCKED',
        outcome: 'AUTHORIZATION_DENIED',
        toolName,
        actionName: toolName,
        riskLevel: authorization.risk,
        error: { message: sanitizedError },
        executionDurationMs: Date.now() - startTime,
        isReplay: false,
        record,
      });
    }

    // 5. Bind Authorized Context to Request
    const authorizedRequest: ToolExecutionRequest = Object.freeze({
      ...request,
      authorization,
    });

    // 6. Execute via Controlled ToolExecutor
    const result = this.executor.execute(authorizedRequest);

    // 7. Record Execution Identity on Success to Prevent Replays
    if (result.success) {
      this.executedFingerprints.add(replayKey);
    }

    // Preserve governance metadata on result if present
    const governanceMetadata = (request as any).governanceMetadata;
    if (governanceMetadata) {
      return Object.freeze({
        ...result,
        governanceMetadata,
      });
    }

    return result;
  }
}
