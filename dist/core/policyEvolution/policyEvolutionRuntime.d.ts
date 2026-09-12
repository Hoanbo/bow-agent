import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type PolicyEvolutionProposal, type CounterfactualSimulationResult, type GuardrailCalibrationResult, type PolicyReviewRecord, type PolicyRolloutRecord, type PolicyRollbackRecord, type PolicyEvolutionProvenanceRecord, type PolicyConfiguration, type PolicySnapshot } from './policyEvolutionTypes.js';
import { PolicySnapshotStore } from './policySnapshotStore.js';
import { PolicyRefinementSynthesizer, type SynthesizeProposalInput } from './policyRefinementSynthesizer.js';
import { CounterfactualSimulationEngine } from './counterfactualSimulationEngine.js';
import { GuardrailCalibrationEngine } from './guardrailCalibrationEngine.js';
import { PolicyEvolutionReviewBridge, type StagedReviewPackage } from './policyEvolutionReviewBridge.js';
import { GovernedPolicyRolloutEngine } from './governedPolicyRolloutEngine.js';
import { PolicyEvolutionRollbackEngine } from './policyEvolutionRollbackEngine.js';
import { PolicyEvolutionProvenanceEngine } from './policyEvolutionProvenanceEngine.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
export interface PolicyEvolutionRuntimeOptions {
    readonly snapshotStore?: PolicySnapshotStore;
    readonly synthesizer?: PolicyRefinementSynthesizer;
    readonly simulationEngine?: CounterfactualSimulationEngine;
    readonly calibrationEngine?: GuardrailCalibrationEngine;
    readonly reviewBridge?: PolicyEvolutionReviewBridge;
    readonly rolloutEngine?: GovernedPolicyRolloutEngine;
    readonly rollbackEngine?: PolicyEvolutionRollbackEngine;
    readonly provenanceEngine?: PolicyEvolutionProvenanceEngine;
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class PolicyEvolutionRuntime {
    static readonly AUDIT_DOMAIN = "POLICY_EVOLUTION";
    private static readonly PROTECTED_WORKSPACE_PATTERN;
    private readonly snapshotStore;
    private readonly synthesizer;
    private readonly simulationEngine;
    private readonly calibrationEngine;
    private readonly reviewBridge;
    private readonly rolloutEngine;
    private readonly rollbackEngine;
    private readonly provenanceEngine;
    private readonly auditLedger;
    private readonly sanitizer;
    private userStopActive;
    constructor(options?: PolicyEvolutionRuntimeOptions);
    /**
     * Sets or unsets the USER_STOP emergency circuit breaker.
     * When active, all operations fail closed immediately.
     * Đặt hoặc hủy cầu dao khẩn cấp USER_STOP.
     */
    setUserStop(active: boolean): void;
    isUserStopActive(): boolean;
    /**
     * Invariant check ensuring operational safety, USER_STOP supremacy, and protected workspace isolation.
     * Kiểm tra bất biến đảm bảo an toàn vận hành, quyền tối thượng của USER_STOP và cách ly không gian bảo vệ.
     */
    private assertOperationalSafety;
    /**
     * Records an immutable event to canonical globalAuditLedger under domain 'POLICY_EVOLUTION'.
     * Ghi sự kiện bất biến vào globalAuditLedger chuẩn tắc dưới miền 'POLICY_EVOLUTION'.
     */
    private recordAudit;
    /**
     * Retrieves active policy configuration.
     * Lấy cấu hình chính sách hiện đang hoạt động.
     */
    getActiveConfiguration(userId?: string): PolicyConfiguration;
    /**
     * Synthesizes a candidate PolicyEvolutionProposal from cross-incident intelligence artifacts.
     * Fails closed if USER_STOP is active.
     * Tổng hợp một Đề xuất Tiến hóa Chính sách ứng viên từ các hiện vật tình báo liên sự cố.
     */
    synthesizeProposal(input: SynthesizeProposalInput): PolicyEvolutionProposal;
    /**
     * Runs counterfactual incident simulation against archived incident history.
     * Authority: Level 0 Read-Only. Fails closed if USER_STOP is active.
     * Chạy mô phỏng sự cố phản thực tế trên lịch sử sự cố đã lưu trữ.
     */
    runSimulation(proposal: PolicyEvolutionProposal, userId?: string): CounterfactualSimulationResult;
    /**
     * Calibrates guardrail margins and enforces hard safety invariants.
     * Authority: Level 0 Read-Only. Fails closed if USER_STOP is active.
     * Hiệu chuẩn biên giới bảo vệ và thực thi các bất biến an toàn cốt lõi.
     */
    calibrateGuardrails(proposal: PolicyEvolutionProposal, simulationResult: CounterfactualSimulationResult): GuardrailCalibrationResult;
    /**
     * Stages a validated proposal package for Master Human Operator review.
     * Generates cryptographic provenance seal. Fails closed if USER_STOP is active.
     * Chuẩn bị gói đề xuất đã xác thực cho đánh giá của Master Human Operator.
     */
    stageForReview(proposal: PolicyEvolutionProposal, simulationResult: CounterfactualSimulationResult, guardrailResult: GuardrailCalibrationResult, userId?: string): {
        stagedPackage: StagedReviewPackage;
        provenance: PolicyEvolutionProvenanceRecord;
    };
    /**
     * Submits an explicit human review decision.
     * Rejects autonomous agent self-approval. Fails closed if USER_STOP is active.
     * Đệ trình quyết định đánh giá của con người rõ ràng.
     */
    submitHumanReview(stagedPackage: StagedReviewPackage, decision: 'APPROVED' | 'REJECTED', reviewerId: string, reviewNotes: string, authorizationToken?: AuthorizationToken): PolicyReviewRecord;
    /**
     * Executes a transactional policy rollout upon receiving explicit human authorization.
     * Consumes authorization token atomically. Fails closed if USER_STOP is active.
     * Thực thi triển khai chính sách có giao dịch sau khi nhận được ủy quyền rõ ràng của con người.
     */
    applyPolicyRollout(proposal: PolicyEvolutionProposal, reviewRecord: PolicyReviewRecord, provenanceSha256: string, userId?: string): {
        rolloutRecord: PolicyRolloutRecord;
        updatedConfiguration: PolicyConfiguration;
    };
    /**
     * Rolls back active policy to previous snapshot upon failure or revocation.
     * Hoàn tác chính sách đang hoạt động về bản chụp trước đó khi có lỗi hoặc thu hồi.
     */
    rollbackPolicy(rolloutRecord: PolicyRolloutRecord, reason: string, userId?: string): {
        rollbackRecord: PolicyRollbackRecord;
        restoredSnapshot: PolicySnapshot;
    };
}
