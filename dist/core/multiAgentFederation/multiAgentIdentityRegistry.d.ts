import { GovernedAgent, AgentStatus } from './multiAgentFederationTypes.js';
export declare class MultiAgentIdentityRegistry {
    private readonly agents;
    /**
     * EN: Validates untrusted agent registration input for prototype pollution, traversal, and format.
     * VI: Xác thực đầu vào đăng ký tác tử chưa tin cậy về prototype pollution, traversal và định dạng.
     */
    validateAgentInput(input: unknown): void;
    private assertValidIdentifier;
    /**
     * EN: Registers a new governed agent identity.
     * VI: Đăng ký một danh tính tác tử có quản trị mới.
     */
    registerAgent(params: Omit<GovernedAgent, 'provenanceHash' | 'createdAt' | 'updatedAt' | 'capabilities' | 'trustProfile' | 'status'> & {
        readonly status?: AgentStatus;
    }): GovernedAgent;
    getAgent(agentId: string): GovernedAgent | undefined;
    hasAgent(agentId: string): boolean;
    getAgentsByTenant(tenantId: string): readonly GovernedAgent[];
    /**
     * EN: Asserts an agent exists, is active, and matches expected tenant and session boundaries.
     * VI: Khẳng định một tác tử tồn tại, đang hoạt động và khớp với ranh giới bên thuê và phiên dự kiến.
     */
    assertAgentBoundaries(agentId: string, expectedTenantId: string, expectedSessionId: string): GovernedAgent;
    /**
     * EN: Updates agent status monotonically.
     * VI: Cập nhật trạng thái tác tử một cách đơn điệu.
     */
    updateAgentStatus(agentId: string, newStatus: AgentStatus): GovernedAgent;
    /**
     * EN: Updates agent trust profile.
     * VI: Cập nhật hồ sơ độ tin cậy của tác tử.
     */
    updateAgentTrust(agentId: string, trustProfile: GovernedAgent['trustProfile']): GovernedAgent;
}
