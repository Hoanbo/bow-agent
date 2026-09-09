import { ExecutiveRuntime } from './executiveRuntime.js';
export declare class BowconExecutive {
    static get runtime(): ExecutiveRuntime;
    static get goals(): import("./executiveGoal.js").ExecutiveGoalManager;
    static get tasks(): import("./executiveTask.js").ExecutiveTaskManager;
    static get authorization(): import("./executiveAuthorization.js").ExecutiveAuthorizationDelegator;
    static get cancellation(): import("./executiveCancellation.js").ExecutiveCancellationManager;
    static get persistence(): import("./executivePersistence.js").ExecutivePersistenceEngine;
    static get audit(): import("./executiveAudit.js").ExecutiveAuditLedger;
}
