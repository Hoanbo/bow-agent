// src/core/agent-loop/agentLoopEscalation.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Bounded Retry & Escalation Manager.
//
// Invariants:
// NO INFINITE RETRIES
// When retries are exhausted, the agent must honestly halt and escalate to the human.
import crypto from 'node:crypto';
export class AgentLoopEscalationManager {
    escalations = new Map();
    escalate(plan, attempts, reason) {
        const escalationId = `esc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const record = {
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
    getEscalation(escalationId) {
        return this.escalations.get(escalationId);
    }
    listEscalations() {
        return Array.from(this.escalations.values());
    }
    clear() {
        this.escalations.clear();
    }
}
export const globalAgentLoopEscalation = new AgentLoopEscalationManager();
