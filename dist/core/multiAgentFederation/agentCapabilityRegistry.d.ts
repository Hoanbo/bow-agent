import { AgentCapability, GovernedAgent } from './multiAgentFederationTypes.js';
export declare class AgentCapabilityRegistry {
    private readonly capabilities;
    private readonly agentCapabilities;
    /**
     * EN: Registers a bounded capability for an already-governed agent.
     * VI: Đăng ký một năng lực có giới hạn cho một tác tử đã được quản trị.
     */
    registerCapability(agent: GovernedAgent, capabilityData: Omit<AgentCapability, 'provenanceHash' | 'agentId'>): AgentCapability;
    getCapability(capabilityId: string): AgentCapability | undefined;
    getAgentCapabilities(agentId: string): readonly AgentCapability[];
    /**
     * EN: Checks if an agent possesses a valid, non-expired capability covering the required scope.
     * VI: Kiểm tra xem tác tử có sở hữu năng lực hợp lệ, chưa hết hạn bao trùm phạm vi yêu cầu hay không.
     */
    hasCapabilityForScope(agentId: string, requiredScope: string, now?: number): boolean;
}
