// src/core/world-action/worldActionRequest.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Canonical WorldAction envelope builder, validator, and parameter normalizer.
import path from 'node:path';
import { generateWorldActionId, hashParameters } from './worldActionTypes.js';
import { WorldActionError } from './worldActionFailure.js';
export function buildWorldAction(params) {
    if (!params.actionType || typeof params.actionType !== 'string') {
        throw new WorldActionError('PLANNING_FAILURE', 'actionType must be a non-empty string.');
    }
    const now = Date.now();
    const actionId = params.actionId || generateWorldActionId();
    const requestId = params.requestId || `req_${now.toString(36)}`;
    const traceId = params.traceId || `trc_${now.toString(36)}`;
    const tenantId = params.tenantId || 'tenant_default';
    const deviceId = params.deviceId || 'dev_host_master';
    const sessionId = params.sessionId || `ses_${now.toString(36)}`;
    const userId = params.userId || 'user_primary';
    const ttl = params.ttlMs ?? 300_000; // 5 minutes default
    const expiresAt = now + ttl;
    // Normalize target path if it looks like a path
    let target = params.target || '';
    if (target && (target.includes('/') || target.includes('\\') || target.startsWith('.'))) {
        target = path.normalize(target);
    }
    const normalizedParameters = normalizeParameters(params.parameters || {});
    const parametersHash = hashParameters(normalizedParameters);
    const idempotencyKey = params.idempotencyKey || `idem_${actionId}`;
    return {
        actionId,
        requestId,
        traceId,
        tenantId,
        deviceId,
        sessionId,
        userId,
        actionType: params.actionType,
        target,
        parameters: normalizedParameters,
        parametersHash,
        riskLevel: params.riskLevel || 'REVERSIBLE',
        authorizationState: 'NONE',
        executionState: 'UNPREPARED',
        verificationState: 'UNVERIFIED',
        lifecycleState: 'REQUESTED',
        createdAt: now,
        expiresAt,
        idempotencyKey,
        isDryRun: params.isDryRun === true,
        metadata: params.metadata || {},
    };
}
export function normalizeParameters(params) {
    const normalized = {};
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined)
            continue;
        if (typeof v === 'string' && (k.toLowerCase().includes('path') || k.toLowerCase().includes('target') || k.toLowerCase().includes('file'))) {
            normalized[k] = path.normalize(v);
        }
        else {
            normalized[k] = v;
        }
    }
    return normalized;
}
