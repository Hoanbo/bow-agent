export type ActionRiskLevel = 'OBSERVE' | 'LOW' | 'REVERSIBLE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
export declare const WORLD_ACTION_RISK_PRECEDENCE: Record<ActionRiskLevel, number>;
export type ActionAuthorizationState = 'NONE' | 'NOT_REQUIRED' | 'REQUIRED' | 'AWAITING_CONFIRMATION' | 'AUTHORIZED' | 'DENIED' | 'EXPIRED' | 'CONSUMED';
export type ActionExecutionState = 'UNPREPARED' | 'PREPARED' | 'EXECUTING' | 'EXECUTED' | 'EXECUTION_FAILED' | 'CANCELLED' | 'ROLLED_BACK';
export type ActionVerificationState = 'UNVERIFIED' | 'VERIFYING' | 'VERIFIED' | 'VERIFICATION_FAILED';
export type ActionLifecycleState = 'REQUESTED' | 'UNDERSTOOD' | 'PLANNED' | 'AUTHORIZATION_REQUIRED' | 'AWAITING_CONFIRMATION' | 'AUTHORIZED' | 'EXECUTING' | 'VERIFYING' | 'COMMITTED' | 'DENIED' | 'FAILED' | 'ROLLED_BACK' | 'CANCELLED';
export interface AuthorizationToken {
    readonly tokenId: string;
    readonly actionId: string;
    readonly userId: string;
    readonly deviceId: string;
    readonly toolId: string;
    readonly target: string;
    readonly parametersHash: string;
    readonly riskLevel: ActionRiskLevel;
    readonly issuedAt: number;
    readonly expiresAt: number;
    readonly singleUse: boolean;
    consumedAt?: number;
    consumedByActionId?: string;
    readonly signature: string;
}
export interface ActionPreparedPlan {
    readonly actionId: string;
    readonly toolId: string;
    readonly toolName: string;
    readonly target: string;
    readonly normalizedParameters: Record<string, any>;
    readonly riskLevel: ActionRiskLevel;
    readonly requiresAuthorization: boolean;
    readonly requiresExplicitConfirmation: boolean;
    readonly expectedEffect: string;
    readonly verificationStrategy: string;
    readonly rollbackStrategy: string;
    readonly preparedAt: number;
}
export interface ActionExecutionResult {
    readonly success: boolean;
    readonly actionId: string;
    readonly executionId: string;
    readonly toolId: string;
    readonly startedAt: number;
    readonly completedAt: number;
    readonly actualEffect: string;
    readonly output?: any;
    readonly errorMessage?: string;
    readonly errorCode?: string;
    readonly metadata: Record<string, any>;
}
export interface ActionVerificationResult {
    readonly passed: boolean;
    readonly actionId: string;
    readonly toolId: string;
    readonly verifiedAt: number;
    readonly verificationStrategy: string;
    readonly checksPerformed: string[];
    readonly observation: Record<string, any>;
    readonly failureReason?: string;
}
export interface ActionRollbackResult {
    readonly success: boolean;
    readonly actionId: string;
    readonly rolledBackAt: number;
    readonly verificationPassed: boolean;
    readonly actualEffect: string;
    readonly errorMessage?: string;
}
export interface WorldAction {
    readonly actionId: string;
    readonly requestId: string;
    readonly traceId: string;
    readonly tenantId: string;
    readonly deviceId: string;
    readonly sessionId: string;
    readonly userId: string;
    readonly actionType: string;
    readonly target: string;
    readonly parameters: Record<string, any>;
    readonly parametersHash: string;
    readonly riskLevel: ActionRiskLevel;
    authorizationState: ActionAuthorizationState;
    executionState: ActionExecutionState;
    verificationState: ActionVerificationState;
    lifecycleState: ActionLifecycleState;
    readonly createdAt: number;
    readonly expiresAt: number;
    readonly idempotencyKey: string;
    readonly isDryRun: boolean;
    preparedPlan?: ActionPreparedPlan;
    authorizationToken?: AuthorizationToken;
    executionResult?: ActionExecutionResult;
    verificationResult?: ActionVerificationResult;
    rollbackResult?: ActionRollbackResult;
    committedAt?: number;
    failureReason?: string;
    failureCode?: string;
    metadata: Record<string, any>;
}
export interface WorldToolDefinition {
    readonly toolId: string;
    readonly name: string;
    readonly version: string;
    readonly description: string;
    readonly category: 'filesystem' | 'process_observation' | 'process_lifecycle' | 'command_execution' | 'system';
    readonly riskLevel: ActionRiskLevel;
    readonly inputSchema: Record<string, any>;
    readonly outputSchema: Record<string, any>;
    readonly authorizationRequirement: 'NONE' | 'SCOPED_TOKEN' | 'EXPLICIT_CONFIRMATION';
    readonly reversibility: 'IRREVERSIBLE' | 'REVERSIBLE_WITH_ROLLBACK' | 'READ_ONLY';
    readonly timeoutMs: number;
    readonly idempotencySupport: boolean;
    readonly enabled: boolean;
    readonly allowedTargets?: string[];
    readonly verifier: (action: WorldAction, executionResult: ActionExecutionResult) => Promise<ActionVerificationResult>;
    readonly executor: (action: WorldAction, context?: any) => Promise<ActionExecutionResult>;
    readonly rollback?: (action: WorldAction, executionResult: ActionExecutionResult) => Promise<ActionRollbackResult>;
}
export declare function hashParameters(params: Record<string, any>): string;
export declare function generateWorldActionId(): string;
export declare function generateTokenId(): string;
export declare function generateExecutionId(): string;
