import type { WorldAction, ActionRiskLevel } from './worldActionTypes.js';
export interface CreateActionParams {
    actionId?: string;
    requestId?: string;
    traceId?: string;
    tenantId?: string;
    deviceId?: string;
    sessionId?: string;
    userId?: string;
    actionType: string;
    target: string;
    parameters: Record<string, any>;
    riskLevel?: ActionRiskLevel;
    idempotencyKey?: string;
    isDryRun?: boolean;
    ttlMs?: number;
    metadata?: Record<string, any>;
}
export declare function buildWorldAction(params: CreateActionParams): WorldAction;
export declare function normalizeParameters(params: Record<string, any>): Record<string, any>;
