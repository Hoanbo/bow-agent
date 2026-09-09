// src/core/agent-loop/agentLoop.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Public Ergonomic Facade for Controlled Operating Loop.
import { globalAgentLoopRuntime } from './agentLoopRuntime.js';
import { globalAgentLoopObjectiveManager } from './agentLoopObjective.js';
import { globalAgentLoopControl } from './agentLoopControl.js';
import { globalAgentLoopAudit } from './agentLoopAudit.js';
import { globalAgentLoopObservation } from './agentLoopObservation.js';
import { globalAgentLoopScheduler } from './agentLoopScheduler.js';
import { globalAgentLoopPersistence } from './agentLoopPersistence.js';
export class AgentLoopFacade {
    async boot() {
        return globalAgentLoopRuntime.boot();
    }
    async tick(options) {
        return globalAgentLoopRuntime.tick(options);
    }
    submitObjective(params) {
        const obj = globalAgentLoopObjectiveManager.createObjective(params);
        globalAgentLoopAudit.record('OBJECTIVE_CREATED', {
            objectiveId: obj.objectiveId,
            title: obj.title,
        });
        return obj;
    }
    requestControl(params) {
        return globalAgentLoopRuntime.requestControl(params);
    }
    getHealth() {
        return globalAgentLoopRuntime.getHealth();
    }
    async authorizeAndExecute(token) {
        return globalAgentLoopRuntime.authorizeAndExecute(token);
    }
    rehydrateFromCheckpoint() {
        return globalAgentLoopRuntime.rehydrateFromCheckpoint();
    }
    get observation() {
        return globalAgentLoopObservation;
    }
    get control() {
        return globalAgentLoopControl;
    }
    get scheduler() {
        return globalAgentLoopScheduler;
    }
    get audit() {
        return globalAgentLoopAudit;
    }
    get persistence() {
        return globalAgentLoopPersistence;
    }
}
export const globalContinuousAgentLoop = new AgentLoopFacade();
