// src/core/multiAgentFederation/governedDelegationEngine.ts
// BOWCON V4.0 — MS-1.5.14: NATIVE GOVERNED MULTI-AGENT FEDERATION, DELEGATION & COLLABORATIVE COORDINATION ENGINE
// Component 1112 — REAL
//
// EN: Governed delegation engine managing controlled delegation envelopes between agents.
//     Enforces delegation depth (<= 5), scope containment, lifetime ceilings, and zero privilege escalation.
// VI: Động cơ ủy quyền có quản trị quản lý các phong bì ủy quyền được kiểm soát giữa các tác tử.
//     Thực thi độ sâu ủy quyền (<= 5), sự đóng kín phạm vi, trần thời gian sống và không leo thang đặc quyền.
import { MAX_DELEGATION_DEPTH, MAX_DELEGATIONS_PER_FEDERATION, MultiAgentFederationDelegationError, MultiAgentFederationBudgetError, computeDelegationBindingHash, } from './multiAgentFederationTypes.js';
import { FederationSecurityBoundary } from './federationSecurityBoundary.js';
import { DelegationConflictResolver } from './delegationConflictResolver.js';
import { AgentTrustGovernanceEngine } from './agentTrustGovernanceEngine.js';
export class GovernedDelegationEngine {
    securityBoundary;
    conflictResolver;
    trustEngine;
    activeDelegations = new Map();
    constructor(options) {
        this.securityBoundary = options?.securityBoundary ?? new FederationSecurityBoundary();
        this.conflictResolver = options?.conflictResolver ?? new DelegationConflictResolver();
        this.trustEngine = options?.trustEngine ?? new AgentTrustGovernanceEngine();
    }
    /**
     * EN: Creates and binds a new governed delegation from parent to delegate agent.
     * VI: Tạo và liên kết một ủy quyền có quản trị mới từ tác tử cha sang tác tử được ủy quyền.
     */
    createDelegation(params) {
        // 1. Checkpoint: PRE_DELEGATION_CREATION
        this.securityBoundary.assertStopInactive('PRE_DELEGATION_CREATION', params.parentAgent.tenantId, params.missionId);
        // 2. Multi-tenant and session isolation
        this.securityBoundary.assertTenantIsolation(params.parentAgent.tenantId, params.delegateAgent.tenantId);
        this.securityBoundary.assertSessionIsolation(params.parentAgent.sessionId, params.delegateAgent.sessionId);
        // 3. Delegation capacity check
        if (this.activeDelegations.size >= MAX_DELEGATIONS_PER_FEDERATION) {
            throw new MultiAgentFederationBudgetError(`Reached MAX_DELEGATIONS_PER_FEDERATION (${MAX_DELEGATIONS_PER_FEDERATION})`, params.parentAgent.tenantId, undefined, params.parentAgent.agentId);
        }
        // 4. Depth calculation and boundary check
        const currentDepth = (params.parentDepth ?? 0) + 1;
        if (currentDepth > MAX_DELEGATION_DEPTH) {
            throw new MultiAgentFederationDelegationError(`Delegation depth ${currentDepth} exceeds MAX_DELEGATION_DEPTH (${MAX_DELEGATION_DEPTH})`, params.parentAgent.tenantId, undefined, params.delegateAgent.agentId);
        }
        // 5. Scope containment (delegate.scope subset of parent.scope)
        this.securityBoundary.assertScopeContainment(params.parentAgent.authorizationBinding.scope, params.scope, params.parentAgent.tenantId, params.delegationId);
        // 6. Lifetime containment (delegation.expiresAt <= parent.authorization.expiresAt)
        if (params.expiresAt > params.parentAgent.authorizationBinding.expiresAt) {
            throw new MultiAgentFederationDelegationError(`Delegation expiration (${params.expiresAt}) exceeds parent authorization expiration (${params.parentAgent.authorizationBinding.expiresAt})`, params.parentAgent.tenantId, undefined, params.delegateAgent.agentId);
        }
        // 7. Lease validation if present
        this.securityBoundary.assertValidLeaseBinding(params.parentAgent.leaseBinding, params.expiresAt, Date.now(), params.parentAgent.tenantId);
        // 8. Trust sufficiency
        this.trustEngine.assertTrustSufficiency(params.delegateAgent, params.riskTier, currentDepth);
        const delegationBase = {
            delegationId: params.delegationId,
            parentAgentId: params.parentAgent.agentId,
            delegateAgentId: params.delegateAgent.agentId,
            tenantId: params.parentAgent.tenantId,
            sessionId: params.parentAgent.sessionId,
            missionId: params.missionId,
            objectiveId: params.objectiveId,
            scope: params.scope,
            authorizationBinding: {
                envelopeId: params.parentAgent.authorizationBinding.envelopeId,
                scope: params.scope,
                expiresAt: params.expiresAt,
            },
            leaseBinding: params.parentAgent.leaseBinding,
            riskTier: params.riskTier,
            generation: params.parentAgent.generation,
            depth: currentDepth,
            expiresAt: params.expiresAt,
            status: 'ACTIVE',
        };
        const provenanceHash = computeDelegationBindingHash(delegationBase);
        const delegation = {
            ...delegationBase,
            provenanceHash,
        };
        // 9. Conflict detection
        const conflicts = this.conflictResolver.detectConflicts(delegation, Array.from(this.activeDelegations.values()));
        const unresolvable = conflicts.filter((c) => !c.isResolvable);
        if (unresolvable.length > 0) {
            throw new MultiAgentFederationDelegationError(`Cannot create delegation due to unresolvable conflict: ${unresolvable[0].description}`, delegation.tenantId, undefined, delegation.delegateAgentId);
        }
        // 10. Checkpoint: POST_DELEGATION_CREATION
        this.securityBoundary.assertStopInactive('POST_DELEGATION_CREATION', delegation.tenantId, delegation.missionId);
        this.activeDelegations.set(delegation.delegationId, delegation);
        return delegation;
    }
    getDelegation(delegationId) {
        return this.activeDelegations.get(delegationId);
    }
    getActiveDelegations() {
        return Array.from(this.activeDelegations.values()).filter((d) => d.status === 'ACTIVE');
    }
    /**
     * EN: Updates delegation status.
     * VI: Cập nhật trạng thái ủy quyền.
     */
    updateDelegationStatus(delegationId, newStatus) {
        const d = this.activeDelegations.get(delegationId);
        if (!d) {
            throw new MultiAgentFederationDelegationError(`Delegation '${delegationId}' not found`);
        }
        const updatedBase = {
            ...d,
            status: newStatus,
        };
        const provenanceHash = computeDelegationBindingHash(updatedBase);
        const updated = {
            ...updatedBase,
            provenanceHash,
        };
        this.activeDelegations.set(delegationId, updated);
        return updated;
    }
}
