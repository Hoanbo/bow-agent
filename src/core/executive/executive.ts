// src/core/executive/executive.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Facade & Unified Access API for the Executive Subsystem.

import { globalExecutiveRuntime, ExecutiveRuntime } from './executiveRuntime.js';
import { globalExecutiveGoalManager } from './executiveGoal.js';
import { globalExecutiveTaskManager } from './executiveTask.js';
import { globalExecutiveAuthorization } from './executiveAuthorization.js';
import { globalExecutiveCancellation } from './executiveCancellation.js';
import { globalExecutivePersistence } from './executivePersistence.js';
import { globalExecutiveAudit } from './executiveAudit.js';

export class BowconExecutive {
  public static get runtime(): ExecutiveRuntime {
    return globalExecutiveRuntime;
  }

  public static get goals() {
    return globalExecutiveGoalManager;
  }

  public static get tasks() {
    return globalExecutiveTaskManager;
  }

  public static get authorization() {
    return globalExecutiveAuthorization;
  }

  public static get cancellation() {
    return globalExecutiveCancellation;
  }

  public static get persistence() {
    return globalExecutivePersistence;
  }

  public static get audit() {
    return globalExecutiveAudit;
  }
}
