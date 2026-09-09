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
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';
import { SupervisorError } from './supervisorFailure.js';
export class SupervisorHumanGate {
    pendingRequests = new Map();
    createRequest(diagnosis, plan, options) {
        const requestId = `gate_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const ttlMs = options?.ttlMs ?? 5 * 60 * 1000; // 5 minutes default
        const issuedAt = Date.now();
        const expiresAt = issuedAt + ttlMs;
        const request = {
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
    getPendingRequest(requestId) {
        return this.pendingRequests.get(requestId);
    }
    getRequest(requestId) {
        return this.pendingRequests.get(requestId);
    }
    getAllPendingRequests() {
        return Array.from(this.pendingRequests.values()).filter(r => r.status === 'PENDING' && Date.now() < r.expiresAt);
    }
    getPendingRequests() {
        return this.getAllPendingRequests();
    }
    approve(requestId, operatorId, context) {
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
            riskLevel: req.riskLevel,
            singleUse: true,
            ttlMs: 60_000,
        });
        req.status = 'APPROVED';
        req.authorizationToken = token;
        return req;
    }
    deny(requestId, reason) {
        const req = this.pendingRequests.get(requestId);
        if (!req) {
            throw new SupervisorError('UNAVAILABLE', `HumanGateRequest "${requestId}" not found.`);
        }
        req.status = 'DENIED';
        return req;
    }
    reject(requestId, operatorId, reason) {
        return this.deny(requestId, reason || operatorId);
    }
    cancelAllBySafeStop() {
        for (const req of this.pendingRequests.values()) {
            if (req.status === 'PENDING') {
                req.status = 'CANCELLED_SAFE_STOP';
            }
        }
    }
    clear() {
        this.pendingRequests.clear();
    }
}
export const globalSupervisorHumanGate = new SupervisorHumanGate();
export const globalHumanGate = globalSupervisorHumanGate;
export { SupervisorHumanGate as HumanGate };
