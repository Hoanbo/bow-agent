// src/core/execution/executionRecord.ts
// BOWCON V4.0 — MILESTONE 1.3.12: IMMUTABLE EXECUTION RECORD
//
// EN:
// Factory and utilities for creating immutable execution audit records.
// Guarantees zero secret leakage (INV-12) and strict immutability (INV-10).
//
// VI:
// Factory và các tiện ích để tạo bản ghi kiểm toán thực thi bất biến.
// Đảm bảo không rò rỉ bí mật (INV-12) và tính bất biến nghiêm ngặt (INV-10).

import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { ExecutionRecord, ExecutionStatus, ReplayStatus } from './executionTypes.js';
import { redactSecrets } from './executionValidator.js';

export interface CreateRecordParams {
  readonly executionFingerprint: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly toolId: string;
  readonly actionId?: string;
  readonly domain?: string;
  readonly risk?: PlanRiskLevel;
  readonly status: ExecutionStatus;
  readonly success: boolean;
  readonly replayStatus?: ReplayStatus;
  readonly error?: string;
  readonly outputMetadata?: Readonly<Record<string, unknown>>;
  readonly executedAt?: string;
}

/**
 * EN: Creates an immutable ExecutionRecord with sanitized errors and frozen attributes.
 * VI: Tạo ExecutionRecord bất biến với lỗi đã được khử trùng và các thuộc tính được đóng băng.
 */
export function createExecutionRecord(params: CreateRecordParams): ExecutionRecord {
  const sanitizedError = params.error ? redactSecrets(params.error) : undefined;

  const outputMetadataCopy: Record<string, unknown> = {};
  if (params.outputMetadata && typeof params.outputMetadata === 'object') {
    for (const [k, v] of Object.entries(params.outputMetadata)) {
      if (typeof v === 'string') {
        outputMetadataCopy[k] = redactSecrets(v);
      } else {
        outputMetadataCopy[k] = v;
      }
    }
  }

  return Object.freeze({
    executionFingerprint: params.executionFingerprint,
    userId: params.userId,
    sessionId: params.sessionId,
    toolId: params.toolId,
    actionId: params.actionId || params.toolId,
    domain: params.domain || 'system',
    risk: params.risk || 'LOW',
    status: params.status,
    success: params.success,
    replayStatus: params.replayStatus || 'NOT_REPLAY',
    sanitizedError,
    outputMetadata: Object.freeze(outputMetadataCopy),
    executedAt: params.executedAt || '2026-09-06T00:00:00.000Z',
  });
}
