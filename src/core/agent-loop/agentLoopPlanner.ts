// src/core/agent-loop/agentLoopPlanner.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Mutation-Free Action Planner.
//
// Invariants:
// PLANNING != EXECUTION
// Generating a plan commits ZERO mutations to host filesystem or processes.

import crypto from 'node:crypto';
import type {
  AgentLoopObjective,
  AgentLoopDecision,
  AgentLoopPlan,
  AgentLoopPlanStep,
} from './agentLoopTypes.js';
import type { RecoveryClass } from '../supervisor/supervisorTypes.js';
import type { ActionRiskLevel } from '../world-action/worldActionTypes.js';
import { globalCapabilityRegistry } from '../capability/capabilityRegistry.js';

export class AgentLoopPlanner {
  public plan(
    objective: AgentLoopObjective,
    decision: AgentLoopDecision
  ): AgentLoopPlan {
    const planId = `lplan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (!decision.actionRequired || !decision.proposedCapability) {
      return {
        planId,
        objectiveId: objective.objectiveId,
        decisionId: decision.decisionId,
        steps: [],
        recoveryClass: 'AUTO_SAFE',
        requiresHumanGate: false,
        riskLevel: 'LOW',
        timeoutMs: 5000,
        maxAttempts: 3,
        createdTimestamp: Date.now(),
      };
    }

    const desc = globalCapabilityRegistry.getCapability(decision.proposedCapability);
    const riskLevel: ActionRiskLevel = desc ? desc.riskLevel : 'LOW';

    // Map risk to recoveryClass & requiresHumanGate
    let recoveryClass: RecoveryClass = 'AUTO_SAFE';
    let requiresHumanGate = false;

    if (desc) {
      if (
        desc.requiresHumanApproval ||
        desc.requiresExplicitAuthorization ||
        desc.riskLevel === 'HIGH' ||
        desc.riskLevel === 'CRITICAL' ||
        desc.riskLevel === 'ELEVATED'
      ) {
        recoveryClass = 'HUMAN_REQUIRED';
        requiresHumanGate = true;
      } else if (desc.reversible) {
        recoveryClass = 'AUTO_REVERSIBLE';
      }
    }

    const step: AgentLoopPlanStep = {
      stepIndex: 1,
      description: `Execute capability ${decision.proposedCapability} for objective ${objective.title}`,
      capabilityId: decision.proposedCapability,
      target: decision.targetResource,
      parameters: decision.parameters || {},
      isReversible: desc ? desc.reversible : false,
    };

    return {
      planId,
      objectiveId: objective.objectiveId,
      decisionId: decision.decisionId,
      steps: [step],
      recoveryClass,
      requiresHumanGate,
      riskLevel,
      timeoutMs: 15000,
      maxAttempts: 3,
      createdTimestamp: Date.now(),
    };
  }
}

export const globalAgentLoopPlanner = new AgentLoopPlanner();
