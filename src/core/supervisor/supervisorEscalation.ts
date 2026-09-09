// src/core/supervisor/supervisorEscalation.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Bounded Retry & Escalation Engine.
//
// INVARIANTS:
// NO infinite retry loops.
// Every recovery attempt is strictly bounded.
// Rollback is governed and verified.

import crypto from 'node:crypto';
import type { RecoveryPlan, Diagnosis, EscalationRecord, RecoveryAttempt } from './supervisorTypes.js';

export class SupervisorEscalationManager {
  private attempts = new Map<string, RecoveryAttempt[]>();
  private escalations: EscalationRecord[] = [];

  public recordAttempt(planId: string, attempt: RecoveryAttempt): void {
    const list = this.attempts.get(planId) || [];
    list.push(attempt);
    this.attempts.set(planId, list);
  }

  public getAttempts(planId: string): readonly RecoveryAttempt[] {
    return this.attempts.get(planId) || [];
  }

  public shouldEscalate(plan: RecoveryPlan): boolean {
    const list = this.attempts.get(plan.planId) || [];
    return list.length >= plan.maxAttempts;
  }

  public escalate(plan: RecoveryPlan, diagnosis: Diagnosis, reason: string): EscalationRecord {
    const list = this.attempts.get(plan.planId) || [];
    const record: EscalationRecord = {
      escalationId: `esc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      anomalyId: diagnosis.anomalyId,
      diagnosisId: diagnosis.diagnosisId,
      planId: plan.planId,
      reason,
      attemptsCount: list.length,
      escalatedAt: Date.now(),
      severity: diagnosis.severity,
    };
    this.escalations.push(record);
    return record;
  }

  public getAllEscalations(): readonly EscalationRecord[] {
    return this.escalations;
  }

  public clear(): void {
    this.attempts.clear();
    this.escalations = [];
  }
}

export const globalSupervisorEscalation = new SupervisorEscalationManager();
