// Executive authorization delegation. This is not an authorization root.
import type { AuthorizationToken, WorldAction } from '../world-action/worldActionTypes.js';
import { buildWorldAction } from '../world-action/worldActionRequest.js';
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';
import { globalSupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
import type { HumanGateRequest } from '../supervisor/supervisorTypes.js';
import type { ExecutiveTask, GoalId, SessionId } from './executiveTypes.js';
import { globalExecutiveTaskManager } from './executiveTask.js';

export interface ExecutiveAuthorizationBinding {
  readonly tokenId: string; readonly goalId: GoalId; readonly taskId: string;
  readonly sessionId: SessionId; readonly deviceId: string; readonly capabilityId: string; readonly target: string;
}

export class ExecutiveAuthorizationDelegator {
  private readonly bindings = new Map<string, ExecutiveAuthorizationBinding>();

  /** Requests approval from the pre-existing HumanGate; Executive cannot issue a token. */
  public requestMasterAuthorization(task: ExecutiveTask, goalId: GoalId, sessionId: SessionId, deviceId = 'dev_host_master'): HumanGateRequest {
    const plan = task.plan;
    if (!plan) throw new Error('[EXEC_AUTH_PLAN_REQUIRED] A governed capability plan is required');
    const now = Date.now();
    const target = plan.targetPath ?? String(plan.parameters.path ?? '');
    return globalSupervisorHumanGate.createRequest(
      { diagnosisId: `diag_exec_${task.taskId}`, anomalyId: `auth_exec_${task.taskId}`, timestamp: now, probableCause: 'Master authorization required', evidence: [task.title], affectedCapability: plan.capabilityId, affectedResource: target, severity: task.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH', isInconclusive: false, recoverability: 'HUMAN_REQUIRED', recommendedRecovery: 'Await master operator approval', requiresHumanApproval: true },
      { planId: `plan_auth_${task.taskId}`, diagnosisId: `diag_exec_${task.taskId}`, anomalyId: `auth_exec_${task.taskId}`, recoveryClass: 'HUMAN_REQUIRED', steps: [{ stepIndex: 0, description: task.title, capabilityId: plan.capabilityId, target, parameters: plan.parameters, isReversible: task.riskLevel !== 'CRITICAL' }], requiresHumanApproval: true, riskLevel: task.riskLevel, timeoutMs: 60_000, maxAttempts: 1, createdTimestamp: now },
      { target, authorizationContext: { actionId: task.taskId, sessionId, goalId, taskId: task.taskId, deviceId, capabilityId: plan.capabilityId, parameters: plan.parameters, target } }
    );
  }

  /** Records the scope of an existing HumanGate-issued token; it does not mint or consume it. */
  public bindAuthorizedToken(token: AuthorizationToken, task: ExecutiveTask, goalId: GoalId, sessionId: SessionId): ExecutiveAuthorizationBinding {
    const plan = task.plan;
    if (!plan?.capabilityId) throw new Error('[EXEC_AUTH_PLAN_REQUIRED] A governed capability plan is required');
    const target = plan.targetPath ?? String(plan.parameters.path ?? '');
    if (token.actionId !== task.taskId || token.toolId !== plan.capabilityId || token.target !== target) throw new Error('[EXEC_AUTH_BINDING_MISMATCH] HumanGate token does not match task envelope');
    const binding = { tokenId: token.tokenId, goalId, taskId: task.taskId, sessionId, deviceId: token.deviceId, capabilityId: plan.capabilityId, target };
    this.bindings.set(token.tokenId, binding);
    return binding;
  }

  public getBinding(tokenId: string): ExecutiveAuthorizationBinding | undefined {
    return this.bindings.get(tokenId);
  }

  public resolveAuthorizedToken(tokenId: string, task: ExecutiveTask, goalId: GoalId, sessionId: SessionId): AuthorizationToken {
    const binding = this.bindings.get(tokenId); const token = globalWorldActionAuth.getToken(tokenId);
    if (!binding || !token) throw new Error('[EXEC_AUTH_TOKEN_NOT_BOUND] No approved HumanGate delegation exists');
    if (binding.goalId !== goalId || binding.taskId !== task.taskId || binding.sessionId !== sessionId) throw new Error('[EXEC_AUTH_SCOPE_MISMATCH] Token cannot cross goal, task, or session');
    const action: WorldAction = buildWorldAction({
      actionId: task.taskId,
      actionType: task.plan!.capabilityId,
      target: binding.target,
      parameters: task.plan!.parameters,
      userId: token.userId,
      deviceId: token.deviceId,
      sessionId,
      riskLevel: token.riskLevel as any,
    });
    const validation = globalWorldActionAuth.validateToken(token, action);
    if (!validation.valid) throw new Error(`[EXEC_AUTH_DENIED] ${validation.reason}`);
    return token;
  }

  /**
   * Helper that delegates human authorization request and approval strictly through canonical HumanGate.
   * ExecutiveRuntime owns ZERO independent token stores or minting authorities.
   */
  public issueHumanToken(
    taskId: string,
    sessionId: string,
    approverUserId: string,
    options?: {
      capabilityId?: string;
      target?: string;
      parameters?: Record<string, any>;
      riskLevel?: string;
      goalId?: GoalId;
      deviceId?: string;
    }
  ): AuthorizationToken {
    if (!approverUserId || !approverUserId.trim()) {
      throw new Error('[EXEC_AUTH_APPROVER_REQUIRED] An authorized human approver identifier is required');
    }

    const now = Date.now();
    const existingTask = globalExecutiveTaskManager.getTask(taskId);
    const capabilityId = options?.capabilityId || existingTask?.plan?.capabilityId || 'cap_executive_task';
    const target = options?.target || existingTask?.plan?.targetPath || (existingTask?.plan?.parameters?.path as string) || 'runtime_system';
    const parameters = options?.parameters || existingTask?.plan?.parameters || {};
    const riskLevel = options?.riskLevel || existingTask?.riskLevel || 'HIGH';
    const goalId = options?.goalId || existingTask?.goalId || 'goal_delegated';
    const deviceId = options?.deviceId || 'dev_host_master';

    // 1. Create request on canonical HumanGate
    const req = globalSupervisorHumanGate.createRequest(
      {
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
      },
      {
        planId: `plan_auth_${taskId}`,
        diagnosisId: `diag_exec_${taskId}`,
        anomalyId: `auth_exec_${taskId}`,
        recoveryClass: 'HUMAN_REQUIRED',
        steps: [{ stepIndex: 0, description: taskId, capabilityId, target, parameters, isReversible: riskLevel !== 'CRITICAL' }],
        requiresHumanApproval: true,
        riskLevel: riskLevel as any,
        timeoutMs: 60_000,
        maxAttempts: 1,
        createdTimestamp: now,
      },
      {
        target,
        authorizationContext: { actionId: taskId, sessionId, goalId, taskId, deviceId, capabilityId, parameters, target },
      }
    );

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
  public consumeToken(
    tokenId: string,
    taskId: string,
    sessionId: string
  ): { consumed: boolean; tokenId: string } {
    const binding = this.bindings.get(tokenId);
    if (binding && (binding.taskId !== taskId || binding.sessionId !== sessionId)) {
      throw new Error('[EXEC_AUTH_CONSUME_SCOPE_MISMATCH] Token binding does not match consumption context');
    }
    globalWorldActionAuth.consumeToken(tokenId, taskId);
    return { consumed: true, tokenId };
  }

  public requestAuthorization(
    task: ExecutiveTask,
    goalIdOrReason: GoalId = (task.goalId || 'goal_delegated') as GoalId,
    sessionId: SessionId = 'session_exec_default' as SessionId,
    deviceId?: string
  ): any {
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
    return this.requestMasterAuthorization(task, goalId as GoalId, sessionId, deviceId);
  }

  public grantAuthorization(requestId: string, approverUserId: string = 'master_operator'): boolean {
    const req = globalSupervisorHumanGate.getRequest(requestId);
    if (!req) return false;
    const approved = globalSupervisorHumanGate.approve(requestId, approverUserId, {
      goalId: req.authorizationContext?.goalId,
      taskId: req.authorizationContext?.taskId,
      sessionId: req.authorizationContext?.sessionId,
      deviceId: req.authorizationContext?.deviceId,
    });
    if (approved.authorizationToken) {
      (req as any).token = approved.authorizationToken;
      (req as any).status = 'APPROVED';
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

  public denyAuthorization(requestId: string, reason: string): boolean {
    const req = globalSupervisorHumanGate.getRequest(requestId);
    if (!req) return false;
    globalSupervisorHumanGate.reject(requestId, 'master_operator', reason);
    (req as any).status = 'DENIED';
    (req as any).token = undefined;
    return true;
  }

  public hasPendingAuthorizations(goalId?: string): boolean {
    const pending = globalSupervisorHumanGate.getPendingRequests();
    if (!goalId) return pending.length > 0;
    return pending.some((r) => r.authorizationContext?.goalId === goalId || r.diagnosis?.diagnosisId?.includes(goalId) || (r as any).diagnosisId?.includes(goalId));
  }

  public verifyAuthorization(token: AuthorizationToken): boolean {
    if (!token) return false;
    const stored = globalWorldActionAuth.getToken(token.tokenId);
    return stored !== undefined && !globalWorldActionAuth.isRevoked(token.tokenId);
  }

  public isTokenBound(tokenId: string): boolean {
    return this.bindings.has(tokenId);
  }

  public clear(): void { this.bindings.clear(); }
}

export const globalExecutiveAuthorization = new ExecutiveAuthorizationDelegator();

