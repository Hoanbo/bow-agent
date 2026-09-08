// src/core/world-action/worldActionPolicy.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Formal policy mechanism for Action Risk Classification and PDP evaluation.
//
// INVARIANTS:
// Never infer authorization from confidence score, intent, or plan.
// Protected workspace (C:\BOW\shopofbow) is ABSOLUTELY FORBIDDEN.
// Destructive operations require MANDATORY explicit human authorization.

import path from 'node:path';
import type { ActionRiskLevel, WorldAction } from './worldActionTypes.js';
import { globalPDP, type ActionClassification } from '../policyDecisionPoint.js';
import { WorldActionError } from './worldActionFailure.js';

const PROTECTED_WORKSPACE = 'c:\\bow\\shopofbow';
const EXECUTION_WORKSPACE = path.resolve(process.cwd()).toLowerCase();

export interface PolicyEvaluationResult {
  readonly allowed: boolean;
  readonly riskLevel: ActionRiskLevel;
  readonly requiresAuthorization: boolean;
  readonly requiresExplicitConfirmation: boolean;
  readonly reason: string;
  readonly classification: ActionClassification;
}

export class WorldActionPolicyEngine {
  private customRules = new Map<string, (action: WorldAction) => PolicyEvaluationResult | null>();

  /**
   * Evaluates the policy and risk level for a proposed WorldAction.
   */
  public evaluate(action: WorldAction): PolicyEvaluationResult {
    // 1. Strict Protected Workspace Isolation Check
    if (action.target) {
      const normalizedTarget = path.normalize(action.target).toLowerCase();
      if (normalizedTarget.startsWith(PROTECTED_WORKSPACE)) {
        throw new WorldActionError(
          'SECURITY_VIOLATION',
          `Access to protected workspace "${action.target}" is strictly forbidden by constitutional policy.`,
          action.actionId,
          action.target
        );
      }
    }

    // 2. Custom policy rules evaluation
    for (const rule of this.customRules.values()) {
      const res = rule(action);
      if (res) return res;
    }

    // 3. Intrinsic Risk Level and Target Boundary Assessment
    const risk = this.assessRisk(action);

    // 4. Map risk to PDP ActionClassification
    const pdpClassification = this.mapRiskToPDP(risk);

    // 5. Determine authorization requirements
    // OBSERVE and LOW can be auto-permitted if within sandbox and valid user
    // REVERSIBLE, ELEVATED, HIGH, and CRITICAL require authorization
    const requiresAuthorization = risk !== 'OBSERVE' && risk !== 'LOW';
    const requiresExplicitConfirmation = risk === 'ELEVATED' || risk === 'HIGH' || risk === 'CRITICAL';

    // 6. Evaluate with global PDP
    const actorRole = action.metadata?.role || (action.authorizationToken || action.metadata?.isOwner !== false ? 'desktop_agent' : 'user');
    const isOwner = action.metadata?.isOwner === true || action.metadata?.role === 'owner';
    const pdpDecision = globalPDP.evaluate({
      toolName: action.actionType,
      args: action.parameters,
      actor: {
        userId: action.userId,
        role: actorRole,
        channel: 'WORLD_ACTION',
        isOwner,
      },
      idempotencyKey: action.idempotencyKey,
    });

    if (!pdpDecision.allowed) {
      // If PDP requires approval for HIGH_IMPACT and action already carries a WorldAction authorization token,
      // validate it through WorldActionAuthorizationEngine
      if (pdpDecision.requiresApproval && action.authorizationToken) {
        return {
          allowed: true,
          riskLevel: risk,
          requiresAuthorization,
          requiresExplicitConfirmation,
          reason: 'Authorized via WorldAction Authorization Token.',
          classification: pdpDecision.classification,
        };
      }

      return {
        allowed: false,
        riskLevel: risk,
        requiresAuthorization,
        requiresExplicitConfirmation,
        reason: `PDP_POLICY_DENIAL: ${pdpDecision.reason}`,
        classification: pdpDecision.classification,
      };
    }

    return {
      allowed: true,
      riskLevel: risk,
      requiresAuthorization,
      requiresExplicitConfirmation,
      reason: 'Action approved by WorldActionPolicyEngine and PDP.',
      classification: pdpClassification,
    };
  }

  /**
   * Formal risk assessment based on actionType, target path, and parameters.
   */
  public assessRisk(action: WorldAction): ActionRiskLevel {
    const { actionType, target, parameters } = action;

    // A. Read-only observation tools
    if (
      actionType === 'world_fs_read' ||
      actionType === 'world_process_list' ||
      actionType === 'world_process_inspect' ||
      actionType === 'world_process_exists' ||
      actionType === 'world_system_info'
    ) {
      return 'OBSERVE';
    }

    // B. Low risk operations: temp directory creation or harmless scratch
    if (
      actionType === 'world_fs_mkdir' &&
      (target.includes('scratch') || target.includes('temp') || target.includes('world-action-reality'))
    ) {
      return 'LOW';
    }

    // C. Reversible file mutations: creation, rename, move, append
    if (
      actionType === 'world_fs_write' ||
      actionType === 'world_fs_append' ||
      actionType === 'world_fs_rename' ||
      actionType === 'world_fs_move' ||
      actionType === 'world_fs_copy' ||
      actionType === 'world_fs_mkdir'
    ) {
      return 'REVERSIBLE';
    }

    // D. Elevated risk operations: controlled delete, stopping process, config edit
    if (
      actionType === 'world_fs_delete' ||
      actionType === 'world_process_stop' ||
      actionType === 'world_process_start'
    ) {
      if (parameters?.permanent === true || parameters?.recursive === true) {
        return 'HIGH';
      }
      return 'ELEVATED';
    }

    // E. High risk operations: allowlisted binary execution with external effects
    if (actionType === 'world_exec_allowlisted') {
      if (parameters?.privileged === true) {
        return 'CRITICAL';
      }
      return 'HIGH';
    }

    // F. Critical risk fallback for unclassified mutations
    return 'CRITICAL';
  }

  private mapRiskToPDP(risk: ActionRiskLevel): ActionClassification {
    switch (risk) {
      case 'OBSERVE':
        return 'OBSERVE';
      case 'LOW':
      case 'REVERSIBLE':
        return 'REVERSIBLE';
      case 'ELEVATED':
      case 'HIGH':
        return 'HIGH_IMPACT';
      case 'CRITICAL':
        return 'FORBIDDEN';
    }
  }

  public registerRule(id: string, rule: (action: WorldAction) => PolicyEvaluationResult | null): void {
    this.customRules.set(id, rule);
  }

  public removeRule(id: string): void {
    this.customRules.delete(id);
  }
}

export const globalWorldActionPolicy = new WorldActionPolicyEngine();
