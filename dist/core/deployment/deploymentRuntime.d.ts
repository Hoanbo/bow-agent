import { type DeploymentId, type DeploymentState, type RolloutRingLevel, type DeploymentRequest, type DeploymentCandidate, type DeploymentApprovalBinding, type DeploymentAuthorizationBinding, type CanaryMetricObservation, type CanaryVerificationRecord, type DeploymentRollbackRecord, type DeploymentContradictionRecord, type DeploymentAgentAssertion, type DeploymentResult } from './deploymentTypes.js';
import { DeploymentPolicyEngine } from './deploymentPolicyEngine.js';
import { DeploymentRingEngine } from './deploymentRingEngine.js';
import { CanaryVerificationEngine } from './canaryVerificationEngine.js';
import { SloPolicyEngine } from './sloPolicyEngine.js';
import { DeploymentCircuitBreaker } from './deploymentCircuitBreaker.js';
import { DeploymentExecutionEngine } from './deploymentExecutionEngine.js';
import { DeploymentRollbackEngine } from './deploymentRollbackEngine.js';
import { DeploymentProvenanceEngine } from './deploymentProvenanceEngine.js';
import { DeploymentContradictionEngine } from './deploymentContradictionEngine.js';
import { DeploymentReportEngine } from './deploymentReportEngine.js';
import { AuditLedger } from '../auditLedger.js';
import { SupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import type { HumanGateRequest } from '../supervisor/supervisorTypes.js';
export interface ExecuteRolloutOptions {
    readonly targetRing: RolloutRingLevel;
    readonly backupDir: string;
}
export declare class DeploymentRuntime {
    private readonly policyEngine;
    private readonly ringEngine;
    private readonly canaryEngine;
    private readonly sloEngine;
    private readonly circuitBreaker;
    private readonly executionEngine;
    private readonly rollbackEngine;
    private readonly provenanceEngine;
    private readonly contradictionEngine;
    private readonly reportEngine;
    private readonly humanGate;
    private readonly auditLedger;
    private requests;
    private candidates;
    private states;
    private approvals;
    private authorizations;
    private activeTokens;
    private highestRings;
    private canaryRecords;
    private backups;
    private preManifestHashes;
    private postManifestHashes;
    private deployedFiles;
    private rollbackRecords;
    private contradictionRecords;
    private isUserStopActive;
    private isRevoked;
    constructor(policyEngine?: DeploymentPolicyEngine, ringEngine?: DeploymentRingEngine, canaryEngine?: CanaryVerificationEngine, sloEngine?: SloPolicyEngine, circuitBreaker?: DeploymentCircuitBreaker, executionEngine?: DeploymentExecutionEngine, rollbackEngine?: DeploymentRollbackEngine, provenanceEngine?: DeploymentProvenanceEngine, contradictionEngine?: DeploymentContradictionEngine, reportEngine?: DeploymentReportEngine, humanGate?: SupervisorHumanGate, auditLedger?: AuditLedger);
    /**
     * Helper to append an immutable event to the canonical AuditLedger.
     * Trợ giúp ghi sự kiện bất biến vào AuditLedger chuẩn tắc.
     */
    private logAudit;
    triggerUserStop(reason: string): void;
    clearUserStop(): void;
    triggerRevocation(reason: string): void;
    getState(deploymentId: DeploymentId): DeploymentState;
    /**
     * 1. Submits and validates a new deployment request.
     * 1. Gửi và xác thực một yêu cầu triển khai mới.
     */
    requestDeployment(request: DeploymentRequest, candidate: DeploymentCandidate): {
        readonly deploymentId: DeploymentId;
        readonly state: DeploymentState;
    };
    /**
     * 2. Dispatches supervisory human gate review request.
     * 2. Gửi yêu cầu xem xét cổng con người giám sát.
     */
    requestHumanReview(deploymentId: DeploymentId): HumanGateRequest;
    /**
     * 3. Records human owner review decision.
     * 3. Ghi nhận quyết định xem xét của chủ sở hữu con người.
     */
    recordOwnerReview(options: {
        readonly deploymentId: DeploymentId;
        readonly reviewerId: string;
        readonly reviewerType: 'SUPERVISOR' | 'MASTER_OWNER';
        readonly decision: 'APPROVED' | 'REJECTED';
        readonly rationale: string;
    }): DeploymentApprovalBinding;
    /**
     * 4. Binds single-use WorldActionAuthorization token.
     * 4. Ràng buộc mã ủy quyền WorldActionAuthorization sử dụng một lần.
     */
    bindAuthorizationToken(deploymentId: DeploymentId, token: AuthorizationToken, targetRing: RolloutRingLevel): DeploymentAuthorizationBinding;
    /**
     * 5. Executes governed rollout mutation for a specified ring.
     * 5. Thực thi thay đổi triển khai có quản trị cho một vòng được chỉ định.
     */
    executeRollout(deploymentId: DeploymentId, options: ExecuteRolloutOptions): void;
    /**
     * 6. Records canary observations, evaluates SLO, and trips circuit breaker if degraded.
     * 6. Ghi nhận quan sát canary, đánh giá SLO và ngắt mạch nếu suy giảm.
     */
    recordCanaryObservations(deploymentId: DeploymentId, ringLevel: RolloutRingLevel, observations: readonly CanaryMetricObservation[], autoRollbackOnFailure?: boolean): CanaryVerificationRecord;
    /**
     * 7. Executes governed rollback.
     * 7. Thực thi hoàn nguyên có quản trị.
     */
    executeSafeRollback(deploymentId: DeploymentId, reason: string): DeploymentRollbackRecord;
    /**
     * 8. Detects and escalates multi-agent contradictions.
     * 8. Phát hiện và leo thang các mâu thuẫn đa tác nhân.
     */
    reportAgentAssertions(deploymentId: DeploymentId, ringLevel: RolloutRingLevel, assertions: readonly DeploymentAgentAssertion[]): DeploymentContradictionRecord | null;
    /**
     * 9. Finalizes deployment and produces deterministic DeploymentResult and Report.
     * 9. Hoàn tất triển khai và tạo ra DeploymentResult và Báo cáo xác định.
     */
    finalizeDeployment(deploymentId: DeploymentId): DeploymentResult;
}
