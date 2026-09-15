// src/core/multiAgentFederation/agentCapabilityRegistry.ts
// BOWCON V4.0 — MS-1.5.14: NATIVE GOVERNED MULTI-AGENT FEDERATION, DELEGATION & COLLABORATIVE COORDINATION ENGINE
// Component 1111 — REAL
//
// EN: Agent capability registry tracking bounded capabilities per agent (max 20).
//     Strictly enforces that capability registration does NOT grant execution authority.
// VI: Sổ đăng ký năng lực tác tử theo dõi các năng lực có giới hạn cho mỗi tác tử (tối đa 20).
//     Thực thi nghiêm ngặt rằng việc đăng ký năng lực KHÔNG cấp quyền thực thi.
import { MAX_CAPABILITIES_PER_AGENT, MultiAgentFederationValidationError, MultiAgentFederationBudgetError, computeAgentCapabilityHash, } from './multiAgentFederationTypes.js';
export class AgentCapabilityRegistry {
    capabilities = new Map();
    agentCapabilities = new Map();
    /**
     * EN: Registers a bounded capability for an already-governed agent.
     * VI: Đăng ký một năng lực có giới hạn cho một tác tử đã được quản trị.
     */
    registerCapability(agent, capabilityData) {
        const existing = this.agentCapabilities.get(agent.agentId) ?? new Set();
        if (existing.size >= MAX_CAPABILITIES_PER_AGENT) {
            throw new MultiAgentFederationBudgetError(`Agent '${agent.agentId}' reached MAX_CAPABILITIES_PER_AGENT (${MAX_CAPABILITIES_PER_AGENT})`, agent.tenantId, undefined, agent.agentId);
        }
        if (this.capabilities.has(capabilityData.capabilityId)) {
            throw new MultiAgentFederationValidationError(`Capability with ID '${capabilityData.capabilityId}' already exists`, agent.tenantId, undefined, agent.agentId);
        }
        if (!capabilityData.scope || capabilityData.scope.length === 0) {
            throw new MultiAgentFederationValidationError('Capability must define a non-empty scope', agent.tenantId, undefined, agent.agentId);
        }
        // Assert capability scope is a subset of agent authorization scope
        const agentScopeSet = new Set(agent.authorizationBinding.scope);
        for (const s of capabilityData.scope) {
            if (!agentScopeSet.has(s)) {
                throw new MultiAgentFederationValidationError(`Capability scope '${s}' exceeds agent authorization scope`, agent.tenantId, undefined, agent.agentId);
            }
        }
        // Assert capability expiration does not exceed agent authorization
        if (capabilityData.expiresAt > agent.authorizationBinding.expiresAt) {
            throw new MultiAgentFederationValidationError(`Capability expiration (${capabilityData.expiresAt}) exceeds agent authorization expiration (${agent.authorizationBinding.expiresAt})`, agent.tenantId, undefined, agent.agentId);
        }
        const capBase = {
            capabilityId: capabilityData.capabilityId,
            agentId: agent.agentId,
            capabilityType: capabilityData.capabilityType,
            scope: capabilityData.scope,
            riskTier: capabilityData.riskTier,
            generation: capabilityData.generation,
            validFrom: capabilityData.validFrom,
            expiresAt: capabilityData.expiresAt,
        };
        const provenanceHash = computeAgentCapabilityHash(capBase);
        const capability = {
            ...capBase,
            provenanceHash,
        };
        this.capabilities.set(capability.capabilityId, capability);
        existing.add(capability.capabilityId);
        this.agentCapabilities.set(agent.agentId, existing);
        return capability;
    }
    getCapability(capabilityId) {
        return this.capabilities.get(capabilityId);
    }
    getAgentCapabilities(agentId) {
        const ids = this.agentCapabilities.get(agentId);
        if (!ids)
            return [];
        return Array.from(ids)
            .map((id) => this.capabilities.get(id))
            .filter(Boolean);
    }
    /**
     * EN: Checks if an agent possesses a valid, non-expired capability covering the required scope.
     * VI: Kiểm tra xem tác tử có sở hữu năng lực hợp lệ, chưa hết hạn bao trùm phạm vi yêu cầu hay không.
     */
    hasCapabilityForScope(agentId, requiredScope, now = Date.now()) {
        const caps = this.getAgentCapabilities(agentId);
        return caps.some((c) => c.validFrom <= now && c.expiresAt > now && c.scope.includes(requiredScope));
    }
}
