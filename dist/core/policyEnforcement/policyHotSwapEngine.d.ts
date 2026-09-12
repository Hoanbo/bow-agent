import { type PolicyConfiguration } from '../policyEvolution/policyEvolutionTypes.js';
import { type ActivePolicyId, type RuntimePolicyState } from './policyEnforcementTypes.js';
import { FailClosedBaselineFallback } from './failClosedBaselineFallback.js';
export interface ActivePolicyReference {
    readonly activePolicyId: ActivePolicyId;
    readonly tenantPartition: string;
    readonly policyConfig: Readonly<PolicyConfiguration>;
    readonly activationTimestamp: number;
    readonly provenanceReference?: string;
    readonly isFallback: boolean;
}
export interface HotSwapOptions {
    readonly fallbackProvider?: FailClosedBaselineFallback;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyHotSwapEngine {
    private readonly fallbackProvider;
    private readonly isUserStopActiveFn?;
    private readonly activePolicies;
    private readonly inFlightExecutions;
    constructor(options?: HotSwapOptions);
    /**
     * Retrieves the current immutable active policy reference for a tenant.
     * If none is cached, initializes with the locked baseline fallback.
     * Lấy tham chiếu chính sách hoạt động bất biến hiện tại cho người thuê.
     * Nếu chưa được lưu vào bộ nhớ cache, khởi tạo với đường cơ sở bị khóa.
     */
    getActivePolicy(tenantPartition: string): ActivePolicyReference;
    /**
     * Performs an atomic hot-swap of the active policy for a tenant partition.
     * Validates safety floor, checks version progression, and swaps reference atomically.
     * Thực hiện hoán đổi nóng nguyên tử của chính sách hoạt động cho một phân vùng người thuê.
     * Xác thực sàn an toàn, kiểm tra tiến trình phiên bản và hoán đổi tham chiếu nguyên tử.
     */
    swapPolicy(params: {
        readonly tenantPartition: string;
        readonly newConfig: PolicyConfiguration;
        readonly provenanceReference?: string;
    }): ActivePolicyReference;
    /**
     * Resets tenant policy to baseline fallback immediately (used on drift/tamper detection).
     * Đặt lại chính sách người thuê về dự phòng đường cơ sở ngay lập tức (dùng khi phát hiện lệch/can thiệp).
     */
    resetToBaseline(tenantPartition: string, reason: string): ActivePolicyReference;
    /**
     * Tracks in-flight executions for concurrency monitoring.
     * Theo dõi các lần thực thi đang diễn ra để giám sát tính đồng thời.
     */
    incrementInFlight(tenantPartition: string): number;
    decrementInFlight(tenantPartition: string): number;
    getInFlightCount(tenantPartition: string): number;
    /**
     * Returns current runtime state snapshot for a tenant.
     * Trả về bản chụp trạng thái thời gian chạy hiện tại cho một người thuê.
     */
    getRuntimeState(tenantPartition: string): RuntimePolicyState;
}
export declare const globalPolicyHotSwapEngine: PolicyHotSwapEngine;
