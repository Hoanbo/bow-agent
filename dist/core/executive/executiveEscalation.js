// src/core/executive/executiveEscalation.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Human Escalation Manager.
// Generates canonical escalation records when autonomous recovery bounds are exceeded or human guidance is required.
// Invariant: BOWCON explicitly admits failure and requests human guidance rather than fabricating success.
import crypto from 'node:crypto';
export class ExecutiveEscalationManager {
    _records = new Map();
    createEscalation(goalId, reason, diagnosis, requiredDecision, task) {
        const escalationId = `esc_${crypto.randomBytes(6).toString('hex')}`;
        const record = {
            escalationId,
            goalId,
            taskId: task?.taskId,
            reason,
            diagnosis,
            attempts: task?.attemptCount ?? 0,
            blockedBy: task?.error,
            requiredHumanDecision: requiredDecision,
            riskLevel: task?.riskLevel ?? 'LOW',
            timestamp: Date.now(),
        };
        this._records.set(escalationId, record);
        return record;
    }
    recordEscalation(options) {
        const escalationId = `esc_${crypto.randomBytes(6).toString('hex')}`;
        const record = {
            escalationId,
            goalId: options.goalId,
            taskId: options.taskId,
            reason: options.reason,
            diagnosis: options.diagnosis ?? 'Unknown failure',
            attempts: options.attempts ?? 0,
            blockedBy: options.blockedBy,
            requiredHumanDecision: options.requiredHumanDecision,
            riskLevel: options.riskLevel ?? 'LOW',
            timestamp: Date.now(),
        };
        this._records.set(escalationId, record);
        return record;
    }
    getEscalation(escalationId) {
        return this._records.get(escalationId);
    }
    getEscalationsByGoal(goalId) {
        return Array.from(this._records.values()).filter((r) => r.goalId === goalId);
    }
    getEscalationsForGoal(goalId) {
        return this.getEscalationsByGoal(goalId);
    }
    clear() {
        this._records.clear();
    }
}
export const globalExecutiveEscalation = new ExecutiveEscalationManager();
