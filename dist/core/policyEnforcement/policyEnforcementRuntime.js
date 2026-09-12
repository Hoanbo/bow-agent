// src/core/policyEnforcement/policyEnforcementRuntime.ts
// BOWCON V4.0 — MS-1.3.59: GOVERNED RUNTIME POLICY ENFORCEMENT POINT (PEP),
// DYNAMIC PDP SYNCHRONIZATION & LIVE GUARDRAIL EXECUTION PIPELINE
//
// Master Policy Enforcement Runtime Coordinator.
// Unifies active policy resolution, atomic hot-swapping, runtime guardrail enforcement,
// policy drift reconciliation, fail-closed baseline fallback, and violation auditing.
// Exposes high-level runtime interfaces for AgentLoop, ToolRegistry, and WorldActionExecutor.
// Điều phối viên thời gian chạy thực thi chính sách chủ.
// Hợp nhất giải quyết chính sách hoạt động, hoán đổi nóng nguyên tử, thực thi rào chắn thời gian chạy,
// đối soát độ lệch chính sách, dự phòng đường cơ sở đóng an toàn và kiểm toán vi phạm.
//
// Authority Invariants:
// - Level 2 Controlled Runtime Enforcement Coordinator
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_SELF_APPROVAL
// - USER_STOP > ALL_RUNTIME_POLICY_OPERATIONS
// - HARD_FORBIDDEN_POLICY > DYNAMIC_POLICY
// - FAIL_CLOSED > SPECULATIVE_EXECUTION
import path from 'node:path';
import { PolicySnapshotStore } from '../policyEvolution/policySnapshotStore.js';
import { ActivePolicyResolver } from './activePolicyResolver.js';
import { globalPolicyHotSwapEngine } from './policyHotSwapEngine.js';
import { globalRuntimeGuardrailEnforcer } from './runtimeGuardrailEnforcer.js';
import { PolicyDriftReconciler } from './policyDriftReconciler.js';
import { globalPolicyViolationAuditor } from './policyViolationAuditor.js';
import { globalFailClosedBaselineFallback } from './failClosedBaselineFallback.js';
import { GovernedPolicyEnforcementPoint } from './governedPolicyEnforcementPoint.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyEnforcementRuntime {
    baseDir;
    snapshotStore;
    activeResolver;
    hotSwapEngine;
    guardrailEnforcer;
    driftReconciler;
    auditor;
    fallbackProvider;
    pep;
    isUserStopActiveFn;
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'policy-evolution'));
        this.snapshotStore = options?.snapshotStore ?? new PolicySnapshotStore({ baseDir: this.baseDir });
        this.fallbackProvider = options?.fallbackProvider ?? globalFailClosedBaselineFallback;
        this.activeResolver = options?.activeResolver ?? new ActivePolicyResolver({ baseDir: this.baseDir, snapshotStore: this.snapshotStore, fallbackProvider: this.fallbackProvider });
        this.hotSwapEngine = options?.hotSwapEngine ?? globalPolicyHotSwapEngine;
        this.guardrailEnforcer = options?.guardrailEnforcer ?? globalRuntimeGuardrailEnforcer;
        this.driftReconciler = options?.driftReconciler ?? new PolicyDriftReconciler({ snapshotStore: this.snapshotStore, hotSwapEngine: this.hotSwapEngine, fallbackProvider: this.fallbackProvider });
        this.auditor = options?.auditor ?? globalPolicyViolationAuditor;
        this.pep = options?.pep ?? new GovernedPolicyEnforcementPoint({ baseDir: this.baseDir, hotSwapEngine: this.hotSwapEngine, activeResolver: this.activeResolver, guardrailEnforcer: this.guardrailEnforcer, auditor: this.auditor, fallbackProvider: this.fallbackProvider });
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    /**
     * Initializes or refreshes runtime active policy from durable store for a tenant.
     * Khởi tạo hoặc làm mới chính sách hoạt động thời gian chạy từ kho lưu trữ bền vững cho người thuê.
     */
    synchronizeTenantPolicy(userId) {
        // 1. Enforce USER_STOP supremacy
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Cannot synchronize policy during emergency stop.');
        }
        // 2. Resolve active policy via ActivePolicyResolver
        const resolution = this.activeResolver.resolveActivePolicy(userId);
        if (!resolution.success || !resolution.policyConfig) {
            // Reset in-memory reference to baseline fallback fail-closed
            this.hotSwapEngine.resetToBaseline(resolution.tenantPartition, resolution.reason || 'Resolution failed');
            this.auditor.recordViolation({
                tenantPartition: resolution.tenantPartition,
                eventType: 'FALLBACK_ACTIVATED',
                reason: resolution.reason || 'Failed to resolve active policy from store. Reverted to baseline.',
            });
            return {
                success: false,
                tenantPartition: resolution.tenantPartition,
                versionId: this.fallbackProvider.getBaselineConfiguration().versionId,
                isFallback: true,
                reason: resolution.reason,
            };
        }
        // 3. Atomically hot-swap resolved configuration into memory
        try {
            const swapped = this.hotSwapEngine.swapPolicy({
                tenantPartition: resolution.tenantPartition,
                newConfig: resolution.policyConfig,
            });
            this.auditor.recordViolation({
                tenantPartition: resolution.tenantPartition,
                eventType: 'POLICY_ACTIVATED',
                policyVersion: swapped.policyConfig.versionId,
                reason: 'Authorized policy synchronized and hot-swapped into active execution plane.',
            });
            return {
                success: true,
                tenantPartition: resolution.tenantPartition,
                versionId: swapped.policyConfig.versionId,
                isFallback: swapped.isFallback,
            };
        }
        catch (err) {
            this.hotSwapEngine.resetToBaseline(resolution.tenantPartition, `HOT_SWAP_FAILED: ${err?.message}`);
            return {
                success: false,
                tenantPartition: resolution.tenantPartition,
                versionId: this.fallbackProvider.getBaselineConfiguration().versionId,
                isFallback: true,
                reason: err?.message,
            };
        }
    }
    /**
     * Evaluates enforcement context prior to tool execution.
     * Đánh giá ngữ cảnh thực thi trước khi gọi công cụ.
     */
    enforce(context) {
        return this.pep.enforce(context);
    }
    /**
     * Releases an execution lease after execution completes or fails.
     * Giải phóng hợp đồng thuê thực thi sau khi hoàn tất hoặc thất bại.
     */
    releaseLease(leaseId) {
        return this.pep.releaseLease(leaseId);
    }
    /**
     * Reconciles policy drift for a tenant between durable store and memory.
     * Đối soát độ lệch chính sách cho người thuê giữa kho bền vững và bộ nhớ.
     */
    reconcileDrift(userId) {
        const partition = resolveUserPartition(userId, this.baseDir).partitionKey;
        const report = this.driftReconciler.reconcileTenantPolicy(userId, partition);
        if (report.hasDrift) {
            this.auditor.recordViolation({
                tenantPartition: partition,
                eventType: 'DRIFT_DETECTED',
                reason: report.details,
            });
        }
        return report;
    }
    /**
     * Gets in-memory runtime policy state for a tenant.
     * Lấy trạng thái chính sách thời gian chạy trong bộ nhớ cho người thuê.
     */
    getRuntimeState(userId) {
        const partition = resolveUserPartition(userId, this.baseDir).partitionKey;
        return this.hotSwapEngine.getRuntimeState(partition);
    }
    // --- Service Accessors ---
    getGovernedPEP() {
        return this.pep;
    }
    getActiveResolver() {
        return this.activeResolver;
    }
    getHotSwapEngine() {
        return this.hotSwapEngine;
    }
    getGuardrailEnforcer() {
        return this.guardrailEnforcer;
    }
    getDriftReconciler() {
        return this.driftReconciler;
    }
    getAuditor() {
        return this.auditor;
    }
    getFallbackProvider() {
        return this.fallbackProvider;
    }
}
export const globalPolicyEnforcementRuntime = new PolicyEnforcementRuntime();
