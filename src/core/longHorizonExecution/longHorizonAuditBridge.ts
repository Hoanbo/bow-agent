// src/core/longHorizonExecution/longHorizonAuditBridge.ts
// BOWCON V4.0 — MS-1.5.11: LONG-HORIZON AUDIT BRIDGE
// Component 1085 — REAL
//
// EN: Emits structured, sanitized, cryptographically provenanced audit events to AuditLedger.
//     Strictly scrubs raw credentials, passwords, bearer tokens, and CoT reasoning traces.
// VI: Phát ra các sự kiện kiểm toán có cấu trúc, được khử trùng, có nguồn gốc mật mã tới AuditLedger.
//     Lọc nghiêm ngặt thông tin xác thực thô, mật khẩu, mã bearer và dấu vết suy luận CoT.

import crypto from 'node:crypto';
import { globalAuditLedger, type AuditLedger } from '../auditLedger.js';
import { LongHorizonAutonomySecurityBoundary } from './longHorizonAutonomySecurityBoundary.js';

export type LongHorizonAuditEventType =
  | 'LONG_HORIZON_STARTED'
  | 'OBJECTIVE_AUTHORIZED'
  | 'GENERATION_STARTED'
  | 'GENERATION_COMPLETED'
  | 'GENERATION_SUPERSEDED'
  | 'STEP_PROGRESS_RECORDED'
  | 'OBJECTIVE_PROGRESS_UPDATED'
  | 'ENVIRONMENT_DRIFT_DETECTED'
  | 'REPLANNING_REQUIRED'
  | 'AUTHORIZATION_REFRESH_REQUIRED'
  | 'HUMAN_CONFIRMATION_REQUIRED'
  | 'HUMAN_CONFIRMED'
  | 'EXECUTION_DELEGATED'
  | 'EXECUTION_FAILED'
  | 'RETRY_STARTED'
  | 'STAGNATION_DETECTED'
  | 'BUDGET_EXHAUSTED'
  | 'OBJECTIVE_COMPLETED'
  | 'OBJECTIVE_FAILED'
  | 'OBJECTIVE_ABORTED'
  | 'OBJECTIVE_EXPIRED'
  | 'USER_STOP_PREEMPTED'
  | 'RECOVERY_REQUIRED'
  | 'TERMINATED';

export interface RecordEventParams {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly objectiveId: string;
  readonly generationId?: string;
  readonly eventType: LongHorizonAuditEventType;
  readonly outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'PAUSED' | 'PREEMPTED';
  readonly details?: Record<string, unknown>;
}

export class LongHorizonAuditBridge {
  private readonly ledger: AuditLedger;
  private readonly securityBoundary: LongHorizonAutonomySecurityBoundary;

  constructor(options?: {
    readonly ledger?: AuditLedger;
    readonly securityBoundary?: LongHorizonAutonomySecurityBoundary;
  }) {
    this.ledger = options?.ledger ?? globalAuditLedger;
    this.securityBoundary = options?.securityBoundary ?? new LongHorizonAutonomySecurityBoundary();
  }

  /**
   * EN: Emits an immutable, sanitized audit record to AuditLedger.
   * VI: Phát ra một bản ghi kiểm toán bất biến, đã khử trùng tới AuditLedger.
   */
  public recordEvent(params: RecordEventParams): void {
    const timestamp = new Date().toISOString();
    const eventId = `audit_${params.tenantId}_${params.objectiveId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const sanitizedDetails = params.details
      ? this.securityBoundary.sanitizePayload(params.details)
      : {};

    const rawEvent = {
      eventId,
      eventType: params.eventType,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      objectiveId: params.objectiveId,
      generationId: params.generationId,
      outcome: params.outcome,
      details: sanitizedDetails,
      timestamp,
    };

    const canonical = JSON.stringify(rawEvent);
    const eventProvenanceHash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');

    this.ledger.record({
      timestamp,
      actor: {
        userId: params.tenantId,
        role: 'LONG_HORIZON_ORCHESTRATOR',
        channel: 'LONG_HORIZON_PLANE',
      },
      domain: 'LONG_HORIZON_EXECUTION',
      toolName: `long_horizon_${params.eventType.toLowerCase()}`,
      classification: 'SAFE',
      argumentsHash: eventProvenanceHash,
      policyDecision: params.outcome === 'SUCCESS' ? 'PERMIT' : 'DENY',
      executionStatus: params.outcome === 'SUCCESS' ? 'SUCCESS' : params.outcome === 'BLOCKED' ? 'BLOCKED' : 'FAILURE',
    });
  }

  public recordLifecycleEvent(params: {
    readonly eventType: LongHorizonAuditEventType;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly objectiveId: string;
    readonly generationId?: string;
    readonly outcome?: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'PAUSED' | 'PREEMPTED';
    readonly metadata?: Record<string, unknown>;
    readonly details?: Record<string, unknown>;
  }): void {
    this.recordEvent({
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      objectiveId: params.objectiveId,
      generationId: params.generationId,
      eventType: params.eventType,
      outcome: params.outcome ?? 'SUCCESS',
      details: params.details ?? params.metadata ?? {},
    });
  }
}
