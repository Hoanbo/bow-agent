// src/core/agent-loop/agentLoopObjective.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Objective Lifecycle Manager.
//
// Invariants:
// OBJECTIVE != INTENT != PLAN != ACTION != OUTCOME
// OBJECTIVE != AUTHORIZATION
import crypto from 'node:crypto';
export class AgentLoopObjectiveManager {
    objectives = new Map();
    activeObjectiveId;
    createObjective(params) {
        const objectiveId = `obj_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const objective = {
            objectiveId,
            title: params.title,
            description: params.description,
            targetResource: params.targetResource,
            priority: params.priority || 'MEDIUM',
            status: 'PENDING',
            createdTimestamp: Date.now(),
            updatedTimestamp: Date.now(),
            metadata: params.metadata,
        };
        const PRIORITY_SCORES = {
            CRITICAL: 4,
            HIGH: 3,
            MEDIUM: 2,
            LOW: 1,
        };
        this.objectives.set(objectiveId, objective);
        const currentActive = this.activeObjectiveId ? this.objectives.get(this.activeObjectiveId) : undefined;
        if (!currentActive || PRIORITY_SCORES[objective.priority] > PRIORITY_SCORES[currentActive.priority]) {
            this.activeObjectiveId = objectiveId;
        }
        return objective;
    }
    getObjective(objectiveId) {
        return this.objectives.get(objectiveId);
    }
    getActiveObjective() {
        if (!this.activeObjectiveId)
            return undefined;
        return this.objectives.get(this.activeObjectiveId);
    }
    setActiveObjective(objectiveId) {
        const obj = this.objectives.get(objectiveId);
        if (!obj) {
            throw new Error(`Objective "${objectiveId}" not found.`);
        }
        this.activeObjectiveId = objectiveId;
        return obj;
    }
    updateStatus(objectiveId, status) {
        const existing = this.objectives.get(objectiveId);
        if (!existing) {
            throw new Error(`Objective "${objectiveId}" not found.`);
        }
        const updated = {
            ...existing,
            status,
            updatedTimestamp: Date.now(),
            completedTimestamp: status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED'
                ? Date.now()
                : existing.completedTimestamp,
        };
        this.objectives.set(objectiveId, updated);
        if (this.activeObjectiveId === objectiveId && (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED')) {
            // Find highest priority pending objective if available
            const PRIORITY_SCORES = {
                CRITICAL: 4,
                HIGH: 3,
                MEDIUM: 2,
                LOW: 1,
            };
            const pendings = Array.from(this.objectives.values()).filter(o => o.status === 'PENDING');
            pendings.sort((a, b) => PRIORITY_SCORES[b.priority] - PRIORITY_SCORES[a.priority]);
            this.activeObjectiveId = pendings[0]?.objectiveId;
        }
        return updated;
    }
    listObjectives() {
        return Array.from(this.objectives.values());
    }
    clear() {
        this.objectives.clear();
        this.activeObjectiveId = undefined;
    }
}
export const globalAgentLoopObjectiveManager = new AgentLoopObjectiveManager();
