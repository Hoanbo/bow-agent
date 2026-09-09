// src/core/executive/executiveEscalation.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Human Escalation Manager.
// Generates canonical escalation records when autonomous recovery bounds are exceeded or human guidance is required.
// Invariant: BOWCON explicitly admits failure and requests human guidance rather than fabricating success.

import crypto from 'node:crypto';
import type {
  GoalId,
  TaskId,
  ExecutiveTask,
  ExecutiveEscalationRecord,
} from './executiveTypes.js';

export class ExecutiveEscalationManager {
  private _records = new Map<string, ExecutiveEscalationRecord>();

  public createEscalation(
    goalId: GoalId,
    reason: string,
    diagnosis: string,
    requiredDecision: string,
    task?: ExecutiveTask
  ): ExecutiveEscalationRecord {
    const escalationId = `esc_${crypto.randomBytes(6).toString('hex')}`;

    const record: ExecutiveEscalationRecord = {
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

  public recordEscalation(options: {
    goalId: GoalId;
    taskId?: TaskId;
    reason: string;
    diagnosis?: string;
    attempts?: number;
    blockedBy?: string;
    requiredHumanDecision: string;
    riskLevel?: string;
  }): ExecutiveEscalationRecord {
    const escalationId = `esc_${crypto.randomBytes(6).toString('hex')}`;
    const record: ExecutiveEscalationRecord = {
      escalationId,
      goalId: options.goalId,
      taskId: options.taskId,
      reason: options.reason,
      diagnosis: options.diagnosis ?? 'Unknown failure',
      attempts: options.attempts ?? 0,
      blockedBy: options.blockedBy,
      requiredHumanDecision: options.requiredHumanDecision,
      riskLevel: (options.riskLevel as any) ?? 'LOW',
      timestamp: Date.now(),
    };
    this._records.set(escalationId, record);
    return record;
  }

  public getEscalation(escalationId: string): ExecutiveEscalationRecord | undefined {
    return this._records.get(escalationId);
  }

  public getEscalationsByGoal(goalId: GoalId): ExecutiveEscalationRecord[] {
    return Array.from(this._records.values()).filter((r) => r.goalId === goalId);
  }

  public getEscalationsForGoal(goalId: GoalId): ExecutiveEscalationRecord[] {
    return this.getEscalationsByGoal(goalId);
  }

  public clear(): void {
    this._records.clear();
  }
}

export const globalExecutiveEscalation = new ExecutiveEscalationManager();
