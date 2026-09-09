// src/core/supervisor/supervisor.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Ergonomic High-Level Supervisory Facade for BrainRuntime and CognitivePipeline.
import { globalSupervisorRuntime } from './supervisorRuntime.js';
import { globalSupervisorHumanGate } from './supervisorHumanGate.js';
export class SupervisorFacade {
    observe() {
        return globalSupervisorRuntime.observe();
    }
    getActiveAnomalies() {
        return globalSupervisorRuntime.getActiveAnomalies();
    }
    diagnose(anomaly) {
        return globalSupervisorRuntime.diagnose(anomaly);
    }
    planRecovery(diagnosis) {
        return globalSupervisorRuntime.planRecovery(diagnosis);
    }
    requestHumanApproval(diagnosis, plan, options) {
        return globalSupervisorRuntime.requestHumanApproval(diagnosis, plan, options);
    }
    approveRecovery(requestId, operatorId, context) {
        return globalSupervisorRuntime.approveRecovery(requestId, operatorId, context);
    }
    denyRecovery(requestId, reason) {
        return globalSupervisorRuntime.denyRecovery(requestId, reason);
    }
    async executeRecovery(plan, diagnosis, options) {
        return globalSupervisorRuntime.executeRecovery(plan, diagnosis, options);
    }
    safeStop(reason) {
        globalSupervisorRuntime.activateSafeStop(reason);
    }
    resetSafeStop(operatorToken) {
        globalSupervisorRuntime.resetSafeStop(operatorToken);
    }
    isSafeStopActive() {
        return globalSupervisorRuntime.isSafeStopActive();
    }
    getHealth() {
        return globalSupervisorRuntime.getHealth();
    }
    getCurrentState() {
        return globalSupervisorRuntime.getCurrentState();
    }
    getPendingHumanGates() {
        return globalSupervisorHumanGate.getAllPendingRequests();
    }
}
export const supervisor = new SupervisorFacade();
