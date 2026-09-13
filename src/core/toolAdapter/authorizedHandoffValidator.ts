// src/core/toolAdapter/authorizedHandoffValidator.ts
// BOWCON V4.0 — MS-1.4.06: AUTHORIZED HANDOFF VALIDATOR
//
// EN:
// Authoritative validator for incoming AuthorizedActionHandoff envelopes.
// Ensures that only structurally valid, cryptographically bound, non-expired,
// tenant-isolated, and PERMIT-authorized action handoffs may enter execution.
// Fails closed on any inconsistency, tampering, or forbidden action.
//
// VI:
// Bộ xác thực có thẩm quyền cho các phong bì AuthorizedActionHandoff đến.
// Đảm bảo chỉ các bàn giao hành động hợp lệ về mặt cấu trúc, ràng buộc mật mã,
// chưa hết hạn, cô lập tenant và được ủy quyền PERMIT mới được phép vào thực thi.
// Thất bại theo dạng đóng (fail-closed) trước bất kỳ sự bất nhất, giả mạo hoặc hành động bị cấm nào.

import type { AuthorizedActionHandoff } from '../actionProposal/actionProposalTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { CANONICAL_HARD_FORBIDDEN_ACTIONS } from '../policyEnforcement/policyEnforcementTypes.js';
import {
  ToolHandoffValidationError,
  ToolSecurityViolationError,
  CrossTenantToolExecutionError,
  StaleToolExecutionError,
  MAX_ARG_PAYLOAD_BYTES,
  MAX_ARG_DEPTH,
} from './toolAdapterTypes.js';

export class AuthorizedHandoffValidator {
  /**
   * Validates an AuthorizedActionHandoff envelope against authoritative task state and security bounds.
   * Throws typed ToolAdapterError subclasses fail-closed upon any validation failure.
   */
  public validateHandoff(
    handoff: unknown,
    authoritativeTask?: AgentTask,
    currentTimeMs?: number
  ): asserts handoff is AuthorizedActionHandoff {
    // 1. Structural & object type verification
    if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)) {
      throw new ToolHandoffValidationError('MALFORMED_HANDOFF: Handoff envelope must be a non-null object.');
    }

    const candidate = handoff as Record<string, unknown>;

    // 2. Mandatory field presence & string invariants
    const requiredStringFields = [
      'proposalId',
      'taskId',
      'tenantId',
      'stepId',
      'toolName',
      'policyVersion',
      'handoffProvenanceHash',
      'authorizedAt',
      'expiresAt',
    ] as const;

    for (const field of requiredStringFields) {
      const val = candidate[field];
      if (typeof val !== 'string' || !val.trim()) {
        throw new ToolHandoffValidationError(
          `MISSING_FIELD: Handoff field "${field}" must be a non-empty string.`
        );
      }
    }

    // 3. Authorization Decision MUST be 'PERMIT'
    if (candidate.authorizationDecision !== 'PERMIT') {
      throw new ToolHandoffValidationError(
        `UNAUTHORIZED_DECISION: Execution requires authorizationDecision === 'PERMIT', received "${String(
          candidate.authorizationDecision
        )}".`
      );
    }

    // 4. Expiration check
    const now = currentTimeMs ?? Date.now();
    const expiresAtMs = Date.parse(candidate.expiresAt as string);
    if (Number.isNaN(expiresAtMs)) {
      throw new ToolHandoffValidationError(
        `INVALID_TIMESTAMP: Field "expiresAt" ("${candidate.expiresAt}") is not a valid ISO date.`
      );
    }

    if (expiresAtMs <= now) {
      throw new ToolHandoffValidationError(
        `HANDOFF_EXPIRED: Authorized handoff expired at ${candidate.expiresAt} (current time: ${new Date(
          now
        ).toISOString()}).`
      );
    }

    // 5. Hard-forbidden action safety floor
    const toolName = (candidate.toolName as string).trim();
    if (CANONICAL_HARD_FORBIDDEN_ACTIONS.includes(toolName)) {
      throw new ToolSecurityViolationError(
        `HARD_FORBIDDEN_ACTION: Action "${toolName}" is permanently FORBIDDEN by canonical safety floor.`
      );
    }

    // 6. Provenance hash format check (SHA-256 hex string)
    const provHash = candidate.handoffProvenanceHash as string;
    if (!/^[a-f0-9]{64}$/i.test(provHash)) {
      throw new ToolHandoffValidationError(
        `INVALID_PROVENANCE_HASH: "handoffProvenanceHash" must be a 64-character hex SHA-256 digest.`
      );
    }

    // 7. Authoritative Task & Tenant binding
    if (authoritativeTask) {
      if (candidate.taskId !== authoritativeTask.taskId) {
        throw new ToolHandoffValidationError(
          `TASK_ID_MISMATCH: Handoff taskId "${candidate.taskId}" does not match authoritative taskId "${authoritativeTask.taskId}".`
        );
      }

      if (candidate.tenantId !== authoritativeTask.tenantId) {
        throw new CrossTenantToolExecutionError(
          `CROSS_TENANT_TASK: Handoff tenantId "${candidate.tenantId}" does not match authoritative task tenantId "${authoritativeTask.tenantId}".`
        );
      }

      // Check task version freshness if taskVersion is present on handoff
      if (typeof candidate.taskVersion === 'number') {
        if (candidate.taskVersion !== authoritativeTask.version) {
          throw new StaleToolExecutionError(
            `STALE_TASK_VERSION: Handoff taskVersion (${candidate.taskVersion}) does not match current task version (${authoritativeTask.version}).`
          );
        }
      }
    }

    // 8. Defensive arguments validation
    const args = candidate.sanitizedArgs;
    if (args !== undefined && args !== null) {
      if (typeof args !== 'object' || Array.isArray(args)) {
        throw new ToolHandoffValidationError(
          'INVALID_ARGUMENTS: Field "sanitizedArgs" must be a plain key-value object.'
        );
      }

      this.validateArgumentsDefensively(args as Record<string, unknown>);
    }
  }

  /**
   * Defensively validates argument payload against size bounds, depth limits, prototype pollution, and null bytes.
   */
  public validateArgumentsDefensively(args: Record<string, unknown>): void {
    let serialized: string;
    try {
      serialized = JSON.stringify(args);
    } catch {
      throw new ToolSecurityViolationError('UNSERIALIZABLE_ARGS: Arguments cannot be serialized to JSON.');
    }

    const byteLength = Buffer.byteLength(serialized, 'utf8');
    if (byteLength > MAX_ARG_PAYLOAD_BYTES) {
      throw new ToolSecurityViolationError(
        `PAYLOAD_SIZE_EXCEEDED: Arguments payload size (${byteLength} bytes) exceeds maximum limit of ${MAX_ARG_PAYLOAD_BYTES} bytes.`
      );
    }

    // Direct serialized key inspection
    if (/(?:__proto__|constructor|prototype)\s*":/i.test(serialized) || serialized.includes('"__proto__"')) {
      throw new ToolSecurityViolationError(
        'PROTOTYPE_POLLUTION_KEY: Forbidden prototype pollution key detected in arguments payload.'
      );
    }

    // Deep recursive scan for dangerous keys, abnormal prototype chains, null bytes, and recursion depth
    this.scanRecursive(args, 0);
  }

  private scanRecursive(val: unknown, currentDepth: number): void {
    if (currentDepth > MAX_ARG_DEPTH) {
      throw new ToolSecurityViolationError(
        `MAX_DEPTH_EXCEEDED: Arguments recursion depth exceeds limit of ${MAX_ARG_DEPTH}.`
      );
    }

    if (val === null || val === undefined) {
      return;
    }

    if (typeof val === 'string') {
      if (val.includes('\0')) {
        throw new ToolSecurityViolationError('NULL_BYTE_DETECTED: Arguments contain forbidden null byte (\\0).');
      }
      return;
    }

    if (Array.isArray(val)) {
      for (const item of val) {
        this.scanRecursive(item, currentDepth + 1);
      }
      return;
    }

    if (typeof val === 'object') {
      // Prototype chain inspection
      const proto = Object.getPrototypeOf(val);
      if (proto !== null && proto !== Object.prototype && proto !== Array.prototype) {
        throw new ToolSecurityViolationError(
          'PROTOTYPE_POLLUTION_KEY: Abnormal prototype hierarchy detected in arguments.'
        );
      }

      if (
        Object.prototype.hasOwnProperty.call(val, '__proto__') ||
        Object.prototype.hasOwnProperty.call(val, 'prototype') ||
        (Object.prototype.hasOwnProperty.call(val, 'constructor') && typeof (val as any).constructor !== 'function')
      ) {
        throw new ToolSecurityViolationError(
          'PROTOTYPE_POLLUTION_KEY: Forbidden prototype pollution property detected in arguments.'
        );
      }

      for (const key of Object.keys(val)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          throw new ToolSecurityViolationError(
            `PROTOTYPE_POLLUTION_KEY: Forbidden prototype pollution key "${key}" detected in arguments.`
          );
        }

        if (key.includes('\0')) {
          throw new ToolSecurityViolationError('NULL_BYTE_DETECTED: Object key contains forbidden null byte (\\0).');
        }

        this.scanRecursive((val as Record<string, unknown>)[key], currentDepth + 1);
      }
    }
  }

}

export const globalAuthorizedHandoffValidator = new AuthorizedHandoffValidator();
