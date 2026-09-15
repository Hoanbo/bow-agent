import { CollaborationContext } from './federatedCollaborationMemoryTypes.js';
import { CollaborationContextRegistry } from './collaborationContextRegistry.js';
import { CollaborationMemorySecurityBoundary } from './collaborationMemorySecurityBoundary.js';
export interface UpdateSharedContextParams {
    readonly contextId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly agentId: string;
    readonly expectedVersion: number;
    readonly key: string;
    readonly value: unknown;
}
export declare class GovernedSharedContextEngine {
    private readonly contextRegistry;
    private readonly securityBoundary;
    private readonly sharedStates;
    constructor(options?: {
        readonly contextRegistry?: CollaborationContextRegistry;
        readonly securityBoundary?: CollaborationMemorySecurityBoundary;
    });
    getRegistry(): CollaborationContextRegistry;
    getSecurityBoundary(): CollaborationMemorySecurityBoundary;
    /**
     * EN: Reads a key from shared context with security and boundary assertion.
     * VI: Đọc một khóa từ ngữ cảnh chia sẻ với khẳng định bảo mật và ranh giới.
     */
    getSharedValue(contextId: string, key: string, tenantId: string, sessionId: string, agentId: string): unknown;
    /**
     * EN: Updates a key in the shared context enforcing OCC and boundaries.
     * VI: Cập nhật một khóa trong ngữ cảnh chia sẻ, thực thi OCC và các ranh giới.
     */
    updateSharedValue(params: UpdateSharedContextParams): CollaborationContext;
    /**
     * EN: Returns the full snapshot of shared state for authorized agent.
     * VI: Trả về ảnh chụp đầy đủ của trạng thái chia sẻ cho tác tử được ủy quyền.
     */
    getAllSharedValues(contextId: string, tenantId: string, sessionId: string, agentId: string): Readonly<Record<string, unknown>>;
}
