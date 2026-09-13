// src/core/policyStagedActivation/policyStagedActivationAuditEngine.ts
// BOWCON V4.0 — MS-1.3.70: GOVERNED STAGED POLICY ACTIVATION LAYER
//
// Governed Staged Activation Audit Engine (Component 794).
// Records all staged activation and active state transition lifecycle events
// into the append-only AuditLedger under domain POLICY_STAGED_ACTIVATION.
// Redacts sensitive payloads using DiagnosisSanitizer.
//
// Authority Invariants:
// - CANONICAL_DOMAIN: POLICY_STAGED_ACTIVATION
// - ZERO_SECRET_LEAKAGE: Sensitive credentials deeply redacted
// - REUSES_GLOBAL_AUDIT_LEDGER: Zero parallel unverified ledgers
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export type PolicyStagedActivationAuditEventType =
  | 'ACTIVATION_REQUESTED'
  | 'ACTIVATION_REVALIDATED'
  | 'POLICY_STAGED'
  | 'ACTIVATION_PREFLIGHT_STARTED'
  | 'ACTIVATION_PREFLIGHT_PASSED'
  | 'ACTIVATION_PREFLIGHT_BLOCKED'
  | 'ACTIVATION_BOUNDARY_EVALUATED'
  | 'ACTIVATION_AUTHORITY_BLOCKED'
  | 'ACTIVATION_COMMITTED'
  | 'ACTIVE_POLICY_CREATED'
  | 'ACTIVATION_REJECTED'
  | 'ACTIVATION_EXPIRED'
  | 'ACTIVATION_CONFLICT'
  | 'TENANT_ISOLATION_BLOCKED'
  | 'USER_STOP_BLOCKED'
  | 'PROVENANCE_TAMPER_BLOCKED'
  | 'CORRUPTED_STATE_BLOCKED'
  | 'AUTONOMOUS_ACTIVATION_BLOCKED';

export interface PolicyStagedActivationAuditRecord {
  readonly eventType: PolicyStagedActivationAuditEventType;
  readonly tenantPartition: string;
  readonly candidateDraftId?: string;
  readonly stagedActivationId?: string;
  readonly preflightId?: string;
  readonly activationCommitId?: string;
  readonly activePolicyStateId?: string;
  readonly operatorId?: string;
  readonly operatorRole?: string;
  readonly status?: string;
  readonly reason?: string;
  readonly details?: Record<string, any>;
}

export interface PolicyStagedActivationAuditEngineOptions {
  readonly auditLedger?: AuditLedger;
  readonly sanitizer?: DiagnosisSanitizer;
}

export class PolicyStagedActivationAuditEngine {
  public static readonly CANONICAL_DOMAIN = 'POLICY_STAGED_ACTIVATION';

  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;

  constructor(options?: PolicyStagedActivationAuditEngineOptions) {
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
  }

  /**
   * Records a sanitized activation audit event into the append-only ledger.
   */
  public recordEvent(record: PolicyStagedActivationAuditRecord): void {
    const timestamp = new Date().toISOString();

    const rawPayload = {
      tenantPartition: record.tenantPartition,
      candidateDraftId: record.candidateDraftId,
      stagedActivationId: record.stagedActivationId,
      preflightId: record.preflightId,
      activationCommitId: record.activationCommitId,
      activePolicyStateId: record.activePolicyStateId,
      operatorId: record.operatorId,
      operatorRole: record.operatorRole,
      status: record.status,
      reason: record.reason,
      details: record.details,
    };

    const sanitizedPayload = this.sanitizer.sanitize(rawPayload);
    const argumentsHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(sanitizedPayload))
      .digest('hex');

    this.auditLedger.record({
      timestamp,
      actor: {
        userId: record.operatorId ?? 'system_staged_activation_governance',
        role: record.operatorRole ?? 'activation_operator',
        channel: 'policy_staged_activation_boundary',
      },
      domain: PolicyStagedActivationAuditEngine.CANONICAL_DOMAIN as any,
      toolName: `policy_staged_activation_${record.eventType.toLowerCase()}`,
      classification: 'CRITICAL',
      policyDecision: record.eventType.includes('BLOCKED') || record.eventType.includes('REJECTED') || record.eventType.includes('CONFLICT') ? 'DENY' : 'PERMIT',
      executionStatus: record.eventType.includes('BLOCKED') || record.eventType.includes('REJECTED') || record.eventType.includes('CONFLICT')
        ? 'BLOCKED'
        : 'SUCCESS',
      argumentsHash,
      approvalId: record.activationCommitId ?? record.stagedActivationId,
    });
  }
}

export const globalPolicyStagedActivationAuditEngine = new PolicyStagedActivationAuditEngine();
