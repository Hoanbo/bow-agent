import { CollaborationContext, CollaborationContextStatus, CollaborationAuthorizationBinding, CollaborationLeaseBinding } from './federatedCollaborationMemoryTypes.js';
export interface RegisterCollaborationContextParams {
    readonly contextId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly federationId: string;
    readonly participatingAgentIds: readonly string[];
    readonly leaderAgentId: string;
    readonly generation: number;
    readonly authorizationBinding: CollaborationAuthorizationBinding;
    readonly leaseBinding?: CollaborationLeaseBinding;
    readonly metadata?: Record<string, unknown>;
}
export declare class CollaborationContextRegistry {
    private readonly contexts;
    /**
     * EN: Validates untrusted metadata against prototype pollution and prompt injection patterns.
     * VI: Xác thực siêu dữ liệu không tin cậy chống lại ô nhiễm nguyên mẫu và các mẫu tiêm nhiễm prompt.
     */
    validateUntrustedMetadata(metadata?: Record<string, unknown>): void;
    /**
     * EN: Registers a new governed collaboration context.
     * VI: Đăng ký một ngữ cảnh hợp tác có quản trị mới.
     */
    registerContext(params: RegisterCollaborationContextParams): CollaborationContext;
    /**
     * EN: Retrieves an existing collaboration context by ID.
     * VI: Lấy ngữ cảnh hợp tác hiện có theo mã định danh.
     */
    getContext(contextId: string): CollaborationContext | undefined;
    /**
     * EN: Asserts boundary matches between caller and context.
     * VI: Khẳng định sự khớp ranh giới giữa bên gọi và ngữ cảnh.
     */
    assertContextBoundaries(contextId: string, tenantId: string, sessionId: string): CollaborationContext;
    /**
     * EN: Transitions context status with strict validation.
     * VI: Chuyển đổi trạng thái ngữ cảnh với xác thực nghiêm ngặt.
     */
    updateContextStatus(contextId: string, newStatus: CollaborationContextStatus, tenantId: string, sessionId: string): CollaborationContext;
    /**
     * EN: Lists all contexts for a given tenant and session.
     * VI: Liệt kê tất cả các ngữ cảnh cho một tenant và phiên cụ thể.
     */
    listContextsForSession(tenantId: string, sessionId: string): readonly CollaborationContext[];
    /**
     * EN: Clears in-memory registry (for testing or isolation resets).
     * VI: Xóa sổ đăng ký trong bộ nhớ (dùng cho kiểm thử hoặc đặt lại cô lập).
     */
    clear(): void;
}
