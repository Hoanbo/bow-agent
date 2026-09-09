import type { AuthorizationToken, WorldAction, ActionRiskLevel } from './worldActionTypes.js';
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
export declare class WorldActionAuthorizationEngine {
    private tokens;
    private revokedTokenIds;
    private readonly hmacSecret;
    constructor(secret?: string);
    /**
     * Issues a cryptographically bound authorization token for a specific action.
     */
    issueToken(opts: TokenIssueOptions): AuthorizationToken;
    /**
     * Validates an authorization token against an action envelope.
     * Enforces strict binding to actionId, operatorId/userId, deviceId, toolId/capability, target, parametersHash,
     * sessionId, goalId, taskId, and riskLevel.
     */
    validateToken(token: AuthorizationToken, action: WorldAction, context?: AuthorizationValidationContext): {
        valid: boolean;
        reason?: string;
    };
    /**
     * Atomically consumes a token, rendering it permanently single-use.
     */
    consumeToken(tokenId: string, actionId: string): void;
    /**
     * Revokes an existing authorization token.
     */
    revokeToken(tokenId: string): boolean;
    isRevoked(tokenId: string): boolean;
    getToken(tokenId: string): AuthorizationToken | undefined;
    clearAll(): void;
}
export declare const globalWorldActionAuth: WorldActionAuthorizationEngine;
