// src/core/toolAdapter/productionToolAdapterRuntime.ts
// BOWCON V4.0 — MS-1.4.06: PRODUCTION TOOL ADAPTER RUNTIME
//
// EN:
// Master execution coordinator for the Production Tool Adapter Plane.
// Orchestrates:
//   1. Handoff validation against authoritative task state & security bounds
//   2. 4-checkpoint USER_STOP enforcement
//   3. Deterministic tool adapter resolution
//   4. Bounded execution with strict timeout & failure containment
//   5. Output sanitization via DiagnosisSanitizer and size capping
//   6. Tamper-evident cryptographic execution provenance chaining
//   7. Canonical structured audit logging to globalAuditLedger
//   8. Proper cleanup of PEP execution leases
//
// VI:
// Bộ điều phối thực thi chính cho Mặt phẳng Adapter Công cụ Sản xuất.
// Điều phối:
//   1. Xác thực bàn giao với trạng thái tác vụ có thẩm quyền & ranh giới an ninh
//   2. Thực thi USER_STOP tại 4 điểm kiểm tra
//   3. Phân giải adapter công cụ xác định
//   4. Thực thi có giới hạn với thời gian chờ nghiêm ngặt & cô lập lỗi
//   5. Khử trùng kết quả đầu ra qua DiagnosisSanitizer và giới hạn kích thước
//   6. Tạo chuỗi nguồn gốc thực thi mật mã chống giả mạo
//   7. Ghi nhật ký kiểm toán chuẩn tắc vào globalAuditLedger
//   8. Dọn dẹp hợp lệ các lease thực thi của PEP

import crypto from 'node:crypto';
import type { AuthorizedActionHandoff } from '../actionProposal/actionProposalTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import type { AgentTaskStore } from '../taskLifecycle/agentTaskStore.js';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import { GovernedPolicyEnforcementPoint, globalGovernedPEP } from '../policyEnforcement/index.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import {
  type ToolAdapter,
  type ToolAdapterContext,
  type ToolAdapterResult,
  type ToolAdapterExecutionResult,
  type ToolAdapterRequest,
  type ToolExecutionStatus,
  type ToolAdapterAuditEventType,
  TOOL_ADAPTER_AUDIT_DOMAIN,
  DEFAULT_EXECUTION_TIMEOUT_MS,
  MAX_EXECUTION_TIMEOUT_MS,
  MAX_RESULT_PAYLOAD_BYTES,
  ToolAdapterTimeoutError,
  ToolExecutionFailureError,
  ToolReplayError,
  ToolAdapterError,
} from './toolAdapterTypes.js';
import { ToolAdapterRegistry, globalToolAdapterRegistry } from './toolAdapterRegistry.js';
import { AuthorizedHandoffValidator, globalAuthorizedHandoffValidator } from './authorizedHandoffValidator.js';
import { ToolExecutionGate, globalToolExecutionGate } from './toolExecutionGate.js';

export interface ProductionToolAdapterRuntimeOptions {
  readonly registry?: ToolAdapterRegistry;
  readonly validator?: AuthorizedHandoffValidator;
  readonly executionGate?: ToolExecutionGate;
  readonly sanitizer?: DiagnosisSanitizer;
  readonly auditLedger?: AuditLedger;
  readonly pep?: GovernedPolicyEnforcementPoint;
  readonly taskStore?: AgentTaskStore;
  readonly deterministicTimestamp?: string;
  readonly defaultTimeoutMs?: number;
}

export interface ExecuteHandoffOptions {
  readonly authoritativeTask?: AgentTask;
  readonly correlationId?: string;
  readonly timeoutMs?: number;
}

export class ProductionToolAdapterRuntime {
  private readonly registry: ToolAdapterRegistry;
  private readonly validator: AuthorizedHandoffValidator;
  private readonly executionGate: ToolExecutionGate;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly auditLedger: AuditLedger;
  private readonly pep: GovernedPolicyEnforcementPoint;
  private readonly taskStore?: AgentTaskStore;
  private readonly deterministicTimestamp?: string;
  private readonly defaultTimeoutMs: number;

  // Single-use execution tracker to prevent duplicate/replay executions
  private readonly executedHandoffHashes = new Set<string>();

  constructor(options?: ProductionToolAdapterRuntimeOptions) {
    this.registry = options?.registry ?? globalToolAdapterRegistry;
    this.validator = options?.validator ?? globalAuthorizedHandoffValidator;
    this.executionGate = options?.executionGate ?? globalToolExecutionGate;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.pep = options?.pep ?? globalGovernedPEP;
    this.taskStore = options?.taskStore;
    this.deterministicTimestamp = options?.deterministicTimestamp;
    this.defaultTimeoutMs = Math.min(
      options?.defaultTimeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS,
      MAX_EXECUTION_TIMEOUT_MS
    );
  }

  /**
   * Executes a ToolAdapterRequest envelope under strict Level 4 governance.
   */
  public async executeRequest(request: ToolAdapterRequest): Promise<ToolAdapterResult> {
    return this.executeHandoff(request.handoff, {
      authoritativeTask: request.authoritativeTask,
      correlationId: request.correlationId,
      timeoutMs: request.timeoutMs,
    });
  }

  /**
   * Executes an AuthorizedActionHandoff under strict Level 4 governance.
   */
  public async executeHandoff(
    handoff: AuthorizedActionHandoff,
    options?: ExecuteHandoffOptions
  ): Promise<ToolAdapterResult> {
    const startTime = Date.now();
    const now = this.deterministicTimestamp || new Date().toISOString();

    // ------------------------------------------------------------------------
    // GATE 1: USER_STOP Check before Request Acceptance
    // ------------------------------------------------------------------------
    try {
      this.executionGate.assertCanAcceptRequest({
        proposalId: handoff?.proposalId,
        toolName: handoff?.toolName,
      });
    } catch (err: any) {
      this.recordAudit({
        eventType: 'TOOL_USER_STOP_ABORTED',
        toolName: handoff?.toolName || 'unknown',
        status: 'BLOCKED',
        policyDecision: 'DENY',
        details: { gate: 'GATE_1_BEFORE_REQUEST_ACCEPTANCE', reason: err.message },
      });
      throw err;
    }

    this.recordAudit({
      eventType: 'TOOL_EXECUTION_REQUESTED',
      toolName: handoff?.toolName || 'unknown',
      status: 'BLOCKED',
      policyDecision: 'PERMIT',
      details: {
        proposalId: handoff?.proposalId,
        taskId: handoff?.taskId,
        stepId: handoff?.stepId,
      },
    });

    // Resolve authoritative task if taskStore is present and task was not injected
    let resolvedTask = options?.authoritativeTask;
    if (!resolvedTask && this.taskStore && handoff?.tenantId && handoff?.taskId) {
      const stored = await this.taskStore.getTask(handoff.tenantId, handoff.taskId);
      if (stored) {
        resolvedTask = stored;
      }
    }

    // ------------------------------------------------------------------------
    // Handoff & Security Validation
    // ------------------------------------------------------------------------
    try {
      this.validator.validateHandoff(handoff, resolvedTask);
    } catch (err: any) {
      const eventType: ToolAdapterAuditEventType =
        err.code === 'CROSS_TENANT_TOOL_EXECUTION_ERROR'
          ? 'TOOL_TENANT_VIOLATION'
          : err.code === 'STALE_TOOL_EXECUTION_ERROR'
          ? 'TOOL_STALE_REJECTED'
          : err.code === 'TOOL_SECURITY_VIOLATION'
          ? 'TOOL_GUARDRAIL_REJECTED'
          : 'TOOL_INVALID_PROVENANCE';

      this.recordAudit({
        eventType,
        toolName: handoff?.toolName || 'unknown',
        status: 'BLOCKED',
        policyDecision: 'DENY',
        details: { error: err.message, code: err.code },
      });
      throw err;
    }

    // Replay check
    if (this.executedHandoffHashes.has(handoff.handoffProvenanceHash)) {
      this.recordAudit({
        eventType: 'TOOL_REPLAY_REJECTED',
        toolName: handoff.toolName,
        status: 'BLOCKED',
        policyDecision: 'DENY',
        details: {
          proposalId: handoff.proposalId,
          provenanceHash: handoff.handoffProvenanceHash,
        },
      });
      throw new ToolReplayError(
        `TOOL_REPLAY_FORBIDDEN: Authorized handoff with hash "${handoff.handoffProvenanceHash}" has already been executed.`
      );
    }

    this.recordAudit({
      eventType: 'TOOL_HANDOFF_VALIDATED',
      toolName: handoff.toolName,
      status: 'BLOCKED',
      policyDecision: 'PERMIT',
      details: {
        proposalId: handoff.proposalId,
        taskId: handoff.taskId,
        provenanceHash: handoff.handoffProvenanceHash,
      },
    });

    // ------------------------------------------------------------------------
    // GATE 2: USER_STOP Check before Adapter Resolution
    // ------------------------------------------------------------------------
    try {
      this.executionGate.assertCanResolveAdapter({
        proposalId: handoff.proposalId,
        toolName: handoff.toolName,
      });
    } catch (err: any) {
      this.recordAudit({
        eventType: 'TOOL_USER_STOP_ABORTED',
        toolName: handoff.toolName,
        status: 'BLOCKED',
        policyDecision: 'DENY',
        details: { gate: 'GATE_2_BEFORE_ADAPTER_RESOLUTION', reason: err.message },
      });
      throw err;
    }

    // ------------------------------------------------------------------------
    // Adapter Resolution
    // ------------------------------------------------------------------------
    let adapter: ToolAdapter;
    try {
      adapter = this.registry.resolveAdapter(handoff.toolName);
    } catch (err: any) {
      const eventType: ToolAdapterAuditEventType =
        err.code === 'TOOL_ADAPTER_DISABLED'
          ? 'TOOL_DISABLED_ADAPTER'
          : 'TOOL_UNKNOWN_ADAPTER';

      this.recordAudit({
        eventType,
        toolName: handoff.toolName,
        status: 'BLOCKED',
        policyDecision: 'DENY',
        details: { error: err.message, code: err.code },
      });
      throw err;
    }

    this.recordAudit({
      eventType: 'TOOL_ADAPTER_RESOLVED',
      toolName: handoff.toolName,
      status: 'BLOCKED',
      policyDecision: 'PERMIT',
      details: {
        domain: adapter.domain,
        toolName: adapter.toolName,
      },
    });

    // ------------------------------------------------------------------------
    // GATE 3: USER_STOP Check immediately before Adapter Invocation
    // ------------------------------------------------------------------------
    try {
      this.executionGate.assertCanInvokeAdapter({
        proposalId: handoff.proposalId,
        toolName: handoff.toolName,
      });
    } catch (err: any) {
      this.recordAudit({
        eventType: 'TOOL_USER_STOP_ABORTED',
        toolName: handoff.toolName,
        status: 'BLOCKED',
        policyDecision: 'DENY',
        details: { gate: 'GATE_3_BEFORE_ADAPTER_INVOCATION', reason: err.message },
      });
      throw err;
    }

    // ------------------------------------------------------------------------
    // Execution with Bounded Timeout & Error Containment
    // ------------------------------------------------------------------------
    const timeoutMs = Math.min(
      options?.timeoutMs ?? this.defaultTimeoutMs,
      MAX_EXECUTION_TIMEOUT_MS
    );

    const context: ToolAdapterContext = {
      taskId: handoff.taskId,
      tenantId: handoff.tenantId,
      proposalId: handoff.proposalId,
      stepId: handoff.stepId,
      toolName: handoff.toolName,
      correlationId: options?.correlationId,
      leaseId: handoff.leaseId,
      executionToken: handoff.executionToken,
      timeoutMs,
      executedAt: now,
    };

    this.recordAudit({
      eventType: 'TOOL_EXECUTION_STARTED',
      toolName: handoff.toolName,
      status: 'BLOCKED',
      policyDecision: 'PERMIT',
      details: {
        proposalId: handoff.proposalId,
        timeoutMs,
        leaseId: handoff.leaseId,
      },
    });

    let rawOutput: unknown;
    let executionStatus: ToolExecutionStatus = 'SUCCESS';
    let executionError: { code: string; message: string; details?: Readonly<Record<string, unknown>> } | undefined;

    try {
      rawOutput = await this.invokeWithTimeout(adapter, handoff.sanitizedArgs, context, timeoutMs);
    } catch (err: any) {
      if (err instanceof ToolAdapterTimeoutError || err.code === 'TOOL_ADAPTER_TIMEOUT') {
        executionStatus = 'TIMED_OUT';
        executionError = {
          code: 'TOOL_ADAPTER_TIMEOUT',
          message: err.message,
        };
        this.recordAudit({
          eventType: 'TOOL_EXECUTION_TIMED_OUT',
          toolName: handoff.toolName,
          status: 'FAILURE',
          policyDecision: 'PERMIT',
          details: { error: err.message },
        });
        throw err;
      }

      // Adapter execution failure
      executionStatus = 'FAILURE';
      const sanitizedErrorMsg = this.sanitizer.sanitizeString(err?.message || 'Tool adapter failed with unknown error.');
      executionError = {
        code: err?.code || 'TOOL_EXECUTION_FAILURE',
        message: sanitizedErrorMsg,
      };

      this.recordAudit({
        eventType: 'TOOL_EXECUTION_FAILED',
        toolName: handoff.toolName,
        status: 'FAILURE',
        policyDecision: 'PERMIT',
        details: { error: sanitizedErrorMsg },
      });

      throw new ToolExecutionFailureError(sanitizedErrorMsg, { originalCode: err?.code });
    } finally {
      // Lease cleanup: Always release the PEP execution lease upon exit
      if (handoff.leaseId) {
        try {
          this.pep.releaseLease(handoff.leaseId as any);
        } catch {
          // Lease release failure must not mask primary execution result
        }
      }
    }

    // ------------------------------------------------------------------------
    // Output Sanitization & Size Capping
    // ------------------------------------------------------------------------
    const sanitizedOutput = this.sanitizeAndBoundOutput(rawOutput);

    // ------------------------------------------------------------------------
    // GATE 4: USER_STOP Check after Adapter Return / before Result Emission
    // ------------------------------------------------------------------------
    try {
      this.executionGate.assertCanEmitResult({
        proposalId: handoff.proposalId,
        toolName: handoff.toolName,
      });
    } catch (err: any) {
      this.recordAudit({
        eventType: 'TOOL_USER_STOP_ABORTED',
        toolName: handoff.toolName,
        status: 'BLOCKED',
        policyDecision: 'DENY',
        details: { gate: 'GATE_4_BEFORE_RESULT_EMISSION', reason: err.message },
      });
      throw err;
    }

    // Mark handoff as executed to prevent replay
    this.executedHandoffHashes.add(handoff.handoffProvenanceHash);

    const executionDurationMs = Date.now() - startTime;

    // Cryptographic Execution Provenance
    const executionProvenanceHash = this.calculateExecutionProvenanceHash({
      handoffProvenanceHash: handoff.handoffProvenanceHash,
      toolName: handoff.toolName,
      status: executionStatus,
      sanitizedOutput,
      executedAt: now,
    });

    this.recordAudit({
      eventType: 'TOOL_EXECUTION_COMPLETED',
      toolName: handoff.toolName,
      status: 'SUCCESS',
      policyDecision: 'PERMIT',
      details: {
        proposalId: handoff.proposalId,
        executionDurationMs,
        executionProvenanceHash,
      },
    });

    const executionId = `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const result: ToolAdapterResult = {
      executionId,
      proposalId: handoff.proposalId,
      taskId: handoff.taskId,
      tenantId: handoff.tenantId,
      stepId: handoff.stepId,
      toolName: handoff.toolName,
      domain: adapter.domain,
      status: executionStatus,
      executionDurationMs,
      executedAt: now,
      sanitizedOutput,
      externalUntrusted: true,
      handoffProvenanceHash: handoff.handoffProvenanceHash,
      executionProvenanceHash,
      error: executionError,
    };

    return Object.freeze(result);
  }

  /**
   * Invokes adapter with bounded timeout.
   */
  private async invokeWithTimeout(
    adapter: ToolAdapter,
    args: Readonly<Record<string, unknown>>,
    context: ToolAdapterContext,
    timeoutMs: number
  ): Promise<unknown> {
    let timerId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => {
        reject(
          new ToolAdapterTimeoutError(
            `EXECUTION_TIMEOUT: Tool adapter "${adapter.toolName}" exceeded maximum timeout of ${timeoutMs}ms.`
          )
        );
      }, timeoutMs);
    });

    try {
      const execPromise = adapter.execute(args, context);
      return await Promise.race([execPromise, timeoutPromise]);
    } finally {
      if (timerId) {
        clearTimeout(timerId);
      }
    }
  }

  /**
   * Deeply sanitizes output and caps maximum byte size.
   */
  public sanitizeAndBoundOutput(output: unknown): unknown {
    if (output === null || output === undefined) {
      return output;
    }

    const sanitized = this.sanitizer.sanitize(output);

    // Enforce size limit
    try {
      const serialized = JSON.stringify(sanitized);
      const byteLength = Buffer.byteLength(serialized, 'utf8');

      if (byteLength > MAX_RESULT_PAYLOAD_BYTES) {
        return {
          _truncated: true,
          _originalSizeBytes: byteLength,
          _maxAllowedBytes: MAX_RESULT_PAYLOAD_BYTES,
          summary: `Output payload truncated because it exceeded ${MAX_RESULT_PAYLOAD_BYTES} bytes.`,
        };
      }
    } catch {
      // In case of circular reference or stringify failure, sanitize defensively
      return '[UNSERIALIZABLE_OUTPUT]';
    }

    return sanitized;
  }

  /**
   * Deterministically calculates cryptographic execution provenance hash.
   */
  public calculateExecutionProvenanceHash(params: {
    handoffProvenanceHash: string;
    toolName: string;
    status: ToolExecutionStatus;
    sanitizedOutput: unknown;
    executedAt: string;
  }): string {
    const raw = [
      params.handoffProvenanceHash,
      params.toolName,
      params.status,
      JSON.stringify(params.sanitizedOutput ?? ''),
      params.executedAt,
    ].join('|');

    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  /**
   * Appends an event to the global audit ledger under domain agent_tool_execution.
   */
  private recordAudit(params: {
    eventType: ToolAdapterAuditEventType;
    toolName: string;
    status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
    policyDecision: 'PERMIT' | 'DENY';
    details: Record<string, unknown>;
  }): void {
    try {
      const timestamp = this.deterministicTimestamp || new Date().toISOString();
      const sanitizedDetails = this.sanitizer.sanitize(params.details) as Record<string, unknown>;

      this.auditLedger.record({
        timestamp,
        actor: {
          userId: (sanitizedDetails.userId as string) || 'tool_adapter_runtime',
          role: 'agent',
          channel: 'governance',
        },
        domain: TOOL_ADAPTER_AUDIT_DOMAIN,
        toolName: params.toolName,
        classification: params.eventType,
        argumentsHash: crypto
          .createHash('sha256')
          .update(JSON.stringify(sanitizedDetails))
          .digest('hex'),
        policyDecision: params.policyDecision,
        executionStatus: params.status,
      });
    } catch {
      // Audit recording failures must never compromise security fail-closed semantics
    }
  }

  /**
   * Resets execution replay tracking (for testing purposes).
   */
  public resetReplayTracker(): void {
    this.executedHandoffHashes.clear();
  }
}

export const globalProductionToolAdapterRuntime = new ProductionToolAdapterRuntime();
