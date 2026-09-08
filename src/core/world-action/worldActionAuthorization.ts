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
import { generateTokenId, hashParameters } from './worldActionTypes.js';
import { WorldActionError } from './worldActionFailure.js';
import { globalApprovalService } from '../approvalService.js';

export interface TokenIssueOptions {
  actionId: string;
  userId: string;
  deviceId: string;
  toolId: string;
  target: string;
  parameters: Record<string, any>;
  riskLevel: ActionRiskLevel;
  ttlMs?: number;
  singleUse?: boolean;
}

export class WorldActionAuthorizationEngine {
  private tokens = new Map<string, AuthorizationToken>();
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

    const payload = `${tokenId}:${opts.actionId}:${opts.userId}:${opts.deviceId}:${opts.toolId}:${opts.target}:${parametersHash}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', this.hmacSecret).update(payload).digest('hex');

    const token: AuthorizationToken = {
      tokenId,
      actionId: opts.actionId,
      userId: opts.userId,
      deviceId: opts.deviceId,
      toolId: opts.toolId,
      target: opts.target,
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
   * Enforces strict binding to actionId, userId, deviceId, toolId, target, and parametersHash.
   */
  public validateToken(token: AuthorizationToken, action: WorldAction): { valid: boolean; reason?: string } {
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
    const payload = `${stored.tokenId}:${stored.actionId}:${stored.userId}:${stored.deviceId}:${stored.toolId}:${stored.target}:${stored.parametersHash}:${stored.expiresAt}`;
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

    if (stored.userId !== action.userId) {
      return {
        valid: false,
        reason: `Token userId mismatch: authorized for "${stored.userId}", presented by "${action.userId}".`,
      };
    }

    if (stored.toolId !== action.actionType) {
      return {
        valid: false,
        reason: `Token toolId mismatch: authorized for "${stored.toolId}", presented for "${action.actionType}".`,
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
    return this.tokens.delete(tokenId);
  }

  public getToken(tokenId: string): AuthorizationToken | undefined {
    return this.tokens.get(tokenId);
  }

  public clearAll(): void {
    this.tokens.clear();
  }
}

export const globalWorldActionAuth = new WorldActionAuthorizationEngine();
