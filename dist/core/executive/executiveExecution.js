// src/core/executive/executiveExecution.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Executive Execution Bridge.
// Dispatches governed tasks to existing CapabilityRuntime and WorldActionRuntime.
// Invariant: The Executive layer does NOT create a secondary execution engine.
import { globalExecutiveGovernance } from './executiveGovernance.js';
import { globalExecutiveAuthorization } from './executiveAuthorization.js';
import { globalCapabilityRuntime } from '../capability/capabilityRuntime.js';
import { globalExecutivePlanner } from './executivePlanner.js';
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';
import { globalExecutiveCancellation } from './executiveCancellation.js';
export class ExecutiveExecutionEngine {
    _executedTasksCount = 0;
    get executedTasksCount() {
        return this._executedTasksCount;
    }
    /**
     * Executes an executive task after strict governance and authorization validation.
     */
    async executeTask(task, sessionIdOrToken, authTokenId, goalId = task.goalId) {
        if (globalExecutiveCancellation.isUserStopActive) {
            throw new Error('[USER_STOP_ACTIVE] Execution blocked by active USER_STOP');
        }
        const startTime = Date.now();
        try {
            // 1. Governance Evaluation
            const govDecision = globalExecutiveGovernance.evaluate(task);
            if (!govDecision.permitted) {
                throw new Error(`[GOVERNANCE_BLOCKED] ${govDecision.violations.join('; ')}`);
            }
            // Resolve parameter overloading
            let sessionId;
            let effectiveTokenId;
            if (sessionIdOrToken && typeof sessionIdOrToken === 'object' && 'tokenId' in sessionIdOrToken) {
                effectiveTokenId = sessionIdOrToken.tokenId;
                if (sessionIdOrToken.sessionId)
                    sessionId = sessionIdOrToken.sessionId;
                if (sessionIdOrToken.goalId)
                    goalId = sessionIdOrToken.goalId;
            }
            else if (typeof sessionIdOrToken === 'string' && (sessionIdOrToken.startsWith('tok_') || (!authTokenId && sessionIdOrToken.includes('TOKEN')))) {
                effectiveTokenId = sessionIdOrToken;
            }
            else if (typeof sessionIdOrToken === 'string' && sessionIdOrToken.length > 0) {
                sessionId = sessionIdOrToken;
            }
            if (authTokenId) {
                if (typeof authTokenId === 'object' && 'tokenId' in authTokenId) {
                    effectiveTokenId = authTokenId.tokenId;
                }
                else if (typeof authTokenId === 'string') {
                    effectiveTokenId = authTokenId;
                }
            }
            if (effectiveTokenId) {
                const binding = globalExecutiveAuthorization.getBinding(effectiveTokenId);
                if (binding) {
                    if (!sessionId)
                        sessionId = binding.sessionId;
                    if (!goalId)
                        goalId = binding.goalId;
                }
            }
            if (!sessionId) {
                sessionId = `ses_${task.goalId || 'default'}`;
            }
            // 2. Authorization Check
            if (govDecision.requiresHumanApproval) {
                if (!effectiveTokenId) {
                    throw new Error(`[AUTHORIZATION_REQUIRED] Task '${task.taskId}' requires explicit human authorization token`);
                }
            }
            // 3. Execution dispatch. ExecutiveRuntime deliberately has no host adapters;
            // all physical truth and mutation remain inside CapabilityRuntime.
            if (!task.plan?.capabilityId) {
                globalExecutivePlanner.planTask(task, false);
            }
            if (!task.plan?.capabilityId && task.taskType !== 'GATE') {
                throw new Error(`[EXECUTIVE_PLAN_INVALID] Task '${task.taskId}' has no governed capability plan`);
            }
            const target = task.plan?.targetPath ?? task.plan?.parameters?.path;
            const parameters = { ...(task.plan?.parameters ?? {}) };
            if (target && !parameters.path) {
                parameters.path = target;
            }
            const authorizationToken = govDecision.requiresHumanApproval
                ? globalExecutiveAuthorization.resolveAuthorizedToken(effectiveTokenId, task, goalId, sessionId)
                : (effectiveTokenId
                    ? globalExecutiveAuthorization.resolveAuthorizedToken(effectiveTokenId, task, goalId, sessionId)
                    : globalWorldActionAuth.issueToken({
                        actionId: task.taskId,
                        userId: 'operator',
                        operatorId: 'operator',
                        sessionId,
                        goalId,
                        taskId: task.taskId,
                        deviceId: 'dev_host_master',
                        toolId: task.plan?.capabilityId || 'cap_executive_task',
                        capability: task.plan?.capabilityId || 'cap_executive_task',
                        target: target || 'task_target',
                        parameters,
                        riskLevel: task.riskLevel || 'LOW',
                        singleUse: true,
                        ttlMs: 60_000,
                    }));
            // GATE tasks are pure authorization checkpoints
            if (task.taskType === 'GATE') {
                globalExecutiveAuthorization.consumeToken(authorizationToken.tokenId, task.taskId, sessionId);
                const executionTimeMs = Date.now() - startTime;
                const result = {
                    taskId: task.taskId,
                    success: true,
                    executionTimeMs,
                    verified: true,
                    outputData: { status: 'GATE_PASSED', tokenId: authorizationToken.tokenId },
                };
                task.result = result;
                this._executedTasksCount++;
                return result;
            }
            const capabilityResult = await globalCapabilityRuntime.executeCapability({
                requestId: task.taskId,
                capabilityId: task.plan.capabilityId,
                parameters,
                target,
                sessionId,
                isDryRun: task.plan.isDryRun,
                authorizationToken,
            });
            const executionTimeMs = Date.now() - startTime;
            const result = {
                taskId: task.taskId,
                success: capabilityResult.success,
                executionTimeMs,
                // CapabilityRuntime performs verification independently from its executor.
                // Executive records that lower-runtime evidence but does not create it.
                verified: capabilityResult.verificationPassed === true,
                outputData: capabilityResult.output,
                error: capabilityResult.errorMessage,
            };
            task.result = result;
            this._executedTasksCount++;
            return result;
        }
        catch (err) {
            const executionTimeMs = Date.now() - startTime;
            const errorMsg = err instanceof Error ? err.message : String(err);
            const result = {
                taskId: task.taskId,
                success: false,
                executionTimeMs,
                verified: false,
                error: errorMsg,
            };
            task.result = result;
            task.error = errorMsg;
            return result;
        }
    }
    /**
     * Independently verifies the result of an executed task.
     * Invariant: VERIFICATION != COMMIT
     */
    verifyTask(task) {
        if (!task.result || !task.result.success) {
            return false;
        }
        // CapabilityRuntime performs independent physical verification. Executive only
        // accepts that lower-runtime result; it cannot manufacture host verification.
        return task.result.verified === true;
    }
    clear() {
        this._executedTasksCount = 0;
    }
}
export const globalExecutiveExecution = new ExecutiveExecutionEngine();
