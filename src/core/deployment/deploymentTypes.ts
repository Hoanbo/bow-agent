// src/core/deployment/deploymentTypes.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Canonical TypeScript contracts, branded identifiers, and fail-closed state machines for governed production deployment.
// Các hợp đồng TypeScript chuẩn tắc, định danh thương hiệu và máy trạng thái đóng khi thất bại cho việc triển khai sản xuất có quản trị.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - AUTOMATION != OWNER_WILL
// - DEPLOYMENT != OWNER_APPROVAL
// - CANARY_PASS != RELEASE_APPROVAL
// - CANARY_PASS != DEPLOYMENT_AUTHORIZATION
// - DEPLOYMENT_VERIFICATION != OWNER_APPROVAL
// - SLO_HEALTH != AUTHORITY
// - MONITORING_RESULT != AUTHORIZATION
// - ROLLBACK != OWNER_AUTHORITY
// - AGENT_COUNT != AUTHORITY_COUNT
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

// ---------------------------------------------------------------------------
// 1. BRANDED IDENTIFIERS / ĐỊNH DANH THƯƠNG HIỆU
// ---------------------------------------------------------------------------

export type DeploymentId = string & { readonly __brand: unique symbol };
export type DeploymentCandidateId = string & { readonly __brand: unique symbol };
export type RolloutRingId = string & { readonly __brand: unique symbol };
export type CanaryVerificationId = string & { readonly __brand: unique symbol };
export type DeploymentEvidenceId = string & { readonly __brand: unique symbol };
export type DeploymentReportId = string & { readonly __brand: unique symbol };
export type CircuitBreakerEventId = string & { readonly __brand: unique symbol };

export function createDeploymentId(raw: string): DeploymentId {
  return raw as DeploymentId;
}

export function createDeploymentCandidateId(raw: string): DeploymentCandidateId {
  return raw as DeploymentCandidateId;
}

export function createRolloutRingId(raw: string): RolloutRingId {
  return raw as RolloutRingId;
}

export function createCanaryVerificationId(raw: string): CanaryVerificationId {
  return raw as CanaryVerificationId;
}

export function createDeploymentEvidenceId(raw: string): DeploymentEvidenceId {
  return raw as DeploymentEvidenceId;
}

export function createDeploymentReportId(raw: string): DeploymentReportId {
  return raw as DeploymentReportId;
}

export function createCircuitBreakerEventId(raw: string): CircuitBreakerEventId {
  return raw as CircuitBreakerEventId;
}

// ---------------------------------------------------------------------------
// 2. LIFECYCLE STATES / CÁC TRẠNG THÁI VÒNG ĐỜI
// ---------------------------------------------------------------------------

export type DeploymentState =
  | 'REQUESTED'
  | 'VALIDATING'
  | 'READY_FOR_OWNER'
  | 'OWNER_APPROVAL_PENDING'
  | 'AUTHORIZED'
  | 'CANARY_PENDING'
  | 'CANARY_RUNNING'
  | 'CANARY_PASSED'
  | 'CANARY_FAILED'
  | 'ROLLOUT_PAUSED'
  | 'ROLLOUT_CONTINUING'
  | 'ROLLING_BACK'
  | 'ROLLED_BACK'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'CONFLICTED'
  | 'INVALID'
  | 'FAILED';

export const TERMINAL_DEPLOYMENT_STATES: readonly DeploymentState[] = [
  'COMPLETED',
  'ROLLED_BACK',
  'BLOCKED',
  'REVOKED',
  'EXPIRED',
  'CANCELLED',
  'CONFLICTED',
  'INVALID',
  'FAILED',
] as const;

export function isTerminalDeploymentState(state: DeploymentState): boolean {
  return TERMINAL_DEPLOYMENT_STATES.includes(state);
}

// ---------------------------------------------------------------------------
// 3. ROLLOUT RINGS / CÁC VÒNG TRIỂN KHAI
// ---------------------------------------------------------------------------

export type RolloutRingLevel =
  | 'RING_0' // Preflight & in-sandbox validation / Tiền kiểm và xác thực trong sandbox
  | 'RING_1' // Canary release (1-5% traffic / localized node) / Triển khai canary
  | 'RING_2' // Limited rollout (10-25% traffic) / Triển khai giới hạn
  | 'RING_3' // Broader rollout (50-75% traffic) / Triển khai rộng hơn
  | 'RING_4'; // Full production rollout (100% traffic) / Triển khai sản xuất toàn phần

export const ROLLOUT_RING_ORDER: readonly RolloutRingLevel[] = [
  'RING_0',
  'RING_1',
  'RING_2',
  'RING_3',
  'RING_4',
] as const;

export interface RolloutRingDefinition {
  readonly ringLevel: RolloutRingLevel;
  readonly name: string;
  readonly trafficPercentage: number;
  readonly requiresCanaryPass: boolean;
  readonly minObservationDurationMs: number;
  readonly requiresOwnerSignoff: boolean;
}

// ---------------------------------------------------------------------------
// 4. CANARY & METRICS OBSERVATIONS / QUAN SÁT CANARY VÀ CHỈ SỐ
// ---------------------------------------------------------------------------

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';

export interface CanaryMetricObservation {
  readonly timestamp: number;
  readonly errorRate: number; // Decimal: 0.00 to 1.00 (e.g. 0.01 = 1%)
  readonly latencyP95Ms: number; // Milliseconds
  readonly latencyP99Ms: number; // Milliseconds
  readonly availability: number; // Decimal: 0.00 to 1.00 (e.g. 0.999 = 99.9%)
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

// ---------------------------------------------------------------------------
// 5. SLO POLICY CONTRACTS / HỢP ĐỒNG CHÍNH SÁCH SLO
// ---------------------------------------------------------------------------

export interface SloPolicyConfig {
  readonly policyId: string;
  readonly name: string;
  readonly maxErrorRate: number; // e.g. 0.01 (1%)
  readonly maxLatencyP95Ms: number; // e.g. 350ms
  readonly maxLatencyP99Ms: number; // e.g. 800ms
  readonly minAvailability: number; // e.g. 0.999 (99.9%)
  readonly maxConsecutiveDegradations: number; // e.g. 3
  readonly maxHealthCheckFailures: number; // e.g. 2
  readonly minObservationWindowMs: number; // e.g. 30_000ms
  readonly minSampleCount: number; // e.g. 50 samples
}

export interface SloEvaluationResult {
  readonly isPassing: boolean;
  readonly violations: readonly string[];
  readonly consecutiveDegradations: number;
  readonly shouldTripCircuitBreaker: boolean;
  readonly evaluatedAt: number;
}

// ---------------------------------------------------------------------------
// 6. CIRCUIT BREAKER CONTRACTS / HỢP ĐỒNG BỘ NGẮT MẠCH
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 7. DEPLOYMENT TARGET & CANDIDATE / MỤC TIÊU VÀ ỨNG VIÊN TRIỂN KHAI
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 8. DEPLOYMENT REQUEST & APPROVAL / YÊU CẦU VÀ PHÊ DUYỆT TRIỂN KHAI
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 9. ROLLBACK CONTRACTS / HỢP ĐỒNG HOÀN NGUYÊN
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 10. CONTRADICTION CONTRACTS / HỢP ĐỒNG MÂU THUẪN
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 11. DEPLOYMENT REPORT & RESULT / BÁO CÁO VÀ KẾT QUẢ TRIỂN KHAI
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 12. ERROR TAXONOMY / PHÂN LOẠI LỖI
// ---------------------------------------------------------------------------

export type DeploymentErrorCode =
  | 'UNAUTHORIZED_TARGET'
  | 'PATH_TRAVERSAL_DETECTED'
  | 'PROTECTED_WORKSPACE_VIOLATION'
  | 'UNAUTHORIZED_RING_TRANSITION'
  | 'CANARY_VERIFICATION_FAILED'
  | 'SLO_DEGRADATION_DETECTED'
  | 'CIRCUIT_BREAKER_TRIGGERED'
  | 'SELF_APPROVAL_REJECTED'
  | 'TOKEN_REPLAY_REJECTED'
  | 'INVALID_AUTHORIZATION'
  | 'EXPIRED_AUTHORIZATION'
  | 'REVOCATION_ACTIVE'
  | 'USER_STOP_ACTIVE'
  | 'STALE_CANDIDATE'
  | 'CONTRADICTION_DETECTED'
  | 'MAJORITY_VOTING_FORBIDDEN'
  | 'ROLLBACK_VERIFICATION_FAILED'
  | 'MUTATION_FAILED'
  | 'PREFLIGHT_FAILED'
  | 'INVALID_STATE_TRANSITION';

export class DeploymentError extends Error {
  public readonly code: DeploymentErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: DeploymentErrorCode, message: string, details?: Record<string, unknown>) {
    super(`[${code}] ${message}`);
    this.name = 'DeploymentError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, DeploymentError.prototype);
  }
}
