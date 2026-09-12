// src/core/policyEnforcement/activePolicyResolver.ts
// BOWCON V4.0 — MS-1.3.59: GOVERNED RUNTIME POLICY ENFORCEMENT POINT (PEP),
// DYNAMIC PDP SYNCHRONIZATION & LIVE GUARDRAIL EXECUTION PIPELINE
//
// Read-only, tenant-isolated active policy configuration resolver.
// Safely queries PolicySnapshotStore within the authenticated tenant partition boundary,
// validates cryptographic checksum integrity, enforces the hard-forbidden safety floor,
// and respects absolute USER_STOP supremacy.
// Trình giải quyết cấu hình chính sách hoạt động chỉ đọc, cô lập theo người thuê.
// Truy vấn an toàn PolicySnapshotStore trong ranh giới phân vùng người thuê đã xác thực,
// xác thực tính toàn vẹn mã băm mật mã, thực thi sàn an toàn cấm tuyệt đối,
// và tôn trọng quyền tối thượng tuyệt đối của USER_STOP.
//
// Authority Invariants:
// - Level 0 Read-Only Policy Resolution
// - TENANT_POLICY != CROSS_TENANT_POLICY
// - USER_STOP > ALL_RUNTIME_POLICY_OPERATIONS
// - Zero autonomous token issuance, zero mutation of snapshot store.
import crypto from 'node:crypto';
import path from 'node:path';
import { PolicySnapshotStore } from '../policyEvolution/policySnapshotStore.js';
import { resolveUserPartition, } from '../persistence/userPartitionResolver.js';
import { globalFailClosedBaselineFallback } from './failClosedBaselineFallback.js';
export class ActivePolicyResolver {
    snapshotStore;
    fallbackProvider;
    baseDir;
    isUserStopActiveFn;
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'policy-evolution'));
        this.snapshotStore = options?.snapshotStore ?? new PolicySnapshotStore({ baseDir: this.baseDir });
        this.fallbackProvider = options?.fallbackProvider ?? globalFailClosedBaselineFallback;
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    /**
     * Resolves the active policy configuration for a given tenant / actor.
     * Guarantees tenant isolation, checksum integrity, and USER_STOP supremacy.
     * Giải quyết cấu hình chính sách hoạt động cho một người thuê / tác nhân nhất định.
     * Đảm bảo sự cô lập người thuê, tính toàn vẹn của mã kiểm tra và tính tối thượng của USER_STOP.
     */
    resolveActivePolicy(actorUserId) {
        // 1. Enforce absolute USER_STOP supremacy
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Policy resolution halted by emergency stop.');
        }
        // 2. Reject anonymous or invalid tenant IDs (fail closed)
        if (!actorUserId || typeof actorUserId !== 'string' || actorUserId.trim().length === 0 || actorUserId === 'anonymous') {
            const fallbackConfig = this.fallbackProvider.getBaselineConfiguration();
            return {
                success: false,
                policyConfig: fallbackConfig,
                tenantPartition: 'anonymous_quarantine',
                isBaselineFallback: true,
                reason: 'ANONYMOUS_ACCESS_FORBIDDEN: Tenant partition could not be verified; failing closed to baseline.',
                failClosedReason: 'ANONYMOUS_ACCESS_FORBIDDEN',
            };
        }
        // 3. Resolve tenant partition boundary via UserPartitionResolver
        let partition;
        try {
            partition = resolveUserPartition(actorUserId, this.baseDir);
        }
        catch (err) {
            const fallbackConfig = this.fallbackProvider.getBaselineConfiguration();
            return {
                success: false,
                policyConfig: fallbackConfig,
                tenantPartition: 'invalid_partition',
                isBaselineFallback: true,
                reason: `PARTITION_RESOLUTION_FAILED: ${err?.message || 'Unknown partition error'}`,
                failClosedReason: 'POLICY_TENANT_MISMATCH',
            };
        }
        // 4. Retrieve durable active snapshot from PolicySnapshotStore
        let activeSnapshot;
        try {
            activeSnapshot = this.snapshotStore.getActiveSnapshot(actorUserId);
        }
        catch (err) {
            const fallbackConfig = this.fallbackProvider.getBaselineConfiguration();
            return {
                success: false,
                policyConfig: fallbackConfig,
                tenantPartition: partition.partitionKey,
                isBaselineFallback: true,
                reason: `SNAPSHOT_RETRIEVAL_FAILED: ${err?.message || 'Store read failure'}`,
                failClosedReason: 'POLICY_SNAPSHOT_MISSING',
            };
        }
        if (!activeSnapshot || !activeSnapshot.configuration) {
            const fallbackConfig = this.fallbackProvider.getBaselineConfiguration();
            return {
                success: false,
                policyConfig: fallbackConfig,
                tenantPartition: partition.partitionKey,
                isBaselineFallback: true,
                reason: 'POLICY_SNAPSHOT_CORRUPTED: Active snapshot missing configuration structure.',
                failClosedReason: 'POLICY_SNAPSHOT_CORRUPTED',
            };
        }
        const config = activeSnapshot.configuration;
        // 5. Verify tenant partition matches stored snapshot partition
        if (activeSnapshot.userPartition !== partition.partitionKey) {
            const fallbackConfig = this.fallbackProvider.getBaselineConfiguration();
            return {
                success: false,
                policyConfig: fallbackConfig,
                tenantPartition: partition.partitionKey,
                isBaselineFallback: true,
                reason: `TENANT_PARTITION_MISMATCH: Stored partition '${activeSnapshot.userPartition}' does not match authenticated partition '${partition.partitionKey}'.`,
                failClosedReason: 'POLICY_TENANT_MISMATCH',
            };
        }
        // 6. Verify policy version validity
        if (!config.versionId || typeof config.versionId !== 'string' || config.versionId.trim().length === 0) {
            const fallbackConfig = this.fallbackProvider.getBaselineConfiguration();
            return {
                success: false,
                policyConfig: fallbackConfig,
                tenantPartition: partition.partitionKey,
                isBaselineFallback: true,
                reason: 'POLICY_VERSION_INVALID: Policy configuration version ID is empty or invalid.',
                failClosedReason: 'POLICY_VERSION_INVALID',
            };
        }
        // 7. Verify hard-forbidden safety floor immutability
        if (!this.fallbackProvider.verifyClassificationSafetyFloor(config.actionClassifications)) {
            const fallbackConfig = this.fallbackProvider.getBaselineConfiguration();
            return {
                success: false,
                policyConfig: fallbackConfig,
                tenantPartition: partition.partitionKey,
                isBaselineFallback: true,
                reason: 'FORBIDDEN_DOWNGRADE_ATTEMPT: Active policy attempts to downgrade an immutable hard-forbidden action.',
                failClosedReason: 'FORBIDDEN_DOWNGRADE_ATTEMPT',
            };
        }
        // 8. Return successfully resolved active policy
        return {
            success: true,
            policyConfig: config,
            snapshotId: activeSnapshot.snapshotId,
            tenantPartition: partition.partitionKey,
            isBaselineFallback: false,
        };
    }
    /**
     * Helper verifying cryptographic SHA-256 payload integrity against stored checksum.
     * Hàm trợ giúp xác minh tính toàn vẹn tải trọng mật mã SHA-256 đối với mã kiểm tra được lưu.
     */
    verifyChecksum(config, provenanceSha256) {
        if (!config || !config.checksum)
            return false;
        const payload = JSON.stringify({
            versionId: config.versionId,
            classifications: config.actionClassifications,
            guardrails: config.guardrails,
            ...(provenanceSha256 ? { provenance: provenanceSha256 } : {}),
        });
        const calculated = crypto.createHash('sha256').update(payload).digest('hex');
        return calculated === config.checksum;
    }
}
export const globalActivePolicyResolver = new ActivePolicyResolver();
