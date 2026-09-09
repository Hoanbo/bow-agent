// src/core/world-action/worldActionTypes.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Canonical data contracts, type envelopes, and interfaces for the governed
// physical host execution layer.
//
// INVARIANTS:
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// INTENT != AUTHORIZATION
// PLAN != AUTHORIZATION
// PREVIEW != EXECUTION
// REQUEST != AUTHORIZATION
// AUTHORIZATION != TOOL_EXECUTION
// TOOL_EXECUTION != VERIFICATION
// VERIFICATION != COMMIT
// PREVIOUS_APPROVAL != CURRENT_APPROVAL

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Risk Classification Hierarchy
// ---------------------------------------------------------------------------
export type ActionRiskLevel =
  | 'OBSERVE'     // Read file metadata, inspect process state, inspect system info
  | 'LOW'         // Create temporary directory, write temporary test file
  | 'REVERSIBLE'  // Create file, rename file, move file, modify controlled application state
  | 'ELEVATED'    // Delete user file, terminate non-critical process, modify configuration
  | 'HIGH'        // Install software, modify security configuration, privileged operations
  | 'CRITICAL';   // Destructive fs operations, credential/security changes, irreversible system changes

export const WORLD_ACTION_RISK_PRECEDENCE: Record<ActionRiskLevel, number> = {
  OBSERVE: 1,
  LOW: 2,
  REVERSIBLE: 3,
  ELEVATED: 4,
  HIGH: 5,
  CRITICAL: 6,
};

// ---------------------------------------------------------------------------
// Subsystem States
// ---------------------------------------------------------------------------
export type ActionAuthorizationState =
  | 'NONE'
  | 'NOT_REQUIRED'
  | 'REQUIRED'
  | 'AWAITING_CONFIRMATION'
  | 'AUTHORIZED'
  | 'DENIED'
  | 'EXPIRED'
  | 'CONSUMED';

export type ActionExecutionState =
  | 'UNPREPARED'
  | 'PREPARED'
  | 'EXECUTING'
  | 'EXECUTED'
  | 'EXECUTION_FAILED'
  | 'CANCELLED'
  | 'ROLLED_BACK';

export type ActionVerificationState =
  | 'UNVERIFIED'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'VERIFICATION_FAILED';

export type ActionLifecycleState =
  | 'REQUESTED'
  | 'UNDERSTOOD'
  | 'PLANNED'
  | 'AUTHORIZATION_REQUIRED'
  | 'AWAITING_CONFIRMATION'
  | 'AUTHORIZED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMMITTED'
  | 'DENIED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'CANCELLED';

// ---------------------------------------------------------------------------
// Scoped Authorization Token
// ---------------------------------------------------------------------------
export interface AuthorizationToken {
  readonly tokenId: string;
  readonly actionId: string;
  readonly userId: string;
  readonly operatorId: string;
  readonly sessionId?: string;
  readonly goalId?: string;
  readonly taskId?: string;
  readonly deviceId: string;
  readonly toolId: string;
  readonly capability: string;
  readonly target: string;
  readonly parameters?: Record<string, any>;
  readonly parametersHash: string;
  readonly riskLevel: ActionRiskLevel;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly singleUse: boolean;
  consumedAt?: number;
  consumedByActionId?: string;
  readonly signature: string;
}

// ---------------------------------------------------------------------------
// Prepared Action Plan (Phase 1 Output — Zero Physical Side Effects)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Physical Execution & Verification Results
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Canonical WorldAction Envelope
// ---------------------------------------------------------------------------
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

  // Phase details
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

// ---------------------------------------------------------------------------
// Tool Definition Contract
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------
export function hashParameters(params: Record<string, any>): string {
  const sorted = JSON.stringify(params, Object.keys(params || {}).sort());
  return crypto.createHash('sha256').update(sorted).digest('hex');
}

export function generateWorldActionId(): string {
  const ts = Date.now().toString(36);
  const rnd = crypto.randomBytes(6).toString('hex');
  return `act_${ts}_${rnd}`;
}

export function generateTokenId(): string {
  const ts = Date.now().toString(36);
  const rnd = crypto.randomBytes(6).toString('hex');
  return `tok_${ts}_${rnd}`;
}

export function generateExecutionId(): string {
  const ts = Date.now().toString(36);
  const rnd = crypto.randomBytes(6).toString('hex');
  return `exec_${ts}_${rnd}`;
}
