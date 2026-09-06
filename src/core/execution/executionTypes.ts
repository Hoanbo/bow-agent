// src/core/execution/executionTypes.ts
// BOWCON V4.0 — MILESTONE 1.3.12: GOVERNED TOOL EXECUTION TYPES
//
// EN:
// Authoritative type definitions for the Governed Tool Execution Runtime.
// Provides strong contracts for execution authorization, requests, outcomes, and records.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền cho Runtime Thực thi Công cụ có Quản trị.
// Cung cấp các hợp đồng chặt chẽ cho ủy quyền thực thi, yêu cầu, kết quả và bản ghi thực thi.

import type { PlanRiskLevel } from '../planning/planningTypes.js';

/**
 * EN: Explicit execution lifecycle status.
 * VI: Trạng thái vòng đời thực thi tường minh.
 */
export type ExecutionStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'BLOCKED'
  | 'READY'
  | 'AUTHORIZED'
  | 'EXECUTING'
  | 'SUCCEEDED'
  | 'REPLAY_REJECTED'
  | 'UNAUTHORIZED'
  | 'INVALID';

/**
 * EN: High-level execution outcome classification.
 * VI: Phân loại kết quả thực thi cấp cao.
 */
export type ExecutionOutcome =
  | 'COMPLETED'
  | 'AUTHORIZATION_DENIED'
  | 'REPLAY_REJECTED'
  | 'CAPABILITY_NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'HANDLER_FAILED'
  | 'SUCCESS'
  | 'FAILURE'
  | 'BLOCKED'
  | 'REPLAY';

/**
 * EN: Replay and idempotency status.
 * VI: Trạng thái lặp lại (replay) và bất biến lặp (idempotency).
 */
export type ReplayStatus =
  | 'NOT_REPLAY'
  | 'IDEMPOTENT_HIT'
  | 'REPLAY_REJECTED';

/**
 * EN: Authoritative authorization decision returned by ExecutionAuthorization gate.
 * VI: Quyết định ủy quyền có thẩm quyền do cổng ExecutionAuthorization trả về.
 */
export interface ExecutionAuthorization {
  readonly authorized: boolean;
  readonly reason?: string;
  readonly approvalVerified?: boolean;
  readonly risk: PlanRiskLevel;
  readonly executionFingerprint: string;
  readonly toolName: string;
  readonly actor: {
    readonly userId: string;
    readonly sessionId: string;
    readonly role?: string;
    readonly isOwner?: boolean;
  };
  readonly requiredParameters?: readonly string[];
}

/**
 * EN: Structured request prepared for controlled capability execution.
 * VI: Yêu cầu có cấu trúc được chuẩn bị cho việc thực thi capability có kiểm soát.
 */
export interface ToolExecutionRequest {
  readonly requestId?: string;
  readonly executionId?: string;
  readonly toolName?: string;
  readonly actionName?: string;
  readonly args?: Readonly<Record<string, unknown>>;
  readonly parameters?: Readonly<Record<string, unknown>>;
  readonly actor?: {
    readonly userId: string;
    readonly sessionId: string;
    readonly role?: string;
    readonly isOwner?: boolean;
  };
  readonly userId?: string;
  readonly sessionId?: string;
  readonly riskLevel?: PlanRiskLevel;
  readonly risk?: PlanRiskLevel;
  readonly executionFingerprint: string;
  readonly idempotencyKey?: string;
  readonly executionToken?: string;
  readonly executionScope?: string;
  readonly governanceMetadata?: Readonly<Record<string, unknown>>;
  readonly approvalMetadata?: Readonly<Record<string, unknown>>;
  readonly createdAt?: number;
  readonly authorization?: ExecutionAuthorization;
}

/**
 * EN: Immutable execution audit record for durable tracking and replay protection.
 * VI: Bản ghi kiểm toán thực thi bất biến để theo dõi bền vững và bảo vệ chống replay.
 */
export interface ExecutionRecord {
  readonly executionFingerprint: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly toolId: string;
  readonly actionId: string;
  readonly domain: string;
  readonly risk: PlanRiskLevel;
  readonly status: ExecutionStatus;
  readonly success: boolean;
  readonly replayStatus: ReplayStatus;
  readonly sanitizedError?: string;
  readonly outputMetadata: Readonly<Record<string, unknown>>;
  readonly executedAt: string;
}

/**
 * EN: Authoritative execution result returned by ToolExecutor.
 * VI: Kết quả thực thi có thẩm quyền do ToolExecutor trả về.
 */
export interface GovernedToolExecutionResult {
  readonly success: boolean;
  readonly status: ExecutionStatus;
  readonly outcome: ExecutionOutcome;
  readonly toolName: string;
  readonly actionName?: string;
  readonly riskLevel?: PlanRiskLevel | string;
  readonly result?: { data: unknown };
  readonly output?: unknown;
  readonly error?: { message: string; code?: string };
  readonly executionDurationMs: number;
  readonly isReplay: boolean;
  readonly replayStatus?: ReplayStatus;
  readonly governanceMetadata?: Readonly<Record<string, unknown>>;
  readonly executionFingerprint?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly executedAt?: string;
  readonly record?: ExecutionRecord;
}

export type GovernedExecutionResult = GovernedToolExecutionResult;

/**
 * EN: Sanitized error thrown or returned during execution lifecycle.
 * VI: Lỗi đã được khử trùng được ném ra hoặc trả về trong vòng đời thực thi.
 */
export class ExecutionError extends Error {
  public readonly code: ExecutionStatus;
  public readonly sanitized: boolean;

  constructor(code: ExecutionStatus, message: string, sanitized = true) {
    super(message);
    this.name = 'ExecutionError';
    this.code = code;
    this.sanitized = sanitized;
    Object.setPrototypeOf(this, ExecutionError.prototype);
  }
}
