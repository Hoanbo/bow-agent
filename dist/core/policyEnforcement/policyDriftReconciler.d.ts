import { PolicySnapshotStore } from '../policyEvolution/policySnapshotStore.js';
import { PolicyHotSwapEngine } from './policyHotSwapEngine.js';
import { FailClosedBaselineFallback } from './failClosedBaselineFallback.js';
import { type PolicyDriftReport } from './policyEnforcementTypes.js';
export interface PolicyDriftReconcilerOptions {
    readonly snapshotStore?: PolicySnapshotStore;
    readonly hotSwapEngine?: PolicyHotSwapEngine;
    readonly fallbackProvider?: FailClosedBaselineFallback;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyDriftReconciler {
    private readonly snapshotStore;
    private readonly hotSwapEngine;
    private readonly fallbackProvider;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyDriftReconcilerOptions);
    /**
     * Reconciles the in-memory active policy against the durable snapshot for a tenant.
     * If drift, tampering, or corruption is detected, automatically triggers fail-closed baseline fallback.
     * Đối soát chính sách hoạt động trong bộ nhớ đối với bản chụp bền vững cho người thuê.
     * Nếu phát hiện độ lệch, can thiệp hoặc hỏng hóc, tự động kích hoạt dự phòng đường cơ sở đóng an toàn.
     */
    reconcileTenantPolicy(userId: string, tenantPartition: string): PolicyDriftReport;
    /**
     * Helper calculating deterministic SHA-256 checksum for a policy configuration.
     * Hàm trợ giúp tính toán mã kiểm tra SHA-256 tất định cho một cấu hình chính sách.
     */
    private calculateConfigChecksum;
}
export declare const globalPolicyDriftReconciler: PolicyDriftReconciler;
