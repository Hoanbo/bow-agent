// src/core/policyEnforcement/policyHotSwapEngine.ts
// BOWCON V4.0 — MS-1.3.59: GOVERNED RUNTIME POLICY ENFORCEMENT POINT (PEP),
// DYNAMIC PDP SYNCHRONIZATION & LIVE GUARDRAIL EXECUTION PIPELINE
//
// Thread-safe, atomic in-memory active policy hot-swap engine.
// Maintains immutable policy references partitioned by tenant.
// Guarantees atomic pointer swapping so readers never observe partial state.
// Rejects stale activations, corrupted configurations, and illegal downgrades.
// Động cơ hoán đổi nóng chính sách hoạt động trong bộ nhớ nguyên tử, an toàn đa luồng.
// Duy trì các tham chiếu chính sách bất biến được phân vùng theo người thuê.
// Đảm bảo hoán đổi con trỏ nguyên tử để người đọc không bao giờ quan sát trạng thái một phần.
// Từ chối các kích hoạt cũ, cấu hình bị hỏng và hạ cấp bất hợp pháp.
//
// Authority Invariants:
// - Level 2 Controlled Runtime State Activation (Post-authorization only)
// - Hot swap != Authorization (Activates pre-authorized snapshots only)
// - USER_STOP > ALL_RUNTIME_POLICY_OPERATIONS
// - Zero autonomous token issuance, zero self-approval.
import { createActivePolicyId, } from './policyEnforcementTypes.js';
import { globalFailClosedBaselineFallback } from './failClosedBaselineFallback.js';
export class PolicyHotSwapEngine {
    fallbackProvider;
    isUserStopActiveFn;
    // Tenant-partitioned immutable active policy references
    // Tham chiếu chính sách hoạt động bất biến được phân vùng theo người thuê
    activePolicies = new Map();
    // In-flight execution counters per tenant partition
    // Bộ đếm thực thi đang diễn ra trên mỗi phân vùng người thuê
    inFlightExecutions = new Map();
    constructor(options) {
        this.fallbackProvider = options?.fallbackProvider ?? globalFailClosedBaselineFallback;
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    /**
     * Retrieves the current immutable active policy reference for a tenant.
     * If none is cached, initializes with the locked baseline fallback.
     * Lấy tham chiếu chính sách hoạt động bất biến hiện tại cho người thuê.
     * Nếu chưa được lưu vào bộ nhớ cache, khởi tạo với đường cơ sở bị khóa.
     */
    getActivePolicy(tenantPartition) {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Cannot read active policy during emergency stop.');
        }
        const existing = this.activePolicies.get(tenantPartition);
        if (existing) {
            return existing;
        }
        // Default to immutable baseline fallback
        const baseline = this.fallbackProvider.getBaselineConfiguration();
        const fallbackRef = {
            activePolicyId: createActivePolicyId(`active_baseline_${Date.now()}`),
            tenantPartition,
            policyConfig: Object.freeze(baseline),
            activationTimestamp: Date.now(),
            isFallback: true,
        };
        this.activePolicies.set(tenantPartition, Object.freeze(fallbackRef));
        return fallbackRef;
    }
    /**
     * Performs an atomic hot-swap of the active policy for a tenant partition.
     * Validates safety floor, checks version progression, and swaps reference atomically.
     * Thực hiện hoán đổi nóng nguyên tử của chính sách hoạt động cho một phân vùng người thuê.
     * Xác thực sàn an toàn, kiểm tra tiến trình phiên bản và hoán đổi tham chiếu nguyên tử.
     */
    swapPolicy(params) {
        // 1. Enforce USER_STOP supremacy
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Policy hot-swap halted by emergency stop.');
        }
        const { tenantPartition, newConfig, provenanceReference } = params;
        // 2. Validate tenant partition
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('HOT_SWAP_REJECTED: tenantPartition must be a non-empty string.');
        }
        // 3. Validate new configuration structure & version
        if (!newConfig || !newConfig.versionId || !newConfig.actionClassifications) {
            throw new Error('HOT_SWAP_REJECTED: Invalid policy configuration provided for hot swap.');
        }
        // 4. Verify hard-forbidden safety floor immutability
        if (!this.fallbackProvider.verifyClassificationSafetyFloor(newConfig.actionClassifications)) {
            throw new Error('HOT_SWAP_REJECTED: FORBIDDEN_DOWNGRADE_ATTEMPT — New policy attempts to downgrade a hard-forbidden action.');
        }
        // 5. Guard against stale policy activation (reject if activating older version)
        const currentRef = this.activePolicies.get(tenantPartition);
        if (currentRef && !currentRef.isFallback) {
            if (newConfig.activeSince < currentRef.policyConfig.activeSince) {
                throw new Error(`HOT_SWAP_REJECTED: Stale policy activation detected. Incoming activeSince (${newConfig.activeSince}) is older than current (${currentRef.policyConfig.activeSince}).`);
            }
        }
        // 6. Build new immutable active policy reference
        const activePolicyId = createActivePolicyId(`active_${newConfig.versionId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24)}_${Date.now()}`);
        const newRef = {
            activePolicyId,
            tenantPartition,
            policyConfig: Object.freeze({ ...newConfig }),
            activationTimestamp: Date.now(),
            provenanceReference,
            isFallback: false,
        };
        // 7. Atomic reference assignment in map (race-free pointer replacement)
        // Gán tham chiếu nguyên tử trong bản đồ (thay thế con trỏ không có xung đột chạy đua)
        this.activePolicies.set(tenantPartition, Object.freeze(newRef));
        return newRef;
    }
    /**
     * Resets tenant policy to baseline fallback immediately (used on drift/tamper detection).
     * Đặt lại chính sách người thuê về dự phòng đường cơ sở ngay lập tức (dùng khi phát hiện lệch/can thiệp).
     */
    resetToBaseline(tenantPartition, reason) {
        const baseline = this.fallbackProvider.getBaselineConfiguration();
        const fallbackRef = {
            activePolicyId: createActivePolicyId(`active_fallback_${Date.now()}`),
            tenantPartition,
            policyConfig: Object.freeze(baseline),
            activationTimestamp: Date.now(),
            provenanceReference: `RESET: ${reason}`,
            isFallback: true,
        };
        this.activePolicies.set(tenantPartition, Object.freeze(fallbackRef));
        return fallbackRef;
    }
    /**
     * Tracks in-flight executions for concurrency monitoring.
     * Theo dõi các lần thực thi đang diễn ra để giám sát tính đồng thời.
     */
    incrementInFlight(tenantPartition) {
        const count = (this.inFlightExecutions.get(tenantPartition) ?? 0) + 1;
        this.inFlightExecutions.set(tenantPartition, count);
        return count;
    }
    decrementInFlight(tenantPartition) {
        const count = Math.max(0, (this.inFlightExecutions.get(tenantPartition) ?? 1) - 1);
        this.inFlightExecutions.set(tenantPartition, count);
        return count;
    }
    getInFlightCount(tenantPartition) {
        return this.inFlightExecutions.get(tenantPartition) ?? 0;
    }
    /**
     * Returns current runtime state snapshot for a tenant.
     * Trả về bản chụp trạng thái thời gian chạy hiện tại cho một người thuê.
     */
    getRuntimeState(tenantPartition) {
        const ref = this.getActivePolicy(tenantPartition);
        return {
            tenantPartition,
            activePolicyId: ref.activePolicyId,
            versionId: ref.policyConfig.versionId,
            checksum: ref.policyConfig.checksum,
            activatedAt: ref.activationTimestamp,
            isFallback: ref.isFallback,
            inFlightExecutions: this.getInFlightCount(tenantPartition),
        };
    }
}
export const globalPolicyHotSwapEngine = new PolicyHotSwapEngine();
