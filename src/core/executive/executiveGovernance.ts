// src/core/executive/executiveGovernance.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Executive Governance & Policy Decision Point (PDP).
// Enforces security boundaries, protected workspace isolation, shell execution prohibition,
// and determines whether tasks can AUTO_EXECUTE or must AWAIT_HUMAN_AUTHORIZATION.

import path from 'node:path';
import type { ExecutiveTask } from './executiveTypes.js';

export interface ExecutiveGovernanceDecision {
  readonly permitted: boolean;
  readonly requiresHumanApproval: boolean;
  readonly riskLevel: string;
  readonly reason: string;
  readonly violations: string[];
}

export class ExecutiveGovernance {
  private _protectedPath = path.normalize('C:/BOW/shopofbow').toLowerCase();

  private _forbiddenExecutables = [
    'cmd.exe',
    'powershell.exe',
    'pwsh.exe',
    'bash.exe',
    'sh.exe',
    '/bin/sh',
    '/bin/bash',
    'zsh',
  ];

  public evaluate(task: ExecutiveTask): ExecutiveGovernanceDecision {
    const violations: string[] = [];

    // 1. Protected Workspace Isolation Check
    if (task.plan?.targetPath) {
      const normTarget = path.normalize(task.plan.targetPath).toLowerCase();
      if (normTarget.startsWith(this._protectedPath)) {
        violations.push(
          `Protected workspace violation: Access to '${task.plan.targetPath}' is strictly forbidden.`
        );
      }
    }

    const descLower = (task.description + ' ' + task.title).toLowerCase();
    if (descLower.includes('shopofbow') || descLower.includes('c:\\bow\\shopofbow')) {
      violations.push('Protected workspace violation: Task references protected shopofbow.');
    }

    // 2. Unrestricted Shell Execution Prohibition
    for (const shell of this._forbiddenExecutables) {
      if (descLower.includes(shell)) {
        violations.push(`Unrestricted shell execution forbidden: References '${shell}'`);
      }
    }

    if (task.plan) {
      const planStr = JSON.stringify(task.plan).toLowerCase();
      for (const shell of this._forbiddenExecutables) {
        if (planStr.includes(shell)) {
          violations.push(`Forbidden executable / unrestricted shell execution forbidden in plan: References '${shell}'`);
        }
      }
      if (planStr.includes('eval(') || planStr.includes('new function(')) {
        violations.push('Arbitrary code execution (eval / new Function) is strictly forbidden.');
      }
    }

    if (violations.length > 0) {
      return {
        permitted: false,
        requiresHumanApproval: true,
        riskLevel: 'CRITICAL',
        reason: 'CRITICAL_SECURITY_VIOLATION',
        violations,
      };
    }

    // HIGH and CRITICAL risk levels unconditionally require human approval
    let requiresHumanApproval = false;
    if (task.riskLevel === 'CRITICAL' || task.riskLevel === 'HIGH') {
      requiresHumanApproval = true;
    } else if (task.permissionLevel === 'AWAIT_HUMAN_AUTHORIZATION') {
      requiresHumanApproval = true;
    } else if (task.taskType === 'GATE') {
      requiresHumanApproval = true;
    }

    return {
      permitted: true,
      requiresHumanApproval,
      riskLevel: task.riskLevel,
      reason: requiresHumanApproval ? 'AWAIT_HUMAN_APPROVAL' : 'AUTO_EXECUTE_PERMITTED',
      violations: [],
    };
  }
}

export const globalExecutiveGovernance = new ExecutiveGovernance();
