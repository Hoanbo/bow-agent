export type DeploymentId = string & {
    readonly __brand: unique symbol;
};
export type DeploymentCandidateId = string & {
    readonly __brand: unique symbol;
};
export type RolloutRingId = string & {
    readonly __brand: unique symbol;
};
export type CanaryVerificationId = string & {
    readonly __brand: unique symbol;
};
export type DeploymentEvidenceId = string & {
    readonly __brand: unique symbol;
};
export type DeploymentReportId = string & {
    readonly __brand: unique symbol;
};
export type CircuitBreakerEventId = string & {
    readonly __brand: unique symbol;
};
export declare function createDeploymentId(raw: string): DeploymentId;
export declare function createDeploymentCandidateId(raw: string): DeploymentCandidateId;
export declare function createRolloutRingId(raw: string): RolloutRingId;
export declare function createCanaryVerificationId(raw: string): CanaryVerificationId;
export declare function createDeploymentEvidenceId(raw: string): DeploymentEvidenceId;
export declare function createDeploymentReportId(raw: string): DeploymentReportId;
export declare function createCircuitBreakerEventId(raw: string): CircuitBreakerEventId;
export type DeploymentState = 'REQUESTED' | 'VALIDATING' | 'READY_FOR_OWNER' | 'OWNER_APPROVAL_PENDING' | 'AUTHORIZED' | 'CANARY_PENDING' | 'CANARY_RUNNING' | 'CANARY_PASSED' | 'CANARY_FAILED' | 'ROLLOUT_PAUSED' | 'ROLLOUT_CONTINUING' | 'ROLLING_BACK' | 'ROLLED_BACK' | 'COMPLETED' | 'BLOCKED' | 'REVOKED' | 'EXPIRED' | 'CANCELLED' | 'CONFLICTED' | 'INVALID' | 'FAILED';
export declare const TERMINAL_DEPLOYMENT_STATES: readonly DeploymentState[];
export declare function isTerminalDeploymentState(state: DeploymentState): boolean;
export type RolloutRingLevel = 'RING_0' | 'RING_1' | 'RING_2' | 'RING_3' | 'RING_4';
export declare const ROLLOUT_RING_ORDER: readonly RolloutRingLevel[];
export interface RolloutRingDefinition {
    readonly ringLevel: RolloutRingLevel;
    readonly name: string;
    readonly trafficPercentage: number;
    readonly requiresCanaryPass: boolean;
    readonly minObservationDurationMs: number;
    readonly requiresOwnerSignoff: boolean;
}
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
export interface CanaryMetricObservation {
    readonly timestamp: number;
    readonly errorRate: number;
    readonly latencyP95Ms: number;
    readonly latencyP99Ms: number;
    readonly availability: number;
    readonly sampleCount: number;
    readonly healthCheckFailures: number;
    readonly status: HealthStatus;
}
export interface CanaryObservationWindow {
    readonly windowId: string;
    readonly startTime: number;
    readonly endTime: number;
    readonly observations: readonly CanaryMetricObservation[];
    readonly aggregateErrorRate: number;
    readonly aggregateLatencyP95Ms: number;
    readonly aggregateAvailability: number;
    readonly totalSamples: number;
    readonly consecutiveDegradationCount: number;
}
export interface CanaryVerificationRecord {
    readonly verificationId: CanaryVerificationId;
    readonly deploymentId: DeploymentId;
    readonly ringLevel: RolloutRingLevel;
    readonly window: CanaryObservationWindow;
    readonly isPassing: boolean;
    readonly failureReasons: readonly string[];
    readonly verifiedAt: number;
    readonly evidenceHash: string;
}
export interface SloPolicyConfig {
    readonly policyId: string;
    readonly name: string;
    readonly maxErrorRate: number;
    readonly maxLatencyP95Ms: number;
    readonly maxLatencyP99Ms: number;
    readonly minAvailability: number;
    readonly maxConsecutiveDegradations: number;
    readonly maxHealthCheckFailures: number;
    readonly minObservationWindowMs: number;
    readonly minSampleCount: number;
}
export interface SloEvaluationResult {
    readonly isPassing: boolean;
    readonly violations: readonly string[];
    readonly consecutiveDegradations: number;
    readonly shouldTripCircuitBreaker: boolean;
    readonly evaluatedAt: number;
}
export type DeploymentCircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export interface CircuitBreakerEvent {
    readonly eventId: CircuitBreakerEventId;
    readonly deploymentId: DeploymentId;
    readonly priorState: DeploymentCircuitBreakerState;
    readonly newState: DeploymentCircuitBreakerState;
    readonly reason: string;
    readonly triggeredBy: 'SLO_VIOLATION' | 'USER_STOP' | 'REVOCATION' | 'MANUAL_INTERLOCK';
    readonly timestamp: number;
    readonly details?: Record<string, unknown>;
}
export interface DeploymentTarget {
    readonly targetId: string;
    readonly environment: 'STAGING' | 'CANARY' | 'PRODUCTION';
    readonly rootDirectory: string;
    readonly allowedRelativePaths: readonly string[];
    readonly forbiddenPatterns: readonly string[];
}
export interface DeploymentCandidate {
    readonly candidateId: DeploymentCandidateId;
    readonly releaseExecutionId: string;
    readonly candidateFingerprint: string;
    readonly version: string;
    readonly artifactsDirectory: string;
    readonly expectedArtifacts: readonly string[];
    readonly target: DeploymentTarget;
    readonly createdAt: number;
    readonly expiresAt: number;
}
export interface DeploymentRequest {
    readonly deploymentId: DeploymentId;
    readonly candidateId: DeploymentCandidateId;
    readonly releaseExecutionId: string;
    readonly targetId: string;
    readonly operatorId: string;
    readonly sessionId: string;
    readonly taskId: string;
    readonly delegationId: string;
    readonly capabilityLeaseId: string;
    readonly initialRing: RolloutRingLevel;
    readonly targetRing: RolloutRingLevel;
    readonly sloPolicy: SloPolicyConfig;
    readonly requestedAt: number;
}
export interface DeploymentApprovalBinding {
    readonly deploymentId: DeploymentId;
    readonly reviewerId: string;
    readonly reviewerType: 'SUPERVISOR' | 'MASTER_OWNER';
    readonly isOwnerApproval: boolean;
    readonly decision: 'APPROVED' | 'REJECTED';
    readonly reviewedAt: number;
    readonly rationale: string;
}
export interface DeploymentAuthorizationBinding {
    readonly deploymentId: DeploymentId;
    readonly tokenId: string;
    readonly tokenHash: string;
    readonly authorizedAt: number;
    readonly expiresAt: number;
    readonly targetRing: RolloutRingLevel;
}
export interface DeploymentBackupEntry {
    readonly relativePath: string;
    readonly backupPath: string;
    readonly sha256: string;
}
export interface DeploymentRollbackRecord {
    readonly rollbackId: string;
    readonly deploymentId: DeploymentId;
    readonly restoredFiles: readonly string[];
    readonly unlinkedFiles: readonly string[];
    readonly preRollbackManifestHash: string;
    readonly postRollbackManifestHash: string;
    readonly isVerified: boolean;
    readonly executedAt: number;
    readonly reason: string;
}
export interface DeploymentAgentAssertion {
    readonly agentId: string;
    readonly taskId: string;
    readonly ringLevel: RolloutRingLevel;
    readonly reportedStatus: 'PASS' | 'FAIL' | 'DEGRADED';
    readonly reportedHealthScore: number;
    readonly evidenceHash: string;
    readonly timestamp: number;
    readonly details: Record<string, unknown>;
}
export interface DeploymentContradictionRecord {
    readonly contradictionId: string;
    readonly deploymentId: DeploymentId;
    readonly ringLevel: RolloutRingLevel;
    readonly assertions: readonly DeploymentAgentAssertion[];
    readonly conflictingFields: readonly string[];
    readonly detectedAt: number;
    readonly escalatedToHumanGate: boolean;
}
export interface DeploymentVerificationReport {
    readonly reportId: DeploymentReportId;
    readonly deploymentId: DeploymentId;
    readonly candidateId: DeploymentCandidateId;
    readonly releaseExecutionId: string;
    readonly targetEnvironment: string;
    readonly highestRingReached: RolloutRingLevel;
    readonly finalState: DeploymentState;
    readonly isSuccessful: boolean;
    readonly canaryVerifications: readonly CanaryVerificationRecord[];
    readonly circuitBreakerEvents: readonly CircuitBreakerEvent[];
    readonly rollbackRecord?: DeploymentRollbackRecord;
    readonly contradictionRecord?: DeploymentContradictionRecord;
    readonly provenanceHash: string;
    readonly reportHash: string;
    readonly generatedAt: number;
}
export interface DeploymentResult {
    readonly deploymentId: DeploymentId;
    readonly state: DeploymentState;
    readonly highestRingReached: RolloutRingLevel;
    readonly isSuccess: boolean;
    readonly report: DeploymentVerificationReport;
    readonly completedAt: number;
    readonly failureReason?: string;
}
export type DeploymentErrorCode = 'UNAUTHORIZED_TARGET' | 'PATH_TRAVERSAL_DETECTED' | 'PROTECTED_WORKSPACE_VIOLATION' | 'UNAUTHORIZED_RING_TRANSITION' | 'CANARY_VERIFICATION_FAILED' | 'SLO_DEGRADATION_DETECTED' | 'CIRCUIT_BREAKER_TRIGGERED' | 'SELF_APPROVAL_REJECTED' | 'TOKEN_REPLAY_REJECTED' | 'INVALID_AUTHORIZATION' | 'EXPIRED_AUTHORIZATION' | 'REVOCATION_ACTIVE' | 'USER_STOP_ACTIVE' | 'STALE_CANDIDATE' | 'CONTRADICTION_DETECTED' | 'MAJORITY_VOTING_FORBIDDEN' | 'ROLLBACK_VERIFICATION_FAILED' | 'MUTATION_FAILED' | 'PREFLIGHT_FAILED' | 'INVALID_STATE_TRANSITION';
export declare class DeploymentError extends Error {
    readonly code: DeploymentErrorCode;
    readonly details?: Record<string, unknown>;
    constructor(code: DeploymentErrorCode, message: string, details?: Record<string, unknown>);
}
