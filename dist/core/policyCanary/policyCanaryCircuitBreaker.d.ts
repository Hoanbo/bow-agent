import { type CircuitBreakerStatus, type PolicyCanaryFailureReason } from './policyCanaryTypes.js';
import { PolicyViolationAuditor } from '../policyEnforcement/policyViolationAuditor.js';
export interface PolicyCanaryCircuitBreakerOptions {
    readonly auditor?: PolicyViolationAuditor;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyCanaryCircuitBreaker {
    private readonly auditor;
    private readonly isUserStopActiveFn?;
    private readonly states;
    constructor(options?: PolicyCanaryCircuitBreakerOptions);
    /**
     * Checks whether the circuit breaker is tripped for a tenant partition.
     * If USER_STOP is active, always returns tripped (fail-closed).
     *
     * Kiểm tra xem bộ ngắt mạch có bị ngắt cho một phân vùng người thuê hay không.
     * Nếu USER_STOP đang hoạt động, luôn trả về bị ngắt (đóng an toàn).
     */
    isTripped(tenantPartition: string): boolean;
    /**
     * Retrieves the current circuit breaker status for a tenant partition.
     * Lấy trạng thái bộ ngắt mạch hiện tại cho phân vùng người thuê.
     */
    getStatus(tenantPartition: string): CircuitBreakerStatus;
    /**
     * Immediately trips the circuit breaker fail-closed.
     * Ngay lập tức ngắt mạch đóng an toàn.
     */
    trip(input: {
        readonly tenantPartition: string;
        readonly reason: PolicyCanaryFailureReason;
        readonly details?: string;
        readonly trippedBy?: string;
    }): CircuitBreakerStatus;
    /**
     * Resets the circuit breaker.
     * STRICT INVARIANT: Requires human operator confirmation. Autonomous reset is FORBIDDEN.
     *
     * Đặt lại bộ ngắt mạch.
     * BẤT BIẾN NGHIÊM NGẶT: Yêu cầu xác nhận của người vận hành là con người. Đặt lại tự động bị CẤM.
     */
    reset(tenantPartition: string, operatorUserId: string, reason: string): CircuitBreakerStatus;
    /**
     * Clears all states (used during testing).
     * Xóa tất cả trạng thái (dùng trong thử nghiệm).
     */
    clear(): void;
}
export declare const globalPolicyCanaryCircuitBreaker: PolicyCanaryCircuitBreaker;
