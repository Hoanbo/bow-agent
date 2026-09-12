import { type PolicyCandidateId, type PolicyRing, type PolicyCandidatePackage, type PolicyRingAssignment, type CanaryHealthReport, type PromotionRequest, type PromotionResult, type RollbackResult, type PolicyCanaryFailureReason, type ShadowEvaluationRecord } from './policyCanaryTypes.js';
import { PolicyRingRouter, type PolicyRoutingDecision } from './policyRingRouter.js';
import { PolicyShadowEvaluator, type ShadowEvaluationInput } from './policyShadowEvaluator.js';
import { PolicyCanaryTelemetryAggregator } from './policyCanaryTelemetryAggregator.js';
import { PolicyCanaryHealthMonitor } from './policyCanaryHealthMonitor.js';
import { PolicyCanaryCircuitBreaker } from './policyCanaryCircuitBreaker.js';
import { PolicyRingPromotionEngine } from './policyRingPromotionEngine.js';
import { PolicyCanaryRollbackEngine } from './policyCanaryRollbackEngine.js';
import { PolicyCanaryProvenanceEngine } from './policyCanaryProvenanceEngine.js';
import { PolicyCanaryRecoveryEngine } from './policyCanaryRecoveryEngine.js';
import { PolicyCanaryFaultInjector } from './policyCanaryFaultInjector.js';
import { type CanaryRecoveryResult } from './policyCanaryResilienceTypes.js';
import { PolicyHotSwapEngine } from '../policyEnforcement/policyHotSwapEngine.js';
import { FailClosedBaselineFallback } from '../policyEnforcement/failClosedBaselineFallback.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { PolicyConfiguration } from '../policyEvolution/policyEvolutionTypes.js';
export interface PolicyCanaryRuntimeOptions {
    readonly baseDir?: string;
    readonly router?: PolicyRingRouter;
    readonly shadowEvaluator?: PolicyShadowEvaluator;
    readonly telemetryAggregator?: PolicyCanaryTelemetryAggregator;
    readonly healthMonitor?: PolicyCanaryHealthMonitor;
    readonly circuitBreaker?: PolicyCanaryCircuitBreaker;
    readonly promotionEngine?: PolicyRingPromotionEngine;
    readonly rollbackEngine?: PolicyCanaryRollbackEngine;
    readonly provenanceEngine?: PolicyCanaryProvenanceEngine;
    readonly recoveryEngine?: PolicyCanaryRecoveryEngine;
    readonly faultInjector?: PolicyCanaryFaultInjector;
    readonly hotSwapEngine?: PolicyHotSwapEngine;
    readonly fallbackProvider?: FailClosedBaselineFallback;
    readonly sanitizer?: DiagnosisSanitizer;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyCanaryRuntime {
    private readonly baseDir;
    private readonly router;
    private readonly shadowEvaluator;
    private readonly telemetryAggregator;
    private readonly healthMonitor;
    private readonly circuitBreaker;
    private readonly promotionEngine;
    private readonly rollbackEngine;
    private readonly provenanceEngine;
    private readonly recoveryEngine;
    private readonly faultInjector;
    private readonly hotSwapEngine;
    private readonly fallbackProvider;
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    private readonly stores;
    private readonly candidatePackages;
    constructor(options?: PolicyCanaryRuntimeOptions);
    /**
     * Resolves or creates a DurableJsonStore for a tenant partition.
     * Giải quyết hoặc tạo DurableJsonStore cho một phân vùng người thuê.
     */
    private getStoreForTenant;
    /**
     * Stages a candidate package into memory and durable tenant storage.
     * Đưa một gói ứng viên vào bộ nhớ và lưu trữ bền vững của người thuê.
     */
    stageCandidate(candidate: PolicyCandidatePackage, userId?: string): void;
    /**
     * Assigns a tenant partition to a candidate and ring.
     * Gán một phân vùng người thuê vào một ứng viên và vòng.
     */
    assignTenantRing(input: {
        readonly candidateId: PolicyCandidateId;
        readonly userId: string;
        readonly ring: PolicyRing;
        readonly assignedBy: string;
        readonly authorizationTokenId: string;
    }): PolicyRingAssignment;
    /**
     * Primary route evaluation for live requests.
     * Resolves whether candidate policy or active policy should be used, and provides shadow config if Ring 0.
     *
     * Đánh giá định tuyến chính cho các yêu cầu trực tiếp.
     */
    evaluateExecutionRoute(userId: string, activePolicyConfig: PolicyConfiguration, toolName?: string): PolicyRoutingDecision;
    /**
     * Executes Ring 0 shadow evaluation against candidate policy.
     * STRICT INVARIANT: Never executes tool, never issues tokens, never causes side effects.
     * Fault Isolation: Uncaught exceptions during shadow evaluation NEVER crash active tool execution.
     *
     * Thực thi đánh giá bóng Vòng 0 đối với chính sách ứng viên.
     * CÔ LẬP LỖI: Ngoại lệ không được bắt trong đánh giá bóng KHÔNG BAO GIỜ làm sập việc thực thi công cụ hoạt động.
     */
    executeShadowEvaluation(input: ShadowEvaluationInput, candidateId: PolicyCandidateId): ShadowEvaluationRecord;
    /**
     * Evaluates candidate health via PolicyCanaryHealthMonitor.
     * Returns advisory report.
     *
     * Đánh giá sức khỏe ứng viên qua PolicyCanaryHealthMonitor.
     */
    evaluateCandidateHealth(candidateId: PolicyCandidateId, tenantPartition: string): CanaryHealthReport;
    /**
     * Promotes candidate to the next ring with human authorization token.
     * Thăng hạng ứng viên lên vòng tiếp theo với mã ủy quyền của con người.
     */
    promoteCandidate(candidateId: PolicyCandidateId, request: PromotionRequest): PromotionResult;
    /**
     * Rolls back a tenant from canary candidate back to active baseline.
     * Hoàn nguyên một người thuê từ ứng viên canary về đường cơ sở hoạt động.
     */
    rollbackTenant(input: {
        readonly tenantPartition: string;
        readonly candidateId: PolicyCandidateId;
        readonly reason: PolicyCanaryFailureReason;
        readonly details?: string;
        readonly operatorUserId?: string;
    }): RollbackResult;
    /**
     * Helper returning registered candidate package.
     * Hàm trợ giúp trả về gói ứng viên đã đăng ký.
     */
    getCandidate(candidateId: string): PolicyCandidatePackage | undefined;
    /**
     * Helper returning the router instance.
     * Hàm trợ giúp trả về thể hiện bộ định tuyến.
     */
    getRouter(): PolicyRingRouter;
    /**
     * Helper returning the circuit breaker instance.
     * Hàm trợ giúp trả về thể hiện bộ ngắt mạch.
     */
    getCircuitBreaker(): PolicyCanaryCircuitBreaker;
    /**
     * Helper returning the provenance engine instance.
     * Hàm trợ giúp trả về thể hiện động cơ nguồn gốc.
     */
    getProvenanceEngine(): PolicyCanaryProvenanceEngine;
    /**
     * Helper returning the telemetry aggregator instance.
     * Hàm trợ giúp trả về thể hiện bộ tổng hợp đo lường.
     */
    getTelemetryAggregator(): PolicyCanaryTelemetryAggregator;
    /**
     * Helper returning the recovery engine instance.
     * Hàm trợ giúp trả về thể hiện động cơ phục hồi.
     */
    getRecoveryEngine(): PolicyCanaryRecoveryEngine;
    /**
     * Helper returning the fault injector instance.
     * Hàm trợ giúp trả về thể hiện bộ tiêm lỗi.
     */
    getFaultInjector(): PolicyCanaryFaultInjector;
    /**
     * Performs crash recovery reconciliation for a tenant partition from durable storage.
     * Restores verified candidate packages into runtime memory and synchs router assignments.
     *
     * Thực hiện đối soát phục hồi sau sự cố cho phân vùng người thuê từ lưu trữ bền vững.
     * Khôi phục các gói ứng viên đã kiểm chứng vào bộ nhớ thời gian chạy và đồng bộ phân bổ của bộ định tuyến.
     */
    reconcileFromDurableStore(userId?: string): CanaryRecoveryResult;
    /**
     * Clears in-memory runtime caches (used in testing).
     * Xóa bộ nhớ cache thời gian chạy trong bộ nhớ (dùng trong kiểm thử).
     */
    clear(): void;
}
export declare const globalPolicyCanaryRuntime: PolicyCanaryRuntime;
