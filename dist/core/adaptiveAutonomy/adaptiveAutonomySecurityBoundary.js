// src/core/adaptiveAutonomy/adaptiveAutonomySecurityBoundary.ts
// BOWCON V4.0 — MS-1.5.12: NATIVE GOVERNED ADAPTIVE AUTONOMY, RECOVERY & SUPERVISED CONTINUOUS OPERATION ENGINE
// Component 1096 — REAL
//
// EN: Central security boundary and policy enforcement firewall.
//     Synchronously enforces USER_STOP, EMERGENCY_STOP, tenant isolation, session isolation,
//     lease validity, and immutable scope bounds.
// VI: Ranh giới bảo mật trung tâm và tường lửa thực thi chính sách.
//     Thực thi đồng bộ USER_STOP, EMERGENCY_STOP, cô lập bên thuê, cô lập phiên,
//     tính hợp lệ của hợp đồng thuê và các giới hạn phạm vi bất biến.
import path from 'node:path';
import { AdaptiveAutonomyUserStopError, AdaptiveAutonomyEmergencyStopError, AdaptiveAutonomyTenantIsolationError, AdaptiveAutonomySessionIsolationError, AdaptiveAutonomyLeaseError, AdaptiveAutonomyAuthorizationError, AdaptiveAutonomyValidationError, } from './adaptiveAutonomyTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class AdaptiveAutonomySecurityBoundary {
    userStopProvider;
    emergencyStopProvider;
    constructor(options) {
        this.userStopProvider = options?.userStopProvider;
        this.emergencyStopProvider = options?.emergencyStopProvider;
    }
    /**
     * EN: Checks if USER_STOP is active across human authority and local provider.
     * VI: Kiểm tra xem USER_STOP có đang kích hoạt trên thẩm quyền con người và nhà cung cấp cục bộ không.
     */
    isUserStopActive() {
        if (this.userStopProvider && this.userStopProvider()) {
            return true;
        }
        const authorityVal = globalMasterHumanAuthority?.isUserStopActive;
        if (typeof authorityVal === 'function') {
            return authorityVal();
        }
        return Boolean(authorityVal);
    }
    /**
     * EN: Checks if EMERGENCY_STOP is active.
     * VI: Kiểm tra xem EMERGENCY_STOP có đang kích hoạt không.
     */
    isEmergencyStopActive() {
        if (this.emergencyStopProvider && this.emergencyStopProvider()) {
            return true;
        }
        return false;
    }
    /**
     * EN: Asserts neither USER_STOP nor EMERGENCY_STOP is active at a critical checkpoint.
     * VI: Khẳng định cả USER_STOP và EMERGENCY_STOP đều không kích hoạt tại điểm kiểm soát quan trọng.
     */
    assertStopInactive(checkpoint, tenantId, sessionId) {
        if (this.isEmergencyStopActive()) {
            throw new AdaptiveAutonomyEmergencyStopError(`EMERGENCY_STOP active at checkpoint '${checkpoint}' — immediate halt enforced`, tenantId, sessionId);
        }
        if (this.isUserStopActive()) {
            throw new AdaptiveAutonomyUserStopError(`USER_STOP active at checkpoint '${checkpoint}' — immediate halt enforced`, tenantId, sessionId);
        }
    }
    /**
     * EN: Asserts strict multi-tenant isolation across envelope, session, and lease.
     * VI: Khẳng định sự cô lập đa bên thuê nghiêm ngặt trên phong bì, phiên và hợp đồng thuê.
     */
    assertTenantIsolation(requestedTenant, expectedTenant, sessionId) {
        if (!requestedTenant || !expectedTenant || requestedTenant.trim() !== expectedTenant.trim()) {
            throw new AdaptiveAutonomyTenantIsolationError(`Tenant isolation violation: requested '${requestedTenant}', expected '${expectedTenant}'`, requestedTenant, sessionId);
        }
    }
    /**
     * EN: Asserts session identity matches active context.
     * VI: Khẳng định định danh phiên khớp với ngữ cảnh đang hoạt động.
     */
    assertSessionIsolation(requestedSession, activeSession, tenantId) {
        if (!requestedSession || !activeSession || requestedSession.trim() !== activeSession.trim()) {
            throw new AdaptiveAutonomySessionIsolationError(`Session isolation violation: requested '${requestedSession}', active '${activeSession}'`, tenantId, requestedSession);
        }
    }
    /**
     * EN: Asserts execution lease is active, unexpired, and matches tenant.
     * VI: Khẳng định hợp đồng thuê thực thi đang hoạt động, chưa hết hạn và khớp bên thuê.
     */
    assertLeaseValidity(lease, expectedTenant, sessionId) {
        if (!lease || !lease.leaseId) {
            throw new AdaptiveAutonomyLeaseError('Missing or null execution lease', expectedTenant, sessionId);
        }
        if (lease.tenantId !== expectedTenant) {
            throw new AdaptiveAutonomyLeaseError(`Lease tenant mismatch: lease=${lease.tenantId}, expected=${expectedTenant}`, expectedTenant, sessionId);
        }
        if (lease.isRevoked) {
            throw new AdaptiveAutonomyLeaseError(`Lease '${lease.leaseId}' has been revoked`, expectedTenant, sessionId);
        }
        if (lease.expiresAt <= Date.now()) {
            throw new AdaptiveAutonomyLeaseError(`Lease '${lease.leaseId}' has expired (expiresAt=${lease.expiresAt})`, expectedTenant, sessionId);
        }
    }
    /**
     * EN: Enforces scope firewalling — ensures proposed actions remain within original authorized scope.
     * VI: Thực thi tường lửa phạm vi — đảm bảo các hành động được đề xuất nằm trong phạm vi ủy quyền ban đầu.
     */
    assertScopeBound(proposedOperations, authorizedScope, tenantId, sessionId) {
        const authorizedSet = new Set(authorizedScope);
        for (const op of proposedOperations) {
            if (!authorizedSet.has(op)) {
                throw new AdaptiveAutonomyAuthorizationError(`Scope firewall violation: operation '${op}' is not in authorized scope [${authorizedScope.join(', ')}]`, tenantId, sessionId);
            }
        }
    }
    /**
     * EN: Resolves a safe tenant partition directory preventing path traversal and null bytes.
     * VI: Giải quyết thư mục phân vùng an toàn của bên thuê ngăn chặn duyệt đường dẫn và byte rỗng.
     */
    resolveSafePartition(tenantId, baseDir) {
        if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
            throw new AdaptiveAutonomyValidationError('Tenant ID must be a non-empty string');
        }
        if (tenantId.includes('\0')) {
            throw new AdaptiveAutonomyValidationError('Null byte detected in tenant identifier');
        }
        if (tenantId.includes('..') || tenantId.includes('/') || tenantId.includes('\\')) {
            throw new AdaptiveAutonomyValidationError('Path traversal characters detected in tenant identifier');
        }
        const partitionKey = `tenant_${tenantId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const resolvedPath = path.resolve(baseDir, partitionKey);
        const resolvedBase = path.resolve(baseDir);
        if (!resolvedPath.startsWith(resolvedBase)) {
            throw new AdaptiveAutonomyValidationError('Resolved partition escapes base directory boundary');
        }
        return { partitionKey, partitionDir: resolvedPath };
    }
}
