import { type AgentIdentity } from './delegationTypes.js';
export declare class AgentIdentityError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: string, message: string, details?: Record<string, unknown> | undefined);
}
export interface RegisterAgentInput {
    agentId: string;
    name: string;
    role: string;
    parentAgentId?: string;
    sessionId: string;
    ownerId?: string;
}
export declare class AgentIdentityManager {
    private agents;
    /**
     * Registers a new governed agent identity.
     * Strictly enforces separation of concerns from Master Owner.
     */
    registerAgent(input: RegisterAgentInput): AgentIdentity;
    getAgent(agentId: string): AgentIdentity | undefined;
    hasAgent(agentId: string): boolean;
    listAgentsForSession(sessionId: string): AgentIdentity[];
    unregisterAgent(agentId: string): boolean;
    clear(): void;
}
export declare const globalAgentIdentityManager: AgentIdentityManager;
