// src/core/agent-loop/agentLoopEscalation.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Bounded Retry & Escalation Manager.
//
// Invariants:
// NO INFINITE RETRIES
// When retries are exhausted, the agent must honestly halt and escalate to the human.

import crypto from 'node:crypto';
import type { AgentLoopPlan } from './agentLoopTypes.js';

export interface LoopEscalationRecord {
  readonly escalationId: string;
  readonly planId: string;
  readonly objectiveId: string;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly reason: string;
  readonly timestamp: number;
  readonly requiresHumanReview: true;
}

export class AgentLoopEscalationManager {
  private readonly escalations = new Map<string, LoopEscalationRecord>();

  public escalate(
    plan: AgentLoopPlan,
    attempts: number,
    reason: string
  ): LoopEscalationRecord {
    const escalationId = `esc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const record: LoopEscalationRecord = {
      escalationId,
      planId: plan.planId,
      objectiveId: plan.objectiveId,
      attempts,
      maxAttempts: plan.maxAttempts,
      reason,
      timestamp: Date.now(),
      requiresHumanReview: true,
    };

    this.escalations.set(escalationId, record);
    return record;
  }

  public getEscalation(escalationId: string): LoopEscalationRecord | undefined {
    return this.escalations.get(escalationId);
  }

  public listEscalations(): LoopEscalationRecord[] {
    return Array.from(this.escalations.values());
  }

  public clear(): void {
    this.escalations.clear();
  }
}

export const globalAgentLoopEscalation = new AgentLoopEscalationManager();
