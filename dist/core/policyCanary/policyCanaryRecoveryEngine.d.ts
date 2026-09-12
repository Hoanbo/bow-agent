import { type CanaryRecoveryResult, type ConsumedTokenLedgerRecord } from './policyCanaryResilienceTypes.js';
import { type PolicyCandidatePackage, type PolicyRing, type PolicyCanaryStoreRecord } from './policyCanaryTypes.js';
import { PolicyCanaryProvenanceEngine } from './policyCanaryProvenanceEngine.js';
import { PolicyCanaryCircuitBreaker } from './policyCanaryCircuitBreaker.js';
import { FailClosedBaselineFallback } from '../policyEnforcement/failClosedBaselineFallback.js';
import { DurableJsonStore } from '../persistence/durableJsonStore.js';
export interface PolicyCanaryRecoveryEngineOptions {
    readonly provenanceEngine?: PolicyCanaryProvenanceEngine;
    readonly circuitBreaker?: PolicyCanaryCircuitBreaker;
    readonly fallbackProvider?: FailClosedBaselineFallback;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyCanaryRecoveryEngine {
    private readonly provenanceEngine;
    private readonly circuitBreaker;
    private readonly fallbackProvider;
    private readonly isUserStopActiveFn?;
    private readonly consumedTokens;
    constructor(options?: PolicyCanaryRecoveryEngineOptions);
    /**
     * Hashes an authorization token to avoid persisting raw credentials.
     * Băm mã ủy quyền để tránh lưu trữ thông tin xác thực thô.
     */
    hashToken(token: string): string;
    /**
     * Records a consumed authorization token into the replay prevention ledger.
     * Ghi lại mã ủy quyền đã tiêu thụ vào sổ cái ngăn chặn phát lại.
     */
    recordConsumedToken(params: {
        readonly token: string;
        readonly candidateId: PolicyCandidatePackage['candidateId'];
        readonly targetRing: PolicyRing;
        readonly tenantPartition: string;
        readonly consumedBy: string;
    }): ConsumedTokenLedgerRecord;
    /**
     * Checks if a token has already been consumed or replayed.
     * Kiểm tra xem mã ủy quyền đã được tiêu thụ hoặc phát lại hay chưa.
     */
    isTokenAlreadyConsumed(token: string): boolean;
    /**
     * Retrieves a consumed token record if it exists.
     * Lấy bản ghi mã ủy quyền đã tiêu thụ nếu tồn tại.
     */
    getConsumedTokenRecord(token: string): ConsumedTokenLedgerRecord | undefined;
    /**
     * Performs crash-recovery reconciliation on a tenant's durable storage record.
     * Validates all candidate packages, purges stale/tampered candidates, and verifies assignments.
     *
     * Thực hiện đối soát phục hồi sự cố trên bản ghi lưu trữ bền vững của người thuê.
     * Xác thực tất cả các gói ứng viên, thanh trừng các ứng viên cũ/bị giả mạo và xác minh các phép gán.
     */
    reconcileTenantState(tenantPartition: string, store: DurableJsonStore<PolicyCanaryStoreRecord>): CanaryRecoveryResult;
    /**
     * Resets in-memory consumed token ledger (used during unit tests).
     * Đặt lại sổ cái mã xác thực trong bộ nhớ (dùng trong kiểm thử đơn vị).
     */
    clear(): void;
    private calculateChecksum;
}
export declare const globalPolicyCanaryRecoveryEngine: PolicyCanaryRecoveryEngine;
