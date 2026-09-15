// src/core/multiAgentFederation/federationSecurityBoundary.ts
// BOWCON V4.0 — MS-1.5.14: NATIVE GOVERNED MULTI-AGENT FEDERATION, DELEGATION & COLLABORATIVE COORDINATION ENGINE
// Component 1115 — REAL
//
// EN: Central governance security boundary and policy enforcement firewall for multi-agent federation.
//     Synchronously enforces 13-checkpoint USER_STOP supremacy, EMERGENCY_STOP, tenant isolation,
//     session isolation, lease governance, and authorization scope containment.
// VI: Ranh giới bảo mật quản trị trung tâm và tường lửa thực thi chính sách cho liên đoàn đa tác tử.
//     Thực thi đồng bộ quyền tối cao USER_STOP tại 13 điểm kiểm tra, EMERGENCY_STOP, cô lập bên thuê,
//     cô lập phiên, quản trị hợp đồng thuê và giới hạn phạm vi ủy quyền.
import { MultiAgentFederationUserStopError, MultiAgentFederationEmergencyStopError, MultiAgentFederationTenantIsolationError, MultiAgentFederationSessionIsolationError, MultiAgentFederationScopeViolationError, MultiAgentFederationLeaseError, } from './multiAgentFederationTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class FederationSecurityBoundary {
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
     * VI: Khẳng định cả USER_STOP và EMERGENCY_STOP đều không kích hoạt tại điểm kiểm tra quan trọng.
     */
    assertStopInactive(checkpoint, tenantId, federationId) {
        if (this.isEmergencyStopActive()) {
            throw new MultiAgentFederationEmergencyStopError(`EMERGENCY_STOP active at checkpoint '${checkpoint}' — immediate federation halt enforced`, tenantId, federationId);
        }
        if (this.isUserStopActive()) {
            throw new MultiAgentFederationUserStopError(`USER_STOP active at checkpoint '${checkpoint}' — immediate federation halt enforced`, tenantId, federationId);
        }
    }
    /**
     * EN: Asserts strict multi-tenant isolation across agent, federation, delegation, and lease.
     * VI: Khẳng định sự cô lập đa bên thuê nghiêm ngặt trên tác tử, liên đoàn, ủy quyền và hợp đồng thuê.
     */
    assertTenantIsolation(agentTenantId, federationTenantId, delegationTenantId, leaseTenantId) {
        if (agentTenantId !== federationTenantId) {
            throw new MultiAgentFederationTenantIsolationError(`Tenant mismatch: agent '${agentTenantId}' !== federation '${federationTenantId}'`, agentTenantId);
        }
        if (delegationTenantId && delegationTenantId !== federationTenantId) {
            throw new MultiAgentFederationTenantIsolationError(`Tenant mismatch: delegation '${delegationTenantId}' !== federation '${federationTenantId}'`, federationTenantId);
        }
        if (leaseTenantId && leaseTenantId !== federationTenantId) {
            throw new MultiAgentFederationTenantIsolationError(`Tenant mismatch: lease '${leaseTenantId}' !== federation '${federationTenantId}'`, federationTenantId);
        }
    }
    /**
     * EN: Asserts strict session isolation across agent, federation, and delegation.
     * VI: Khẳng định sự cô lập phiên nghiêm ngặt trên tác tử, liên đoàn và ủy quyền.
     */
    assertSessionIsolation(agentSessionId, federationSessionId, delegationSessionId) {
        if (agentSessionId !== federationSessionId) {
            throw new MultiAgentFederationSessionIsolationError(`Session mismatch: agent '${agentSessionId}' !== federation '${federationSessionId}'`);
        }
        if (delegationSessionId && delegationSessionId !== federationSessionId) {
            throw new MultiAgentFederationSessionIsolationError(`Session mismatch: delegation '${delegationSessionId}' !== federation '${federationSessionId}'`);
        }
    }
    /**
     * EN: Asserts delegation scope containment (delegate.scope subset of parent.scope).
     * VI: Khẳng định sự đóng kín phạm vi ủy quyền (delegate.scope là tập con của parent.scope).
     */
    assertScopeContainment(parentScope, delegateScope, tenantId, delegationId) {
        const parentSet = new Set(parentScope);
        for (const s of delegateScope) {
            if (!parentSet.has(s)) {
                throw new MultiAgentFederationScopeViolationError(`Delegation privilege escalation rejected: scope '${s}' is outside parent authority scope`, tenantId, undefined, delegationId);
            }
        }
    }
    /**
     * EN: Asserts lease coverage validity for a delegation.
     * VI: Khẳng định tính hợp lệ của bảo hiểm hợp đồng thuê cho ủy quyền.
     */
    assertValidLeaseBinding(leaseBinding, delegationExpiresAt, now = Date.now(), tenantId) {
        if (!leaseBinding) {
            return; // Optional lease binding
        }
        if (!leaseBinding.leaseId || !leaseBinding.leaseId.trim()) {
            throw new MultiAgentFederationLeaseError('Lease ID must be a non-empty string', tenantId);
        }
        if (leaseBinding.expiresAt <= now) {
            throw new MultiAgentFederationLeaseError(`Governing lease '${leaseBinding.leaseId}' is expired (expiresAt: ${leaseBinding.expiresAt}, now: ${now})`, tenantId);
        }
        if (delegationExpiresAt > leaseBinding.expiresAt) {
            throw new MultiAgentFederationLeaseError(`Delegation expiration (${delegationExpiresAt}) exceeds governing lease expiration (${leaseBinding.expiresAt})`, tenantId);
        }
    }
}
