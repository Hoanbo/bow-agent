import type { HumanGateRequest } from '../supervisor/supervisorTypes.js';
export declare class MasterHumanAuthorityError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: string, message: string, details?: Record<string, unknown> | undefined);
}
export interface MasterOperatorContext {
    readonly operatorId: string;
    readonly deviceId: string;
    readonly sessionId?: string;
    readonly role: 'MASTER_OPERATOR';
}
export declare const FORBIDDEN_EXECUTION_PATTERNS: readonly ["cmd.exe", "powershell.exe", "/bin/sh", "/bin/bash", "eval", "new Function", "execSync", "child_process.exec"];
export declare class MasterHumanAuthority {
    static readonly CANONICAL_MASTER_ID = "master_operator";
    private _masterOperatorId;
    private _trustedMasterAliases;
    private _isUserStopActive;
    private _userStopReason?;
    private _userStoppedAt?;
    private _userStoppedBy?;
    /**
     * Returns whether the given operator identifier represents the Master Human Authority.
     */
    isMasterOperator(operatorId?: string): boolean;
    get masterOperatorId(): string;
    setMasterOperatorId(operatorId: string): void;
    registerMasterAlias(alias: string): void;
    get isUserStopActive(): boolean;
    get userStopReason(): string | undefined;
    get userStoppedAt(): number | undefined;
    get userStoppedBy(): string | undefined;
    /**
     * Immediately activates USER_STOP globally across all subsystems.
     * Halts: ExecutiveRuntime, AgentLoopRuntime, SupervisorRuntime, CapabilityRuntime,
     * and cancels all pending HumanGate requests.
     */
    triggerUserStop(reason?: string, operatorId?: string): void;
    /**
     * Resets USER_STOP.
     * INVARIANT: Only the authentic Master Human Authority may reset USER_STOP.
     */
    resetUserStop(operatorId: string): void;
    /**
     * Approves a HumanGate request on behalf of the Master Human Authority.
     * Strictly enforces that only the Master Human Authority can approve.
     */
    approveGateRequest(requestId: string, operatorId: string, context?: {
        deviceId?: string;
        sessionId?: string;
        goalId?: string;
        taskId?: string;
    }): HumanGateRequest;
    /**
     * Denies a HumanGate request.
     */
    denyGateRequest(requestId: string, operatorId: string, reason?: string): HumanGateRequest;
    /**
     * Revokes an existing authorization token.
     */
    revokeAuthorizationToken(tokenId: string, operatorId: string): boolean;
    /**
     * Validates that the requested target or command is not a forbidden shell execution.
     * INVARIANT: Master authority does NOT mean unrestricted host shell execution.
     */
    assertPermittedExecution(commandOrPath: string): void;
    clear(): void;
}
export declare const globalMasterHumanAuthority: MasterHumanAuthority;
