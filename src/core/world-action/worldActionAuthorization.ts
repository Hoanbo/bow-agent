// src/core/world-action/worldActionAuthorization.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Dedicated authorization subsystem with cryptographically bound, single-use,
// action-specific, target-specific, and parameter-specific tokens.
//
// INVARIANTS:
// An authorization for "delete file A" MUST NOT authorize "delete file B".
// An authorization for "start app X" MUST NOT authorize "start app Y".
// A previously approved action MUST NOT be reusable for a different parameter set.
// A consumed token MUST NEVER authorize another action.

import crypto from 'node:crypto';
import type { AuthorizationToken, WorldAction, ActionRiskLevel } from './worldActionTypes.js';
import { generateTokenId, hashParameters, WORLD_ACTION_RISK_PRECEDENCE } from './worldActionTypes.js';
import { WorldActionError } from './worldActionFailure.js';
import { globalApprovalService } from '../approvalService.js';

export interface TokenIssueOptions {
  actionId: string;
  userId: string;
  operatorId?: string;
  sessionId?: string;
  deviceId: string;
  goalId?: string;
  taskId?: string;
  toolId: string;
  capability?: string;
  target: string;
  parameters: Record<string, any>;
  riskLevel: ActionRiskLevel;
  ttlMs?: number;
  singleUse?: boolean;
}

export interface AuthorizationValidationContext {
  operatorId?: string;
  sessionId?: string;
  deviceId?: string;
  goalId?: string;
  taskId?: string;
  capability?: string;
  target?: string;
  parameters?: Record<string, any>;
  riskLevel?: ActionRiskLevel;
}

export class WorldActionAuthorizationEngine {
  private tokens = new Map<string, AuthorizationToken>();
  private revokedTokenIds = new Set<string>();
  private readonly hmacSecret: string;

  constructor(secret?: string) {
    this.hmacSecret = secret || crypto.randomBytes(32).toString('hex');
  }

  /**
   * Issues a cryptographically bound authorization token for a specific action.
   */
  public issueToken(opts: TokenIssueOptions): AuthorizationToken {
    const tokenId = generateTokenId();
    const now = Date.now();
    const ttl = opts.ttlMs ?? 60_000; // 60s default TTL
    const expiresAt = now + ttl;
    const parametersHash = hashParameters(opts.parameters);
    const singleUse = opts.singleUse !== false; // Default true
    const operatorId = opts.operatorId || opts.userId;
    const capability = opts.capability || opts.toolId;
    const sessionId = opts.sessionId;
    const goalId = opts.goalId;
    const taskId = opts.taskId;

    const payload = `${tokenId}:${opts.actionId}:${operatorId}:${opts.deviceId}:${capability}:${opts.target}:${parametersHash}:${sessionId || ''}:${goalId || ''}:${taskId || ''}:${opts.riskLevel}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', this.hmacSecret).update(payload).digest('hex');

    const token: AuthorizationToken = {
      tokenId,
      actionId: opts.actionId,
      userId: opts.userId,
      operatorId,
      sessionId,
      goalId,
      taskId,
      deviceId: opts.deviceId,
      toolId: opts.toolId,
      capability,
      target: opts.target,
      parameters: opts.parameters,
      parametersHash,
      riskLevel: opts.riskLevel,
      issuedAt: now,
      expiresAt,
      singleUse,
      signature,
    };

    this.tokens.set(tokenId, token);
    return token;
  }

  /**
   * Validates an authorization token against an action envelope.
   * Enforces strict binding to actionId, operatorId/userId, deviceId, toolId/capability, target, parametersHash,
   * sessionId, goalId, taskId, and riskLevel.
   */
  public validateToken(
    token: AuthorizationToken,
    action: WorldAction,
    context?: AuthorizationValidationContext
  ): { valid: boolean; reason?: string } {
    if (this.revokedTokenIds.has(token.tokenId)) {
      return { valid: false, reason: `Authorization token ${token.tokenId} has been revoked.` };
    }

    const stored = this.tokens.get(token.tokenId);
    if (!stored) {
      return { valid: false, reason: 'Token not found in active authorization registry.' };
    }

    // Check expiration
    if (Date.now() > stored.expiresAt) {
      return { valid: false, reason: `Authorization token ${stored.tokenId} has expired.` };
    }

    // Check consumption (anti-replay guarantee)
    if (stored.consumedAt) {
      return {
        valid: false,
        reason: `Authorization token ${stored.tokenId} has already been consumed by action ${stored.consumedByActionId}.`,
      };
    }

    // Check cryptographic signature integrity
    const payload = `${stored.tokenId}:${stored.actionId}:${stored.operatorId || stored.userId}:${stored.deviceId}:${stored.capability || stored.toolId}:${stored.target}:${stored.parametersHash}:${stored.sessionId || ''}:${stored.goalId || ''}:${stored.taskId || ''}:${stored.riskLevel}:${stored.expiresAt}`;
    const expectedSig = crypto.createHmac('sha256', this.hmacSecret).update(payload).digest('hex');
    if (stored.signature !== expectedSig) {
      return { valid: false, reason: 'Authorization token cryptographic signature invalid.' };
    }

    // Strict identity and envelope binding checks
    if (stored.actionId !== action.actionId) {
      return {
        valid: false,
        reason: `Token actionId mismatch: authorized for "${stored.actionId}", presented by "${action.actionId}".`,
      };
    }

    if (stored.userId !== action.userId && stored.operatorId !== action.userId) {
      return {
        valid: false,
        reason: `Token operator mismatch: authorized for "${stored.operatorId || stored.userId}", presented by "${action.userId}".`,
      };
    }

    if (stored.deviceId !== action.deviceId) {
      return {
        valid: false,
        reason: `Token device mismatch: authorized for "${stored.deviceId}", presented by "${action.deviceId}".`,
      };
    }

    const normCap = (c?: string) => (c ? (c.toLowerCase().replace(/\./g, '_').startsWith('cap_') ? c.toLowerCase().replace(/\./g, '_') : `cap_${c.toLowerCase().replace(/\./g, '_')}`) : '');
    const capMatch =
      stored.toolId === action.actionType ||
      stored.capability === action.actionType ||
      normCap(stored.toolId) === normCap(action.actionType) ||
      normCap(stored.capability) === normCap(action.actionType);

    if (!capMatch) {
      return {
        valid: false,
        reason: `Token capability mismatch: authorized for "${stored.capability || stored.toolId}", presented for "${action.actionType}".`,
      };
    }

    if (stored.target !== action.target) {
      return {
        valid: false,
        reason: `Token target mismatch: authorized for "${stored.target}", presented for "${action.target}".`,
      };
    }

    const currentParamsHash = hashParameters(action.parameters);
    if (stored.parametersHash !== currentParamsHash) {
      return {
        valid: false,
        reason: `Token parameter mismatch: parameters do not match the cryptographic authorization hash.`,
      };
    }

    if (action.riskLevel && stored.riskLevel) {
      const storedPrec = WORLD_ACTION_RISK_PRECEDENCE[stored.riskLevel] ?? 0;
      const actionPrec = WORLD_ACTION_RISK_PRECEDENCE[action.riskLevel] ?? 0;
      if (storedPrec < actionPrec) {
        return {
          valid: false,
          reason: `Token risk level mismatch: authorized for "${stored.riskLevel}", required at least "${action.riskLevel}".`,
        };
      }
    }

    if (stored.sessionId && action.sessionId && stored.sessionId !== action.sessionId) {
      return {
        valid: false,
        reason: `Token session mismatch: authorized for "${stored.sessionId}", presented for "${action.sessionId}".`,
      };
    }

    const actionGoalId = (action.metadata?.goalId as string | undefined);
    if (stored.goalId && actionGoalId && stored.goalId !== actionGoalId) {
      return {
        valid: false,
        reason: `Token goal mismatch: authorized for "${stored.goalId}", presented for "${actionGoalId}".`,
      };
    }

    const actionTaskId = (action.metadata?.taskId as string | undefined);
    if (stored.taskId && actionTaskId && stored.taskId !== actionTaskId) {
      return {
        valid: false,
        reason: `Token task mismatch: authorized for "${stored.taskId}", presented for "${actionTaskId}".`,
      };
    }

    // Optional explicit context validations
    if (context) {
      if (context.operatorId && stored.operatorId !== context.operatorId && stored.userId !== context.operatorId) {
        return { valid: false, reason: `Token operator mismatch against context: authorized for "${stored.operatorId}", context requires "${context.operatorId}".` };
      }
      if (context.sessionId && stored.sessionId && stored.sessionId !== context.sessionId) {
        return { valid: false, reason: `Token session mismatch against context: authorized for "${stored.sessionId}", context requires "${context.sessionId}".` };
      }
      if (context.deviceId && stored.deviceId !== context.deviceId) {
        return { valid: false, reason: `Token device mismatch against context: authorized for "${stored.deviceId}", context requires "${context.deviceId}".` };
      }
      if (context.goalId && stored.goalId && stored.goalId !== context.goalId) {
        return { valid: false, reason: `Token goal mismatch against context: authorized for "${stored.goalId}", context requires "${context.goalId}".` };
      }
      if (context.taskId && stored.taskId && stored.taskId !== context.taskId) {
        return { valid: false, reason: `Token task mismatch against context: authorized for "${stored.taskId}", context requires "${context.taskId}".` };
      }
      if (context.capability && stored.capability !== context.capability && stored.toolId !== context.capability) {
        return { valid: false, reason: `Token capability mismatch against context: authorized for "${stored.capability}", context requires "${context.capability}".` };
      }
      if (context.target && stored.target !== context.target) {
        return { valid: false, reason: `Token target mismatch against context: authorized for "${stored.target}", context requires "${context.target}".` };
      }
      if (context.riskLevel && stored.riskLevel) {
        const storedPrec = WORLD_ACTION_RISK_PRECEDENCE[stored.riskLevel] ?? 0;
        const ctxPrec = WORLD_ACTION_RISK_PRECEDENCE[context.riskLevel] ?? 0;
        if (storedPrec < ctxPrec) {
          return { valid: false, reason: `Token risk level mismatch against context: authorized for "${stored.riskLevel}", context requires "${context.riskLevel}".` };
        }
      }
      if (context.parameters && stored.parametersHash !== hashParameters(context.parameters)) {
        return { valid: false, reason: `Token parameter mismatch against context.` };
      }
    }

    return { valid: true };
  }

  /**
   * Atomically consumes a token, rendering it permanently single-use.
   */
  public consumeToken(tokenId: string, actionId: string): void {
    const stored = this.tokens.get(tokenId);
    if (!stored) {
      throw new WorldActionError('AUTHORIZATION_FAILURE', `Token "${tokenId}" not found.`, actionId);
    }
    if (stored.consumedAt) {
      throw new WorldActionError(
        'AUTHORIZATION_FAILURE',
        `Token "${tokenId}" is already consumed and cannot be reused.`,
        actionId
      );
    }

    stored.consumedAt = Date.now();
    stored.consumedByActionId = actionId;
  }

  /**
   * Revokes an existing authorization token.
   */
  public revokeToken(tokenId: string): boolean {
    this.revokedTokenIds.add(tokenId);
    return this.tokens.delete(tokenId);
  }

  public isRevoked(tokenId: string): boolean {
    return this.revokedTokenIds.has(tokenId);
  }

  public getToken(tokenId: string): AuthorizationToken | undefined {
    return this.tokens.get(tokenId);
  }

  public clearAll(): void {
    this.tokens.clear();
    this.revokedTokenIds.clear();
  }
}

export const globalWorldActionAuth = new WorldActionAuthorizationEngine();
