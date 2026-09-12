import { type DeploymentId, type DeploymentCircuitBreakerState, type CircuitBreakerEvent } from './deploymentTypes.js';
export interface TripBreakerOptions {
    readonly deploymentId: DeploymentId;
    readonly reason: string;
    readonly triggeredBy: 'SLO_VIOLATION' | 'USER_STOP' | 'REVOCATION' | 'MANUAL_INTERLOCK';
    readonly details?: Record<string, unknown>;
}
export declare class DeploymentCircuitBreaker {
    private states;
    private events;
    /**
     * Retrieves current circuit breaker state for a deployment (defaults to CLOSED).
     * Lấy trạng thái bộ ngắt mạch hiện tại cho một đợt triển khai (mặc định là CLOSED).
     */
    getState(deploymentId: DeploymentId): DeploymentCircuitBreakerState;
    /**
     * Checks whether the circuit breaker is currently open (blocking actions).
     * Kiểm tra xem bộ ngắt mạch hiện có đang mở (chặn các hành động) hay không.
     */
    isOpen(deploymentId: DeploymentId): boolean;
    /**
     * Trips the circuit breaker from CLOSED/HALF_OPEN to OPEN.
     * Kích hoạt ngắt mạch chuyển từ CLOSED/HALF_OPEN sang OPEN.
     */
    trip(options: TripBreakerOptions): CircuitBreakerEvent;
    /**
     * Resets the circuit breaker back to CLOSED upon verified supervisory intervention.
     * Đặt lại bộ ngắt mạch về CLOSED sau khi có sự can thiệp giám sát đã được xác minh.
     */
    reset(deploymentId: DeploymentId, supervisorId: string, rationale: string): CircuitBreakerEvent;
    /**
     * Transitions circuit breaker to HALF_OPEN for controlled probe verification.
     * Chuyển đổi bộ ngắt mạch sang HALF_OPEN để thăm dò xác minh có kiểm soát.
     */
    setHalfOpen(deploymentId: DeploymentId, reason: string): CircuitBreakerEvent;
    /**
     * Retrieves all circuit breaker events recorded for a deployment.
     * Lấy tất cả các sự kiện bộ ngắt mạch được ghi nhận cho một đợt triển khai.
     */
    getEvents(deploymentId: DeploymentId): readonly CircuitBreakerEvent[];
}
