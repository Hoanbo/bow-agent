export type MissionCheckpoint = 'MISSION_ENTRY' | 'PRE_MISSION_VALIDATION' | 'PRE_OBJECTIVE_SELECTION' | 'POST_OBJECTIVE_SELECTION' | 'PRE_OBJECTIVE_DELEGATION' | 'POST_OBJECTIVE_DELEGATION' | 'PRE_MISSION_REASSESSMENT' | 'PRE_CONFLICT_RESOLUTION' | 'PRE_CONTINUITY_COMMIT' | 'PRE_PERSISTENCE' | 'POST_PERSISTENCE';
export interface SecurityBoundaryOptions {
    readonly userStopProvider?: () => boolean;
    readonly emergencyStopProvider?: () => boolean;
}
export declare class MissionGovernanceSecurityBoundary {
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
     * VI: Khẳng định cả USER_STOP và EMERGENCY_STOP đều không kích hoạt tại điểm kiểm tra quan trọng.
     */
    assertStopInactive(checkpoint: MissionCheckpoint, tenantId?: string, missionId?: string): void;
    /**
     * EN: Asserts strict multi-tenant isolation across mission, objective, session, and lease.
     * VI: Khẳng định sự cô lập đa bên thuê nghiêm ngặt trên sứ mệnh, mục tiêu, phiên và hợp đồng thuê.
     */
    assertTenantIsolation(requestedTenant: string, expectedTenant: string, missionId?: string): void;
    /**
     * EN: Asserts session identity matches active mission session.
     * VI: Khẳng định định danh phiên khớp với phiên sứ mệnh đang hoạt động.
     */
    assertSessionIsolation(requestedSession: string, activeSession: string, tenantId?: string, missionId?: string): void;
    /**
     * EN: Asserts execution lease is active, unexpired, non-revoked, and matches tenant/session.
     * VI: Khẳng định hợp đồng thuê thực thi đang hoạt động, chưa hết hạn, chưa bị thu hồi và khớp bên thuê/phiên.
     */
    assertLeaseValidity(lease: {
        leaseId: string;
        tenantId: string;
        sessionId?: string;
        expiresAt: number;
        isRevoked?: boolean;
    }, expectedTenant: string, expectedSession?: string, missionId?: string): void;
    /**
     * EN: Enforces scope firewalling — ensures proposed operations remain within authorized scope.
     * VI: Thực thi tường lửa phạm vi — đảm bảo các hành động được đề xuất nằm trong phạm vi ủy quyền.
     */
    assertScopeBound(requestedOperations: readonly string[], authorizedScope: readonly string[], tenantId?: string, missionId?: string): void;
    /**
     * EN: Resolves safe tenant partition directory, preventing path traversal and null bytes.
     * VI: Giải quyết thư mục phân vùng bên thuê an toàn, ngăn chặn duyệt đường dẫn và byte rỗng.
     */
    resolveSafePartition(tenantId: string, baseDir: string): {
        partitionKey: string;
        partitionDir: string;
    };
}
