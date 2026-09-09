// src/core/delegation/agentIdentityManager.ts
// BOWCON V4.0 — MS-1.3.45: AGENT IDENTITY & GOVERNED REGISTRATION
//
// INVARIANTS:
// - AGENT_ID != MASTER_OWNER_ID
// - No agent may claim Master Owner authority.
// - No agent may create a second Master Owner.
// - Agents are session-isolated.
import { MASTER_OWNER_ID, AUTHORIZED_MASTER_OWNER_ALIASES, isMasterOwner, } from './delegationTypes.js';
export class AgentIdentityError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'AgentIdentityError';
    }
}
export class AgentIdentityManager {
    agents = new Map();
    /**
     * Registers a new governed agent identity.
     * Strictly enforces separation of concerns from Master Owner.
     */
    registerAgent(input) {
        const rawId = input.agentId.trim();
        const normalized = rawId.toLowerCase();
        // 1. Invariant: AGENT_ID != MASTER_OWNER_ID
        if (normalized === MASTER_OWNER_ID.toLowerCase() ||
            AUTHORIZED_MASTER_OWNER_ALIASES.some((alias) => alias.toLowerCase() === normalized) ||
            isMasterOwner(rawId)) {
            throw new AgentIdentityError('FORBIDDEN_OWNER_IDENTITY_IMPERSONATION', `Agent cannot be registered with Master Owner identity or alias: "${rawId}". AGENT != MASTER_OWNER.`);
        }
        if (!input.sessionId || !input.sessionId.trim()) {
            throw new AgentIdentityError('SESSION_REQUIRED', 'Agent identity must be bound to an explicit sessionId.');
        }
        if (this.agents.has(rawId)) {
            throw new AgentIdentityError('AGENT_ALREADY_REGISTERED', `Agent with ID "${rawId}" is already registered.`);
        }
        const identity = {
            agentId: rawId,
            name: input.name.trim(),
            role: input.role.trim(),
            parentAgentId: input.parentAgentId?.trim(),
            sessionId: input.sessionId.trim(),
            ownerId: input.ownerId?.trim() || MASTER_OWNER_ID,
            createdAt: Date.now(),
            isMasterOwner: false,
        };
        this.agents.set(rawId, identity);
        return identity;
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    hasAgent(agentId) {
        return this.agents.has(agentId);
    }
    listAgentsForSession(sessionId) {
        return Array.from(this.agents.values()).filter((a) => a.sessionId === sessionId);
    }
    unregisterAgent(agentId) {
        return this.agents.delete(agentId);
    }
    clear() {
        this.agents.clear();
    }
}
export const globalAgentIdentityManager = new AgentIdentityManager();
