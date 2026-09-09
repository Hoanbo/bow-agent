// src/core/executive/executive.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Facade & Unified Access API for the Executive Subsystem.
import { globalExecutiveRuntime } from './executiveRuntime.js';
import { globalExecutiveGoalManager } from './executiveGoal.js';
import { globalExecutiveTaskManager } from './executiveTask.js';
import { globalExecutiveAuthorization } from './executiveAuthorization.js';
import { globalExecutiveCancellation } from './executiveCancellation.js';
import { globalExecutivePersistence } from './executivePersistence.js';
import { globalExecutiveAudit } from './executiveAudit.js';
export class BowconExecutive {
    static get runtime() {
        return globalExecutiveRuntime;
    }
    static get goals() {
        return globalExecutiveGoalManager;
    }
    static get tasks() {
        return globalExecutiveTaskManager;
    }
    static get authorization() {
        return globalExecutiveAuthorization;
    }
    static get cancellation() {
        return globalExecutiveCancellation;
    }
    static get persistence() {
        return globalExecutivePersistence;
    }
    static get audit() {
        return globalExecutiveAudit;
    }
}
