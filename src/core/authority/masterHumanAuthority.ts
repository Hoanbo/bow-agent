// src/core/authority/masterHumanAuthority.ts
// BOWCON V4.0 — MS-1.3.38: MASTER HUMAN AUTHORITY UNIFICATION & EXECUTIVE GOVERNANCE CLOSURE
//
// Canonical Master Human Authority.
// BOWCON is a personal AI runtime intended to serve one master human operator.
// There must be exactly ONE authoritative human governance hierarchy for the entire runtime.
//
// Invariants:
// USER_STOP > MASTER_AUTHORITY_AUTONOMOUS_EXECUTION
// MASTER_HUMAN_AUTHORITY > AUTONOMOUS_EXECUTION
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// DETECTION != DIAGNOSIS
// DIAGNOSIS != AUTHORIZATION
// AUTHORIZATION != SUCCESS
// EXECUTION != VERIFICATION
// VERIFICATION != COMMIT
// FAILURE != BRAIN_DEATH
// DRY_RUN != MUTATION
// EXECUTIVE_RUNTIME != HOST_EXECUTION_ENGINE
// EXECUTIVE_RUNTIME -> HumanGate -> CapabilityRuntime

import crypto from 'node:crypto';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';
import { globalSupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
import type { HumanGateRequest } from '../supervisor/supervisorTypes.js';
import { globalExecutiveCancellation } from '../executive/executiveCancellation.js';
import { globalAgentLoopControl } from '../agent-loop/agentLoopControl.js';
import { globalSupervisorRuntime } from '../supervisor/supervisorRuntime.js';
import { globalCapabilityRuntime } from '../capability/capabilityRuntime.js';
import { globalExecutiveAudit } from '../executive/executiveAudit.js';

export class MasterHumanAuthorityError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'MasterHumanAuthorityError';
  }
}

export interface MasterOperatorContext {
  readonly operatorId: string;
  readonly deviceId: string;
  readonly sessionId?: string;
  readonly role: 'MASTER_OPERATOR';
}

export const FORBIDDEN_EXECUTION_PATTERNS = [
  'cmd.exe',
  'powershell.exe',
  '/bin/sh',
  '/bin/bash',
  'eval',
  'new Function',
  'execSync',
  'child_process.exec',
] as const;

export class MasterHumanAuthority {
  public static readonly CANONICAL_MASTER_ID = 'master_operator';
  private _masterOperatorId: string = MasterHumanAuthority.CANONICAL_MASTER_ID;
  private _trustedMasterAliases = new Set<string>([
    MasterHumanAuthority.CANONICAL_MASTER_ID,
    'user_primary',
    'operator',
    'master',
    'boss_user',
  ]);
  private _isUserStopActive = false;
  private _userStopReason?: string;
  private _userStoppedAt?: number;
  private _userStoppedBy?: string;

  /**
   * Returns whether the given operator identifier represents the Master Human Authority.
   */
  public isMasterOperator(operatorId?: string): boolean {
    if (!operatorId) return false;
    const normalized = operatorId.trim().toLowerCase();
    return (
      normalized === this._masterOperatorId.toLowerCase() ||
      this._trustedMasterAliases.has(normalized)
    );
  }

  public get masterOperatorId(): string {
    return this._masterOperatorId;
  }

  public setMasterOperatorId(operatorId: string): void {
    if (!operatorId || !operatorId.trim()) {
      throw new MasterHumanAuthorityError(
        'INVALID_MASTER_ID',
        'Master Operator ID cannot be empty.'
      );
    }
    this._masterOperatorId = operatorId.trim();
    this._trustedMasterAliases.add(this._masterOperatorId.toLowerCase());
  }

  public registerMasterAlias(alias: string): void {
    if (alias && alias.trim()) {
      this._trustedMasterAliases.add(alias.trim().toLowerCase());
    }
  }

  // -------------------------------------------------------------------------
  // 1. Absolute USER_STOP Supremacy
  // -------------------------------------------------------------------------

  public get isUserStopActive(): boolean {
    return (
      this._isUserStopActive ||
      globalExecutiveCancellation.isUserStopActive ||
      globalAgentLoopControl.isStopped() ||
      globalSupervisorRuntime.isSafeStopActive() ||
      globalCapabilityRuntime.isEmergencyStopActive()
    );
  }

  public get userStopReason(): string | undefined {
    return (
      this._userStopReason ||
      globalExecutiveCancellation.userStopReason ||
      'Master Human Operator emergency stop'
    );
  }

  public get userStoppedAt(): number | undefined {
    return this._userStoppedAt;
  }

  public get userStoppedBy(): string | undefined {
    return this._userStoppedBy;
  }

  /**
   * Immediately activates USER_STOP globally across all subsystems.
   * Halts: ExecutiveRuntime, AgentLoopRuntime, SupervisorRuntime, CapabilityRuntime,
   * and cancels all pending HumanGate requests.
   */
  public triggerUserStop(
    reason: string = 'Master Human Operator Emergency Stop',
    operatorId: string = this._masterOperatorId
  ): void {
    this._isUserStopActive = true;
    this._userStopReason = reason;
    this._userStoppedAt = Date.now();
    this._userStoppedBy = operatorId;

    // Propagate unconditionally to all subsystem cancellation planes
    globalExecutiveCancellation.triggerUserStop(reason);
    globalAgentLoopControl.stop(reason);
    globalSupervisorRuntime.triggerSafeStop(reason);
    globalCapabilityRuntime.triggerEmergencyStop(reason);
    globalSupervisorHumanGate.cancelAllBySafeStop();

    globalExecutiveAudit.record('MASTER_USER_STOP_TRIGGERED', 'GLOBAL', {
      operatorId,
      reason,
      timestamp: this._userStoppedAt,
    });
  }

  /**
   * Resets USER_STOP.
   * INVARIANT: Only the authentic Master Human Authority may reset USER_STOP.
   */
  public resetUserStop(operatorId: string): void {
    if (!this.isMasterOperator(operatorId)) {
      throw new MasterHumanAuthorityError(
        'UNAUTHORIZED_USER_STOP_RESET',
        `Unauthorized operator "${operatorId}" cannot reset USER_STOP. Only Master Human Authority can reset.`
      );
    }

    this._isUserStopActive = false;
    this._userStopReason = undefined;
    this._userStoppedAt = undefined;
    this._userStoppedBy = undefined;

    // Reset across all subsystems
    globalExecutiveCancellation.resetUserStop();
    globalAgentLoopControl.resetStop(operatorId, operatorId);
    globalSupervisorRuntime.resetSafeStop(operatorId);
    globalCapabilityRuntime.resetEmergencyStop(operatorId);

    globalExecutiveAudit.record('MASTER_USER_STOP_RESET', 'GLOBAL', {
      operatorId,
      timestamp: Date.now(),
    });
  }

  // -------------------------------------------------------------------------
  // 2. Canonical Human Gate Governance
  // -------------------------------------------------------------------------

  /**
   * Approves a HumanGate request on behalf of the Master Human Authority.
   * Strictly enforces that only the Master Human Authority can approve.
   */
  public approveGateRequest(
    requestId: string,
    operatorId: string,
    context?: {
      deviceId?: string;
      sessionId?: string;
      goalId?: string;
      taskId?: string;
    }
  ): HumanGateRequest {
    if (this.isUserStopActive) {
      throw new MasterHumanAuthorityError(
        'USER_STOP_ACTIVE',
        'Cannot approve HumanGate request while USER_STOP is active.'
      );
    }

    if (!this.isMasterOperator(operatorId)) {
      throw new MasterHumanAuthorityError(
        'UNAUTHORIZED_APPROVAL',
        `Operator "${operatorId}" is not the Master Human Authority. Approval rejected.`
      );
    }

    const approved = globalSupervisorHumanGate.approve(requestId, operatorId, context);

    globalExecutiveAudit.record('MASTER_GATE_APPROVED', requestId, {
      operatorId,
      tokenId: approved.authorizationToken?.tokenId,
      context,
    });

    return approved;
  }

  /**
   * Denies a HumanGate request.
   */
  public denyGateRequest(
    requestId: string,
    operatorId: string,
    reason: string = 'Denied by Master Human Authority'
  ): HumanGateRequest {
    if (!this.isMasterOperator(operatorId)) {
      throw new MasterHumanAuthorityError(
        'UNAUTHORIZED_DENIAL',
        `Operator "${operatorId}" is not the Master Human Authority. Denial rejected.`
      );
    }

    const denied = globalSupervisorHumanGate.deny(requestId, reason);

    globalExecutiveAudit.record('MASTER_GATE_DENIED', requestId, {
      operatorId,
      reason,
    });

    return denied;
  }

  /**
   * Revokes an existing authorization token.
   */
  public revokeAuthorizationToken(tokenId: string, operatorId: string): boolean {
    if (!this.isMasterOperator(operatorId)) {
      throw new MasterHumanAuthorityError(
        'UNAUTHORIZED_REVOCATION',
        `Operator "${operatorId}" is not authorized to revoke tokens.`
      );
    }

    const success = globalWorldActionAuth.revokeToken(tokenId);
    globalExecutiveAudit.record('MASTER_TOKEN_REVOKED', tokenId, {
      operatorId,
      revoked: success,
    });
    return success;
  }

  // -------------------------------------------------------------------------
  // 3. Prohibited Shell Execution Guard
  // -------------------------------------------------------------------------

  /**
   * Validates that the requested target or command is not a forbidden shell execution.
   * INVARIANT: Master authority does NOT mean unrestricted host shell execution.
   */
  public assertPermittedExecution(commandOrPath: string): void {
    if (!commandOrPath) return;
    const lower = commandOrPath.toLowerCase();

    for (const forbidden of FORBIDDEN_EXECUTION_PATTERNS) {
      if (lower.includes(forbidden.toLowerCase())) {
        throw new MasterHumanAuthorityError(
          'FORBIDDEN_HOST_SHELL_EXECUTION',
          `Prohibited host execution pattern detected: "${forbidden}". Master authority does not permit unrestricted shell execution.`
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. Lifecycle Reset
  // -------------------------------------------------------------------------

  public clear(): void {
    this._isUserStopActive = false;
    this._userStopReason = undefined;
    this._userStoppedAt = undefined;
    this._userStoppedBy = undefined;
  }
}

export const globalMasterHumanAuthority = new MasterHumanAuthority();
