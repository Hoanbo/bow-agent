// src/core/supervisor/supervisorTypes.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Canonical type definitions, interfaces, and contracts for supervisory autonomy.
//
// INVARIANTS:
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// DETECTION != DIAGNOSIS
// DIAGNOSIS != AUTHORIZATION
// AUTHORIZATION != SUCCESS
// VERIFICATION != COMMIT
// FAILURE != BRAIN_DEATH
// USER_STOP > AUTONOMOUS_EXECUTION

import type { AuthorizationToken } from '../world-action/worldActionTypes.js';

export type SupervisorRuntimeState =
  | 'INITIALIZING'
  | 'OBSERVING'
  | 'HEALTHY'
  | 'ANOMALY_DETECTED'
  | 'DIAGNOSING'
  | 'RECOVERY_PLANNING'
  | 'POLICY_EVALUATION'
  | 'WAITING_FOR_HUMAN'
  | 'AUTHORIZED'
  | 'RECOVERING'
  | 'VERIFYING'
  | 'RECOVERY_SUCCEEDED'
  | 'RECOVERY_FAILED'
  | 'ESCALATED'
  | 'SAFE_STOP'
  | 'STOPPED';

export type AnomalySeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SupervisorAnomalyType =
  | 'PROCESS_UNEXPECTED_EXIT'
  | 'CAPABILITY_DEGRADED'
  | 'CAPABILITY_UNAVAILABLE'
  | 'COGNITIVE_PROVIDER_UNAVAILABLE'
  | 'COGNITIVE_CIRCUIT_BREAKER_OPEN'
  | 'WORLDACTION_EXECUTION_FAILURE'
  | 'WORLDACTION_VERIFICATION_FAILURE'
  | 'RESOURCE_LOCK_STUCK'
  | 'HOST_RESOURCE_EXHAUSTION'
  | 'BRAIN_STATE_INCONSISTENT'
  | 'UNKNOWN_ANOMALY';

export interface Anomaly {
  readonly anomalyId: string;
  readonly sessionId: string;
  readonly deviceId: string;
  readonly timestamp: number;
  readonly source: string;
  readonly type: SupervisorAnomalyType;
  readonly severity: AnomalySeverity;
  readonly observedState: any;
  readonly expectedState: any;
  readonly evidence: string;
  readonly confidence: number;
}

export type RecoveryClass =
  | 'AUTO_SAFE'
  | 'AUTO_REVERSIBLE'
  | 'HUMAN_REQUIRED'
  | 'CRITICAL_BLOCKED'
  | 'UNRECOVERABLE';

export interface Diagnosis {
  readonly diagnosisId: string;
  readonly anomalyId: string;
  readonly timestamp: number;
  readonly probableCause: string;
  readonly evidence: string[];
  readonly affectedCapability?: string;
  readonly affectedResource?: string;
  readonly severity: AnomalySeverity;
  readonly isInconclusive: boolean;
  readonly recoverability: RecoveryClass;
  readonly recommendedRecovery: string;
  readonly requiresHumanApproval: boolean;
}

export interface RecoveryStep {
  readonly stepIndex: number;
  readonly description: string;
  readonly capabilityId?: string;
  readonly target?: string;
  readonly parameters: Record<string, any>;
  readonly isReversible: boolean;
  readonly rollbackStep?: {
    readonly capabilityId?: string;
    readonly target?: string;
    readonly parameters: Record<string, any>;
  };
}

export interface RecoveryPlan {
  readonly planId: string;
  readonly diagnosisId: string;
  readonly anomalyId: string;
  readonly recoveryClass: RecoveryClass;
  readonly steps: RecoveryStep[];
  readonly requiresHumanApproval: boolean;
  readonly riskLevel: string;
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly createdTimestamp: number;
}

export interface HumanGateRequest {
  readonly requestId: string;
  readonly anomalyId: string;
  readonly diagnosis: Diagnosis;
  readonly proposedRecovery: RecoveryPlan;
  readonly riskLevel: string;
  readonly target?: string;
  readonly affectedResources: string[];
  readonly expectedEffects: string[];
  readonly rollbackPlan?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'CANCELLED_SAFE_STOP';
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly authorizationContext?: {
    readonly actionId: string;
    readonly sessionId: string;
    readonly goalId?: string;
    readonly taskId?: string;
    readonly deviceId: string;
    readonly capabilityId: string;
    readonly parameters: Record<string, any>;
    readonly target: string;
  };
  authorizationToken?: AuthorizationToken;
}

export interface RecoveryAttempt {
  readonly attemptIndex: number;
  readonly startedAt: number;
  completedAt?: number;
  status: 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'ROLLED_BACK' | 'ESCALATED';
  error?: string;
  verificationPassed?: boolean;
}

export interface EscalationRecord {
  readonly escalationId: string;
  readonly anomalyId: string;
  readonly diagnosisId: string;
  readonly planId: string;
  readonly reason: string;
  readonly attemptsCount: number;
  readonly escalatedAt: number;
  readonly severity: AnomalySeverity;
}

export interface ObservationSnapshot {
  readonly timestamp: number;
  readonly process: {
    readonly pid: number;
    readonly memoryRssMb: number;
    readonly uptime: number;
    readonly state: string;
  };
  readonly host: {
    readonly platform: string;
    readonly arch: string;
    readonly cores: number;
    readonly freeMemMb: number;
    readonly online: boolean;
  };
  readonly capabilities: {
    readonly total: number;
    readonly available: number;
    readonly degraded: number;
    readonly unavailable: number;
  };
  readonly cognitive: {
    readonly providerType: string;
    readonly isAvailable: boolean;
    readonly isFallbackActive: boolean;
  };
  readonly worldAction: {
    readonly pendingCount: number;
    readonly failedCount: number;
    readonly isSafeStop: boolean;
  };
}

export interface SupervisorHealth {
  readonly state: SupervisorRuntimeState;
  readonly isSafeStopActive: boolean;
  readonly activeAnomaliesCount: number;
  readonly pendingHumanGatesCount: number;
  readonly totalRecoveriesAttempted: number;
  readonly totalRecoveriesSucceeded: number;
  readonly totalRecoveriesFailed: number;
  readonly totalEscalations: number;
  readonly uptimeSeconds: number;
}
