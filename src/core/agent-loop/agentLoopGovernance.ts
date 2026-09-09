// src/core/agent-loop/agentLoopGovernance.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Policy Decision Point (PDP) Governance Engine.
//
// Invariants:
// BOWCON CANNOT GRANT ITSELF PERMISSIONS
// CRITICAL_BLOCKED ACTIONS FAIL CLOSED
// PROTECTED WORKSPACE C:\BOW\shopofbow IS STRICTLY BLOCKED

import type { AgentLoopPlan } from './agentLoopTypes.js';

export interface GovernanceDecision {
  readonly allowed: boolean;
  readonly recoveryClass: 'OBSERVE' | 'AUTO_SAFE' | 'AUTO_REVERSIBLE' | 'HUMAN_REQUIRED' | 'CRITICAL_BLOCKED';
  readonly requiresHumanGate: boolean;
  readonly reason: string;
}

export class AgentLoopGovernanceEngine {
  private readonly protectedWorkspace = 'c:\\bow\\shopofbow';

  public evaluate(plan: AgentLoopPlan): GovernanceDecision {
    // 1. Protected Workspace Check
    for (const step of plan.steps) {
      const targetStr = String(step.target || '').toLowerCase();
      const paramStr = JSON.stringify(step.parameters || '').toLowerCase();

      if (targetStr.includes(this.protectedWorkspace) || paramStr.includes(this.protectedWorkspace)) {
        return {
          allowed: false,
          recoveryClass: 'CRITICAL_BLOCKED',
          requiresHumanGate: false,
          reason: 'Protected workspace "C:\\BOW\\shopofbow" is strictly isolated (READS=0, WRITES=0, IMPORTS=0, TOUCHES=0).',
        };
      }

      // Forbidden shell invocation detection
      if (
        paramStr.includes('cmd.exe') ||
        paramStr.includes('powershell.exe') ||
        paramStr.includes('/bin/sh') ||
        paramStr.includes('/bin/bash') ||
        paramStr.includes('eval(') ||
        paramStr.includes('new function') ||
        paramStr.includes('rm -rf') ||
        paramStr.includes('format c:') ||
        paramStr.includes('del /')
      ) {
        return {
          allowed: false,
          recoveryClass: 'CRITICAL_BLOCKED',
          requiresHumanGate: false,
          reason: 'Arbitrary shell execution or code evaluation is strictly forbidden.',
        };
      }
    }

    // 2. Human Gate for Elevated or Destructive Actions
    if (plan.requiresHumanGate || plan.recoveryClass === 'HUMAN_REQUIRED') {
      return {
        allowed: true,
        recoveryClass: 'HUMAN_REQUIRED',
        requiresHumanGate: true,
        reason: 'Action requires explicit human operator authorization token.',
      };
    }

    // 3. Auto Reversible
    if (plan.recoveryClass === 'AUTO_REVERSIBLE') {
      return {
        allowed: true,
        recoveryClass: 'AUTO_REVERSIBLE',
        requiresHumanGate: false,
        reason: 'Action is auto-reversible with declared rollback handlers.',
      };
    }

    // 4. Default Auto Safe
    return {
      allowed: true,
      recoveryClass: 'AUTO_SAFE',
      requiresHumanGate: false,
      reason: 'Action is non-destructive and verified auto-safe.',
    };
  }
}

export const globalAgentLoopGovernance = new AgentLoopGovernanceEngine();
