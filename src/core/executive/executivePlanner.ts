// src/core/executive/executivePlanner.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Task Planner Engine.
// Synthesizes mutation-free plans for ExecutiveTasks prior to governance evaluation.
// Invariant: Planning produces preview plans only; it NEVER mutates the physical host.

import crypto from 'node:crypto';
import type { ExecutiveTask, ExecutiveTaskPlan } from './executiveTypes.js';

export class ExecutivePlanner {
  public planTask(task: ExecutiveTask, isDryRun: boolean = false): ExecutiveTaskPlan {
    this.createPlan(task, isDryRun);
    return task.plan!;
  }

  public createPlan(
    task: ExecutiveTask,
    options?: {
      targetPath?: string;
      actionName?: string;
      parameters?: Record<string, unknown>;
      isDryRun?: boolean;
    } | boolean
  ): ExecutiveTask {
    const isDryRun = typeof options === 'boolean' ? options : (options?.isDryRun ?? false);
    const planId = `plan_${crypto.randomBytes(6).toString('hex')}`;
    const optsObj = typeof options === 'object' && options !== null ? options : undefined;

    let capabilityId = task.requiredCapabilities.length > 0 ? task.requiredCapabilities[0] : 'system.inspect_environment';
    let actionName = optsObj?.actionName ?? 'INSPECT';
    const parameters: Record<string, unknown> = {
      ...(task.plan?.parameters ?? {}),
      ...(optsObj?.parameters ?? {}),
    };

    if (!optsObj?.actionName) {
      if (task.taskType === 'OBSERVE') actionName = 'OBSERVE';
      else if (task.taskType === 'MUTATE') actionName = 'EXECUTE_MUTATION';
      else if (task.taskType === 'VERIFY') actionName = 'INDEPENDENT_VERIFICATION';
      else if (task.taskType === 'RECOVER') actionName = 'SUPERVISORY_RECOVERY';
      else if (task.taskType === 'GATE') actionName = 'HUMAN_APPROVAL_GATE';
    }

    const plan: ExecutiveTaskPlan = {
      planId,
      capabilityId,
      actionName,
      targetPath: optsObj?.targetPath ?? task.plan?.targetPath ?? (task.metadata?.targetPath as string | undefined),
      parameters,
      isDryRun,
    };

    task.plan = plan;
    return Object.assign(task, plan);
  }
}

export const globalExecutivePlanner = new ExecutivePlanner();
