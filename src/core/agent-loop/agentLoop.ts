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
import type {
  AgentLoopObjective,
  AgentLoopIteration,
  AgentLoopHealth,
  ControlCommandType,
  ObjectivePriority,
} from './agentLoopTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';

export class AgentLoopFacade {
  public async boot(): Promise<void> {
    return globalAgentLoopRuntime.boot();
  }

  public async tick(options?: {
    isDryRun?: boolean;
    authorizationToken?: AuthorizationToken;
  }): Promise<AgentLoopIteration> {
    return globalAgentLoopRuntime.tick(options);
  }

  public submitObjective(params: {
    title: string;
    description: string;
    targetResource?: string;
    priority?: ObjectivePriority;
    metadata?: Record<string, any>;
  }): AgentLoopObjective {
    const obj = globalAgentLoopObjectiveManager.createObjective(params);
    globalAgentLoopAudit.record('OBJECTIVE_CREATED', {
      objectiveId: obj.objectiveId,
      title: obj.title,
    });
    return obj;
  }

  public requestControl(params: {
    type: ControlCommandType;
    operatorId: string;
    payload?: Record<string, any>;
  }): void {
    return globalAgentLoopRuntime.requestControl(params);
  }

  public getHealth(): AgentLoopHealth {
    return globalAgentLoopRuntime.getHealth();
  }

  public async authorizeAndExecute(token: AuthorizationToken): Promise<AgentLoopIteration> {
    return globalAgentLoopRuntime.authorizeAndExecute(token);
  }

  public rehydrateFromCheckpoint(): { rehydrated: boolean; stale: boolean; checkpoint?: any } {
    return globalAgentLoopRuntime.rehydrateFromCheckpoint();
  }

  public get observation() {
    return globalAgentLoopObservation;
  }

  public get control() {
    return globalAgentLoopControl;
  }

  public get scheduler() {
    return globalAgentLoopScheduler;
  }

  public get audit() {
    return globalAgentLoopAudit;
  }

  public get persistence() {
    return globalAgentLoopPersistence;
  }
}

export const globalContinuousAgentLoop = new AgentLoopFacade();
