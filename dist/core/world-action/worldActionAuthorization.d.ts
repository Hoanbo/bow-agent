import type { AuthorizationToken, WorldAction, ActionRiskLevel } from './worldActionTypes.js';
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
export declare class WorldActionAuthorizationEngine {
    private tokens;
    private readonly hmacSecret;
    constructor(secret?: string);
    /**
     * Issues a cryptographically bound authorization token for a specific action.
     */
    issueToken(opts: TokenIssueOptions): AuthorizationToken;
    /**
     * Validates an authorization token against an action envelope.
     * Enforces strict binding to actionId, userId, deviceId, toolId, target, and parametersHash.
     */
    validateToken(token: AuthorizationToken, action: WorldAction): {
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
    getToken(tokenId: string): AuthorizationToken | undefined;
    clearAll(): void;
}
export declare const globalWorldActionAuth: WorldActionAuthorizationEngine;
