import { buildWorldAction } from '../world-action/worldActionRequest.js';
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';
import { globalSupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
import { globalExecutiveTaskManager } from './executiveTask.js';
export class ExecutiveAuthorizationDelegator {
    bindings = new Map();
    /** Requests approval from the pre-existing HumanGate; Executive cannot issue a token. */
    requestMasterAuthorization(task, goalId, sessionId, deviceId = 'dev_host_master') {
        const plan = task.plan;
        if (!plan)
            throw new Error('[EXEC_AUTH_PLAN_REQUIRED] A governed capability plan is required');
        const now = Date.now();
        const target = plan.targetPath ?? String(plan.parameters.path ?? '');
        return globalSupervisorHumanGate.createRequest({ diagnosisId: `diag_exec_${task.taskId}`, anomalyId: `auth_exec_${task.taskId}`, timestamp: now, probableCause: 'Master authorization required', evidence: [task.title], affectedCapability: plan.capabilityId, affectedResource: target, severity: task.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH', isInconclusive: false, recoverability: 'HUMAN_REQUIRED', recommendedRecovery: 'Await master operator approval', requiresHumanApproval: true }, { planId: `plan_auth_${task.taskId}`, diagnosisId: `diag_exec_${task.taskId}`, anomalyId: `auth_exec_${task.taskId}`, recoveryClass: 'HUMAN_REQUIRED', steps: [{ stepIndex: 0, description: task.title, capabilityId: plan.capabilityId, target, parameters: plan.parameters, isReversible: task.riskLevel !== 'CRITICAL' }], requiresHumanApproval: true, riskLevel: task.riskLevel, timeoutMs: 60_000, maxAttempts: 1, createdTimestamp: now }, { target, authorizationContext: { actionId: task.taskId, sessionId, goalId, taskId: task.taskId, deviceId, capabilityId: plan.capabilityId, parameters: plan.parameters, target } });
    }
    /** Records the scope of an existing HumanGate-issued token; it does not mint or consume it. */
    bindAuthorizedToken(token, task, goalId, sessionId) {
        const plan = task.plan;
        if (!plan?.capabilityId)
            throw new Error('[EXEC_AUTH_PLAN_REQUIRED] A governed capability plan is required');
        const target = plan.targetPath ?? String(plan.parameters.path ?? '');
        if (token.actionId !== task.taskId || token.toolId !== plan.capabilityId || token.target !== target)
            throw new Error('[EXEC_AUTH_BINDING_MISMATCH] HumanGate token does not match task envelope');
        const binding = { tokenId: token.tokenId, goalId, taskId: task.taskId, sessionId, deviceId: token.deviceId, capabilityId: plan.capabilityId, target };
        this.bindings.set(token.tokenId, binding);
        return binding;
    }
    getBinding(tokenId) {
        return this.bindings.get(tokenId);
    }
    resolveAuthorizedToken(tokenId, task, goalId, sessionId) {
        const binding = this.bindings.get(tokenId);
        const token = globalWorldActionAuth.getToken(tokenId);
        if (!binding || !token)
            throw new Error('[EXEC_AUTH_TOKEN_NOT_BOUND] No approved HumanGate delegation exists');
        if (binding.goalId !== goalId || binding.taskId !== task.taskId || binding.sessionId !== sessionId)
            throw new Error('[EXEC_AUTH_SCOPE_MISMATCH] Token cannot cross goal, task, or session');
        const action = buildWorldAction({
            actionId: task.taskId,
            actionType: task.plan.capabilityId,
            target: binding.target,
            parameters: task.plan.parameters,
            userId: token.userId,
            deviceId: token.deviceId,
            sessionId,
            riskLevel: token.riskLevel,
        });
        const validation = globalWorldActionAuth.validateToken(token, action);
        if (!validation.valid)
            throw new Error(`[EXEC_AUTH_DENIED] ${validation.reason}`);
        return token;
    }
    /**
     * Helper that delegates human authorization request and approval strictly through canonical HumanGate.
     * ExecutiveRuntime owns ZERO independent token stores or minting authorities.
     */
    issueHumanToken(taskId, sessionId, approverUserId, options) {
        if (!approverUserId || !approverUserId.trim()) {
            throw new Error('[EXEC_AUTH_APPROVER_REQUIRED] An authorized human approver identifier is required');
        }
        const now = Date.now();
        const existingTask = globalExecutiveTaskManager.getTask(taskId);
        const capabilityId = options?.capabilityId || existingTask?.plan?.capabilityId || 'cap_executive_task';
        const target = options?.target || existingTask?.plan?.targetPath || existingTask?.plan?.parameters?.path || 'runtime_system';
        const parameters = options?.parameters || existingTask?.plan?.parameters || {};
        const riskLevel = options?.riskLevel || existingTask?.riskLevel || 'HIGH';
        const goalId = options?.goalId || existingTask?.goalId || 'goal_delegated';
        const deviceId = options?.deviceId || 'dev_host_master';
        // 1. Create request on canonical HumanGate
        const req = globalSupervisorHumanGate.createRequest({
            diagnosisId: `diag_exec_${taskId}`,
            anomalyId: `auth_exec_${taskId}`,
            timestamp: now,
            probableCause: 'Master human authorization requested',
            evidence: [taskId],
            affectedCapability: capabilityId,
            affectedResource: target,
            severity: riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            isInconclusive: false,
            recoverability: 'HUMAN_REQUIRED',
            recommendedRecovery: 'Await master operator approval',
            requiresHumanApproval: true,
        }, {
            planId: `plan_auth_${taskId}`,
            diagnosisId: `diag_exec_${taskId}`,
            anomalyId: `auth_exec_${taskId}`,
            recoveryClass: 'HUMAN_REQUIRED',
            steps: [{ stepIndex: 0, description: taskId, capabilityId, target, parameters, isReversible: riskLevel !== 'CRITICAL' }],
            requiresHumanApproval: true,
            riskLevel: riskLevel,
            timeoutMs: 60_000,
            maxAttempts: 1,
            createdTimestamp: now,
        }, {
            target,
            authorizationContext: { actionId: taskId, sessionId, goalId, taskId, deviceId, capabilityId, parameters, target },
        });
        // 2. Approve via canonical HumanGate
        const approved = globalSupervisorHumanGate.approve(req.requestId, approverUserId, {
            deviceId,
            sessionId,
            goalId,
            taskId,
        });
        if (!approved.authorizationToken) {
            throw new Error('[EXEC_AUTH_ISSUANCE_FAILED] HumanGate did not issue a canonical authorization token');
        }
        // 3. Bind token to executive scope
        this.bindings.set(approved.authorizationToken.tokenId, {
            tokenId: approved.authorizationToken.tokenId,
            goalId,
            taskId,
            sessionId,
            deviceId,
            capabilityId,
            target,
        });
        return approved.authorizationToken;
    }
    /**
     * Consumes a single-use token through canonical WorldAction authorization engine.
     */
    consumeToken(tokenId, taskId, sessionId) {
        const binding = this.bindings.get(tokenId);
        if (binding && (binding.taskId !== taskId || binding.sessionId !== sessionId)) {
            throw new Error('[EXEC_AUTH_CONSUME_SCOPE_MISMATCH] Token binding does not match consumption context');
        }
        globalWorldActionAuth.consumeToken(tokenId, taskId);
        return { consumed: true, tokenId };
    }
    requestAuthorization(task, goalIdOrReason = (task.goalId || 'goal_delegated'), sessionId = 'session_exec_default', deviceId) {
        if (!task.plan) {
            task.plan = {
                planId: `plan_auth_${task.taskId}`,
                capabilityId: task.requiredCapabilities?.[0] || 'cap_executive_task',
                actionName: 'EXECUTE',
                parameters: {},
                isDryRun: false,
            };
        }
        const goalId = task.goalId || (goalIdOrReason.startsWith('goal_') ? goalIdOrReason : 'goal_delegated');
        return this.requestMasterAuthorization(task, goalId, sessionId, deviceId);
    }
    grantAuthorization(requestId, approverUserId = 'master_operator') {
        const req = globalSupervisorHumanGate.getRequest(requestId);
        if (!req)
            return false;
        const approved = globalSupervisorHumanGate.approve(requestId, approverUserId, {
            goalId: req.authorizationContext?.goalId,
            taskId: req.authorizationContext?.taskId,
            sessionId: req.authorizationContext?.sessionId,
            deviceId: req.authorizationContext?.deviceId,
        });
        if (approved.authorizationToken) {
            req.token = approved.authorizationToken;
            req.status = 'APPROVED';
            this.bindings.set(approved.authorizationToken.tokenId, {
                tokenId: approved.authorizationToken.tokenId,
                goalId: req.authorizationContext?.goalId || 'goal_delegated',
                taskId: req.authorizationContext?.taskId || 'task_delegated',
                sessionId: req.authorizationContext?.sessionId || 'session_delegated',
                deviceId: approved.authorizationToken.deviceId,
                capabilityId: approved.authorizationToken.toolId,
                target: approved.authorizationToken.target,
            });
            return true;
        }
        return false;
    }
    denyAuthorization(requestId, reason) {
        const req = globalSupervisorHumanGate.getRequest(requestId);
        if (!req)
            return false;
        globalSupervisorHumanGate.reject(requestId, 'master_operator', reason);
        req.status = 'DENIED';
        req.token = undefined;
        return true;
    }
    hasPendingAuthorizations(goalId) {
        const pending = globalSupervisorHumanGate.getPendingRequests();
        if (!goalId)
            return pending.length > 0;
        return pending.some((r) => r.authorizationContext?.goalId === goalId || r.diagnosis?.diagnosisId?.includes(goalId) || r.diagnosisId?.includes(goalId));
    }
    verifyAuthorization(token) {
        if (!token)
            return false;
        const stored = globalWorldActionAuth.getToken(token.tokenId);
        return stored !== undefined && !globalWorldActionAuth.isRevoked(token.tokenId);
    }
    isTokenBound(tokenId) {
        return this.bindings.has(tokenId);
    }
    clear() { this.bindings.clear(); }
}
export const globalExecutiveAuthorization = new ExecutiveAuthorizationDelegator();
