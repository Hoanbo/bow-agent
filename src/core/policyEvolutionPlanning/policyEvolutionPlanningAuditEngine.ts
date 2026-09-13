// src/core/policyEvolutionPlanning/policyEvolutionPlanningAuditEngine.ts
// BOWCON V4.0 — MS-1.3.68: GOVERNED POLICY EVOLUTION PLANNING & CANDIDATE SYNTHESIS LAYER
//
// Governed Policy Evolution Planning Audit Engine (Component 773).
// Records planning, candidate synthesis, validation, constraint, and human boundary events
// into the append-only AuditLedger under domain POLICY_EVOLUTION_PLANNING.
// Redacts sensitive payloads using DiagnosisSanitizer.
//
// Authority Invariants:
// - CANONICAL_DOMAIN: POLICY_EVOLUTION_PLANNING
// - ZERO_SECRET_LEAKAGE: Sensitive tokens, credentials, and keys deeply redacted
// - REUSES_GLOBAL_AUDIT_LEDGER: Zero parallel unverified ledgers

import crypto from 'node:crypto';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export type PolicyEvolutionPlanningAuditEventType =
  | 'EVOLUTION_PLAN_CREATED'
  | 'CANDIDATE_SYNTHESIS_STARTED'
  | 'CANDIDATE_DRAFT_CREATED'
  | 'CANDIDATE_VALIDATED'
  | 'CANDIDATE_BLOCKED'
  | 'CANDIDATE_REJECTED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'USER_STOP_BLOCKED'
  | 'TENANT_ISOLATION_BLOCKED'
  | 'HARD_FORBIDDEN_BLOCKED'
  | 'AUTONOMOUS_EVOLUTION_BLOCKED'
  | 'PROVENANCE_TAMPER_BLOCKED';

export interface PolicyEvolutionPlanningAuditRecord {
  readonly eventType: PolicyEvolutionPlanningAuditEventType;
  readonly tenantPartition: string;
  readonly intakeId?: string;
  readonly planId?: string;
  readonly candidateDraftId?: string;
  readonly status?: string;
  readonly reason?: string;
  readonly details?: Record<string, any>;
}

export interface PolicyEvolutionPlanningAuditEngineOptions {
  readonly auditLedger?: AuditLedger;
  readonly sanitizer?: DiagnosisSanitizer;
}

export class PolicyEvolutionPlanningAuditEngine {
  public static readonly CANONICAL_DOMAIN = 'POLICY_EVOLUTION_PLANNING';

  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;

  constructor(options?: PolicyEvolutionPlanningAuditEngineOptions) {
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
  }

  /**
   * Records a sanitized evolution planning audit event into the append-only ledger.
   */
  public recordEvent(record: PolicyEvolutionPlanningAuditRecord): void {
    const timestamp = new Date().toISOString();

    const rawPayload = {
      intakeId: record.intakeId,
      planId: record.planId,
      candidateDraftId: record.candidateDraftId,
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
        userId: 'system_evolution_planning_governance',
        role: 'evolution_planner',
        channel: 'policy_evolution_planning_boundary',
      },
      domain: PolicyEvolutionPlanningAuditEngine.CANONICAL_DOMAIN as any,
      toolName: `policy_evolution_planning_${record.eventType.toLowerCase()}`,
      classification: 'HIGH_IMPACT',
      policyDecision: record.eventType.includes('BLOCKED') || record.eventType.includes('REJECTED') ? 'DENY' : 'PERMIT',
      executionStatus: record.eventType.includes('BLOCKED') || record.eventType.includes('REJECTED')
        ? 'BLOCKED'
        : 'SUCCESS',
      argumentsHash,
      approvalId: record.planId ?? record.intakeId,
    });
  }
}

export const globalPolicyEvolutionPlanningAuditEngine = new PolicyEvolutionPlanningAuditEngine();
