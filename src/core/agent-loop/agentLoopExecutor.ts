// src/core/agent-loop/agentLoopExecutor.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Governed Action Executor.
//
// Invariants:
// EXECUTION != VERIFICATION
// EXECUTION != COMMIT
// Only authorized actions can execute.
// USER_STOP halts execution before and during step execution.

import type { AgentLoopPlan, AgentLoopPlanStep } from './agentLoopTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import { globalCapabilityRuntime } from '../capability/capabilityRuntime.js';
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';
import { globalAgentLoopControl } from './agentLoopControl.js';
import { globalAgentLoopCancellation } from './agentLoopCancellation.js';

export interface ExecutionResult {
  readonly success: boolean;
  readonly executedSteps: number;
  readonly error?: string;
  readonly outputs: any[];
}

export class AgentLoopExecutor {
  public async executePlan(
    plan: AgentLoopPlan,
    options?: {
      isDryRun?: boolean;
      authorizationToken?: AuthorizationToken;
    }
  ): Promise<ExecutionResult> {
    // 1. Mandatory USER_STOP Check
    if (globalAgentLoopControl.isStopped()) {
      throw new Error(
        `EXECUTION_BLOCKED: USER_STOP is active (${globalAgentLoopControl.getStopReason() || 'Stopped by user'}).`
      );
    }
    globalAgentLoopCancellation.throwIfCancelled();

    // 2. Human Authorization Verification
    if (plan.requiresHumanGate && !options?.isDryRun) {
      if (!options?.authorizationToken) {
        throw new Error(`AUTHORIZATION_REQUIRED: Plan "${plan.planId}" requires explicit human authorization token.`);
      }

      const firstStep = plan.steps[0];
      const val = globalWorldActionAuth.validateToken(options.authorizationToken, {
        actionId: options.authorizationToken.actionId,
        actionType: firstStep?.capabilityId || 'agent_loop_action',
        target: firstStep?.target || 'loop_target',
        parameters: firstStep?.parameters || {},
        userId: options.authorizationToken.userId,
        deviceId: options.authorizationToken.deviceId,
        sessionToken: 's',
      } as any);

      if (!val.valid) {
        throw new Error(`AUTHORIZATION_DENIED: Token invalid: ${val.reason}`);
      }
    }

    // 3. Step Execution Loop
    const outputs: any[] = [];
    let executedSteps = 0;

    for (const step of plan.steps) {
      // Check cancellation between steps
      globalAgentLoopCancellation.throwIfCancelled();
      if (globalAgentLoopControl.isStopped()) {
        throw new Error('EXECUTION_HALTED: USER_STOP triggered during step execution.');
      }

      if (options?.isDryRun) {
        outputs.push({
          stepIndex: step.stepIndex,
          dryRun: true,
          status: 'PREVIEW_SUCCESS',
        });
        executedSteps++;
        continue;
      }

      // Real execution through CapabilityRuntime
      const capRes = await globalCapabilityRuntime.executeCapability({
        requestId: `req_loop_${step.stepIndex}_${Date.now()}`,
        capabilityId: step.capabilityId,
        parameters: step.parameters,
        target: step.target,
        isDryRun: options?.isDryRun,
        authorizationToken: options?.authorizationToken,
      });

      if (!capRes.success) {
        return {
          success: false,
          executedSteps,
          error: capRes.errorMessage || `Capability ${step.capabilityId} execution failed.`,
          outputs,
        };
      }

      outputs.push(capRes.output);
      executedSteps++;
    }

    return {
      success: true,
      executedSteps,
      outputs,
    };
  }
}

export const globalAgentLoopExecutor = new AgentLoopExecutor();
