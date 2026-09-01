// src/core/planner.ts
// BOW AGENT V3.3 — TASK PLANNER & STEP-BY-STEP EXECUTION

import type { AgentContext, AgentAction } from './types.js';

export interface PlanStep {
  stepId: string;
  toolName: string;
  description: string;
  parameters: Record<string, any>;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  result?: any;
  error?: string;
}

export interface TaskExecutionPlan {
  planId: string;
  goal: string;
  steps: PlanStep[];
  status: 'PLANNED' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  createdAt: number;
}

export class TaskPlanner {
  public createPlan(goal: string, steps: Omit<PlanStep, 'status' | 'result' | 'error'>[]): TaskExecutionPlan {
    const planId = 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    return {
      planId,
      goal,
      steps: steps.map((s) => ({ ...s, status: 'PENDING' })),
      status: 'PLANNED',
      createdAt: Date.now(),
    };
  }

  public async executePlan(
    plan: TaskExecutionPlan,
    toolExecutor: (toolName: string, params: any) => Promise<any>
  ): Promise<TaskExecutionPlan> {
    plan.status = 'EXECUTING';

    for (const step of plan.steps) {
      step.status = 'RUNNING';
      try {
        const res = await toolExecutor(step.toolName, step.parameters);
        step.status = 'COMPLETED';
        step.result = res;
      } catch (err: any) {
        step.status = 'FAILED';
        step.error = err?.message || String(err);
        plan.status = 'FAILED';
        return plan;
      }
    }

    plan.status = 'COMPLETED';
    return plan;
  }
}

export const taskPlanner = new TaskPlanner();
