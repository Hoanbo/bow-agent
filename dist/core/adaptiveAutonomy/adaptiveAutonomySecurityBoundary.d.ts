export type AdaptiveAutonomyCheckpoint = 'session_entry' | 'pre_health_evaluation' | 'pre_recovery' | 'pre_adaptation' | 'pre_delegation' | 'post_delegation' | 'pre_continuity_commit' | 'pre_persistence' | 'post_persistence';
export interface SecurityBoundaryOptions {
    readonly userStopProvider?: () => boolean;
    readonly emergencyStopProvider?: () => boolean;
}
export declare class AdaptiveAutonomySecurityBoundary {
    private readonly userStopProvider?;
    private readonly emergencyStopProvider?;
    constructor(options?: SecurityBoundaryOptions);
    /**
     * EN: Checks if USER_STOP is active across human authority and local provider.
     * VI: Kiểm tra xem USER_STOP có đang kích hoạt trên thẩm quyền con người và nhà cung cấp cục bộ không.
     */
    isUserStopActive(): boolean;
    /**
     * EN: Checks if EMERGENCY_STOP is active.
     * VI: Kiểm tra xem EMERGENCY_STOP có đang kích hoạt không.
     */
    isEmergencyStopActive(): boolean;
    /**
     * EN: Asserts neither USER_STOP nor EMERGENCY_STOP is active at a critical checkpoint.
     * VI: Khẳng định cả USER_STOP và EMERGENCY_STOP đều không kích hoạt tại điểm kiểm soát quan trọng.
     */
    assertStopInactive(checkpoint: AdaptiveAutonomyCheckpoint, tenantId?: string, sessionId?: string): void;
    /**
     * EN: Asserts strict multi-tenant isolation across envelope, session, and lease.
     * VI: Khẳng định sự cô lập đa bên thuê nghiêm ngặt trên phong bì, phiên và hợp đồng thuê.
     */
    assertTenantIsolation(requestedTenant: string, expectedTenant: string, sessionId?: string): void;
    /**
     * EN: Asserts session identity matches active context.
     * VI: Khẳng định định danh phiên khớp với ngữ cảnh đang hoạt động.
     */
    assertSessionIsolation(requestedSession: string, activeSession: string, tenantId?: string): void;
    /**
     * EN: Asserts execution lease is active, unexpired, and matches tenant.
     * VI: Khẳng định hợp đồng thuê thực thi đang hoạt động, chưa hết hạn và khớp bên thuê.
     */
    assertLeaseValidity(lease: {
        leaseId: string;
        tenantId: string;
        expiresAt: number;
        isRevoked?: boolean;
    }, expectedTenant: string, sessionId?: string): void;
    /**
     * EN: Enforces scope firewalling — ensures proposed actions remain within original authorized scope.
     * VI: Thực thi tường lửa phạm vi — đảm bảo các hành động được đề xuất nằm trong phạm vi ủy quyền ban đầu.
     */
    assertScopeBound(proposedOperations: readonly string[], authorizedScope: readonly string[], tenantId?: string, sessionId?: string): void;
    /**
     * EN: Resolves a safe tenant partition directory preventing path traversal and null bytes.
     * VI: Giải quyết thư mục phân vùng an toàn của bên thuê ngăn chặn duyệt đường dẫn và byte rỗng.
     */
    resolveSafePartition(tenantId: string, baseDir: string): {
        partitionKey: string;
        partitionDir: string;
    };
}
