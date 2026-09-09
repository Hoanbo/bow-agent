// src/core/delegation/agentIdentityManager.ts
// BOWCON V4.0 — MS-1.3.45: AGENT IDENTITY & GOVERNED REGISTRATION
//
// INVARIANTS:
// - AGENT_ID != MASTER_OWNER_ID
// - No agent may claim Master Owner authority.
// - No agent may create a second Master Owner.
// - Agents are session-isolated.

import {
  MASTER_OWNER_ID,
  AUTHORIZED_MASTER_OWNER_ALIASES,
  isMasterOwner,
  type AgentIdentity,
} from './delegationTypes.js';

export class AgentIdentityError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'AgentIdentityError';
  }
}

export interface RegisterAgentInput {
  agentId: string;
  name: string;
  role: string;
  parentAgentId?: string;
  sessionId: string;
  ownerId?: string;
}

export class AgentIdentityManager {
  private agents = new Map<string, AgentIdentity>();

  /**
   * Registers a new governed agent identity.
   * Strictly enforces separation of concerns from Master Owner.
   */
  public registerAgent(input: RegisterAgentInput): AgentIdentity {
    const rawId = input.agentId.trim();
    const normalized = rawId.toLowerCase();

    // 1. Invariant: AGENT_ID != MASTER_OWNER_ID
    if (
      normalized === MASTER_OWNER_ID.toLowerCase() ||
      AUTHORIZED_MASTER_OWNER_ALIASES.some((alias) => alias.toLowerCase() === normalized) ||
      isMasterOwner(rawId)
    ) {
      throw new AgentIdentityError(
        'FORBIDDEN_OWNER_IDENTITY_IMPERSONATION',
        `Agent cannot be registered with Master Owner identity or alias: "${rawId}". AGENT != MASTER_OWNER.`
      );
    }

    if (!input.sessionId || !input.sessionId.trim()) {
      throw new AgentIdentityError(
        'SESSION_REQUIRED',
        'Agent identity must be bound to an explicit sessionId.'
      );
    }

    if (this.agents.has(rawId)) {
      throw new AgentIdentityError(
        'AGENT_ALREADY_REGISTERED',
        `Agent with ID "${rawId}" is already registered.`
      );
    }

    const identity: AgentIdentity = {
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

  public getAgent(agentId: string): AgentIdentity | undefined {
    return this.agents.get(agentId);
  }

  public hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  public listAgentsForSession(sessionId: string): AgentIdentity[] {
    return Array.from(this.agents.values()).filter((a) => a.sessionId === sessionId);
  }

  public unregisterAgent(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  public clear(): void {
    this.agents.clear();
  }
}

export const globalAgentIdentityManager = new AgentIdentityManager();
