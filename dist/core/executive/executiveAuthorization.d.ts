import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import type { HumanGateRequest } from '../supervisor/supervisorTypes.js';
import type { ExecutiveTask, GoalId, SessionId } from './executiveTypes.js';
export interface ExecutiveAuthorizationBinding {
    readonly tokenId: string;
    readonly goalId: GoalId;
    readonly taskId: string;
    readonly sessionId: SessionId;
    readonly deviceId: string;
    readonly capabilityId: string;
    readonly target: string;
}
export declare class ExecutiveAuthorizationDelegator {
    private readonly bindings;
    /** Requests approval from the pre-existing HumanGate; Executive cannot issue a token. */
    requestMasterAuthorization(task: ExecutiveTask, goalId: GoalId, sessionId: SessionId, deviceId?: string): HumanGateRequest;
    /** Records the scope of an existing HumanGate-issued token; it does not mint or consume it. */
    bindAuthorizedToken(token: AuthorizationToken, task: ExecutiveTask, goalId: GoalId, sessionId: SessionId): ExecutiveAuthorizationBinding;
    getBinding(tokenId: string): ExecutiveAuthorizationBinding | undefined;
    resolveAuthorizedToken(tokenId: string, task: ExecutiveTask, goalId: GoalId, sessionId: SessionId): AuthorizationToken;
    /**
     * Helper that delegates human authorization request and approval strictly through canonical HumanGate.
     * ExecutiveRuntime owns ZERO independent token stores or minting authorities.
     */
    issueHumanToken(taskId: string, sessionId: string, approverUserId: string, options?: {
        capabilityId?: string;
        target?: string;
        parameters?: Record<string, any>;
        riskLevel?: string;
        goalId?: GoalId;
        deviceId?: string;
    }): AuthorizationToken;
    /**
     * Consumes a single-use token through canonical WorldAction authorization engine.
     */
    consumeToken(tokenId: string, taskId: string, sessionId: string): {
        consumed: boolean;
        tokenId: string;
    };
    requestAuthorization(task: ExecutiveTask, goalIdOrReason?: GoalId, sessionId?: SessionId, deviceId?: string): any;
    grantAuthorization(requestId: string, approverUserId?: string): boolean;
    denyAuthorization(requestId: string, reason: string): boolean;
    hasPendingAuthorizations(goalId?: string): boolean;
    verifyAuthorization(token: AuthorizationToken): boolean;
    isTokenBound(tokenId: string): boolean;
    clear(): void;
}
export declare const globalExecutiveAuthorization: ExecutiveAuthorizationDelegator;
