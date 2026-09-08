// src/core/world-action/worldActionApproval.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Confirmation model and approval lifecycle manager for governed physical host actions.
//
// INVARIANTS:
// Mandatory explicit confirmation for ELEVATED, HIGH, and CRITICAL actions.
// Never silently promote a lower-risk policy into authorization for a higher-risk action.

import crypto from 'node:crypto';
import type { WorldAction, AuthorizationToken } from './worldActionTypes.js';
import { globalWorldActionAuth } from './worldActionAuthorization.js';
import { WorldActionError } from './worldActionFailure.js';

export interface ActionConfirmationRequest {
  readonly confirmationId: string;
  readonly actionId: string;
  readonly userId: string;
  readonly deviceId: string;
  readonly toolId: string;
  readonly target: string;
  readonly riskLevel: string;
  readonly parameters: Record<string, any>;
  readonly requestedAt: number;
  readonly expiresAt: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
}

export class WorldActionApprovalManager {
  private pendingRequests = new Map<string, ActionConfirmationRequest>();

  public createConfirmationRequest(action: WorldAction, ttlMs: number = 120_000): ActionConfirmationRequest {
    const confirmationId = `conf_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const now = Date.now();
    const req: ActionConfirmationRequest = {
      confirmationId,
      actionId: action.actionId,
      userId: action.userId,
      deviceId: action.deviceId,
      toolId: action.actionType,
      target: action.target,
      riskLevel: action.riskLevel,
      parameters: action.parameters,
      requestedAt: now,
      expiresAt: now + ttlMs,
      status: 'PENDING',
    };

    this.pendingRequests.set(confirmationId, req);
    action.authorizationState = 'AWAITING_CONFIRMATION';
    action.lifecycleState = 'AWAITING_CONFIRMATION';
    return req;
  }

  public approve(confirmationId: string, approverUserId: string): AuthorizationToken {
    const req = this.pendingRequests.get(confirmationId);
    if (!req) {
      throw new WorldActionError('AUTHORIZATION_FAILURE', `Confirmation request "${confirmationId}" not found.`);
    }

    if (Date.now() > req.expiresAt) {
      req.status = 'EXPIRED';
      throw new WorldActionError('AUTHORIZATION_FAILURE', `Confirmation request "${confirmationId}" has expired.`);
    }

    if (req.status !== 'PENDING') {
      throw new WorldActionError('AUTHORIZATION_FAILURE', `Confirmation request is already ${req.status}.`);
    }

    req.status = 'APPROVED';

    // Issue authorization token bound to this exact request
    return globalWorldActionAuth.issueToken({
      actionId: req.actionId,
      userId: req.userId,
      deviceId: req.deviceId,
      toolId: req.toolId,
      target: req.target,
      parameters: req.parameters,
      riskLevel: req.riskLevel as any,
    });
  }

  public reject(confirmationId: string, reason?: string): void {
    const req = this.pendingRequests.get(confirmationId);
    if (!req) return;
    req.status = 'REJECTED';
  }

  public getRequest(confirmationId: string): ActionConfirmationRequest | undefined {
    return this.pendingRequests.get(confirmationId);
  }

  public clear(): void {
    this.pendingRequests.clear();
  }
}

export const globalWorldActionApproval = new WorldActionApprovalManager();
