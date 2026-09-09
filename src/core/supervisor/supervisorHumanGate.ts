// src/core/supervisor/supervisorHumanGate.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Dedicated Human Authorization Boundary & Cryptographic Token Binding.
//
// INVARIANTS:
// Zero mutation while WAITING_FOR_HUMAN.
// Replay protection: Single-use cryptographic tokens.
// USER_STOP > AUTONOMOUS_EXECUTION

import crypto from 'node:crypto';
import type { Diagnosis, RecoveryPlan, HumanGateRequest } from './supervisorTypes.js';
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';
import { SupervisorError } from './supervisorFailure.js';

export class SupervisorHumanGate {
  private pendingRequests = new Map<string, HumanGateRequest>();

  public createRequest(
    diagnosis: Diagnosis,
    plan: RecoveryPlan,
    options?: {
      target?: string;
      affectedResources?: string[];
      expectedEffects?: string[];
      ttlMs?: number;
      authorizationContext?: HumanGateRequest['authorizationContext'];
    }
  ): HumanGateRequest {
    const requestId = `gate_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const ttlMs = options?.ttlMs ?? 5 * 60 * 1000; // 5 minutes default
    const issuedAt = Date.now();
    const expiresAt = issuedAt + ttlMs;

    const request: HumanGateRequest = {
      requestId,
      anomalyId: diagnosis.anomalyId,
      diagnosis,
      proposedRecovery: plan,
      riskLevel: plan.riskLevel,
      target: options?.target,
      affectedResources: options?.affectedResources ?? [options?.target ?? 'runtime_system'],
      expectedEffects: options?.expectedEffects ?? [diagnosis.recommendedRecovery],
      rollbackPlan: plan.steps.some(s => s.isReversible) ? 'Governed automatic rollback step' : 'Manual operator inspection',
      status: 'PENDING',
      issuedAt,
      expiresAt,
      authorizationContext: options?.authorizationContext,
    };

    this.pendingRequests.set(requestId, request);
    return request;
  }

  public getPendingRequest(requestId: string): HumanGateRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  public getRequest(requestId: string): HumanGateRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  public getAllPendingRequests(): HumanGateRequest[] {
    return Array.from(this.pendingRequests.values()).filter(r => r.status === 'PENDING' && Date.now() < r.expiresAt);
  }

  public getPendingRequests(): HumanGateRequest[] {
    return this.getAllPendingRequests();
  }

  public approve(
    requestId: string,
    operatorId: string,
    context?: {
      deviceId?: string;
      sessionId?: string;
      goalId?: string;
      taskId?: string;
    }
  ): HumanGateRequest {
    const req = this.pendingRequests.get(requestId);
    if (!req) {
      throw new SupervisorError('UNAVAILABLE', `HumanGateRequest "${requestId}" not found.`);
    }

    if (Date.now() > req.expiresAt) {
      req.status = 'EXPIRED';
      throw new SupervisorError('TIMEOUT', `HumanGateRequest "${requestId}" has expired.`);
    }

    if (req.status !== 'PENDING') {
      throw new SupervisorError('POLICY_DENIED', `Cannot approve request in status "${req.status}".`);
    }

    // Issue cryptographically bound authorization token
    const token = globalWorldActionAuth.issueToken({
      actionId: req.authorizationContext?.actionId || req.requestId,
      userId: operatorId,
      operatorId,
      sessionId: context?.sessionId || req.authorizationContext?.sessionId,
      goalId: context?.goalId || req.authorizationContext?.goalId,
      taskId: context?.taskId || req.authorizationContext?.taskId,
      deviceId: context?.deviceId || req.authorizationContext?.deviceId || 'dev_host_master',
      toolId: req.authorizationContext?.capabilityId || req.proposedRecovery.steps[0]?.capabilityId || 'supervisor_recovery',
      capability: req.authorizationContext?.capabilityId || req.proposedRecovery.steps[0]?.capabilityId || 'supervisor_recovery',
      target: req.authorizationContext?.target || req.target || 'supervisor_target',
      parameters: req.authorizationContext?.parameters || req.proposedRecovery.steps[0]?.parameters || {},
      riskLevel: req.riskLevel as any,
      singleUse: true,
      ttlMs: 60_000,
    });

    req.status = 'APPROVED';
    req.authorizationToken = token;
    return req;
  }

  public deny(requestId: string, reason: string): HumanGateRequest {
    const req = this.pendingRequests.get(requestId);
    if (!req) {
      throw new SupervisorError('UNAVAILABLE', `HumanGateRequest "${requestId}" not found.`);
    }

    req.status = 'DENIED';
    return req;
  }

  public reject(requestId: string, operatorId: string, reason?: string): HumanGateRequest {
    return this.deny(requestId, reason || operatorId);
  }

  public cancelAllBySafeStop(): void {
    for (const req of this.pendingRequests.values()) {
      if (req.status === 'PENDING') {
        req.status = 'CANCELLED_SAFE_STOP';
      }
    }
  }

  public clear(): void {
    this.pendingRequests.clear();
  }
}

export const globalSupervisorHumanGate = new SupervisorHumanGate();
export const globalHumanGate = globalSupervisorHumanGate;
export { SupervisorHumanGate as HumanGate };
