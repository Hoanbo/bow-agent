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
export class SupervisorEscalationManager {
    attempts = new Map();
    escalations = [];
    recordAttempt(planId, attempt) {
        const list = this.attempts.get(planId) || [];
        list.push(attempt);
        this.attempts.set(planId, list);
    }
    getAttempts(planId) {
        return this.attempts.get(planId) || [];
    }
    shouldEscalate(plan) {
        const list = this.attempts.get(plan.planId) || [];
        return list.length >= plan.maxAttempts;
    }
    escalate(plan, diagnosis, reason) {
        const list = this.attempts.get(plan.planId) || [];
        const record = {
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
    getAllEscalations() {
        return this.escalations;
    }
    clear() {
        this.attempts.clear();
        this.escalations = [];
    }
}
export const globalSupervisorEscalation = new SupervisorEscalationManager();
