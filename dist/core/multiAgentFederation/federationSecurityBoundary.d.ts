export type FederationCheckpoint = 'FEDERATION_ENTRY' | 'PRE_AGENT_REGISTRATION' | 'PRE_AGENT_AUTHORIZATION' | 'PRE_CAPABILITY_BINDING' | 'PRE_FEDERATION_CREATION' | 'PRE_AGENT_JOIN' | 'PRE_DELEGATION_CREATION' | 'POST_DELEGATION_CREATION' | 'PRE_DELEGATION_EXECUTION_HANDOFF' | 'PRE_FEDERATION_REASSESSMENT' | 'PRE_CONTINUITY_COMMIT' | 'PRE_PERSISTENCE' | 'POST_PERSISTENCE';
export interface SecurityBoundaryOptions {
    readonly userStopProvider?: () => boolean;
    readonly emergencyStopProvider?: () => boolean;
}
export declare class FederationSecurityBoundary {
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
    assertStopInactive(checkpoint: FederationCheckpoint, tenantId?: string, federationId?: string): void;
    /**
     * EN: Asserts strict multi-tenant isolation across agent, federation, delegation, and lease.
     * VI: Khẳng định sự cô lập đa bên thuê nghiêm ngặt trên tác tử, liên đoàn, ủy quyền và hợp đồng thuê.
     */
    assertTenantIsolation(agentTenantId: string, federationTenantId: string, delegationTenantId?: string, leaseTenantId?: string): void;
    /**
     * EN: Asserts strict session isolation across agent, federation, and delegation.
     * VI: Khẳng định sự cô lập phiên nghiêm ngặt trên tác tử, liên đoàn và ủy quyền.
     */
    assertSessionIsolation(agentSessionId: string, federationSessionId: string, delegationSessionId?: string): void;
    /**
     * EN: Asserts delegation scope containment (delegate.scope subset of parent.scope).
     * VI: Khẳng định sự đóng kín phạm vi ủy quyền (delegate.scope là tập con của parent.scope).
     */
    assertScopeContainment(parentScope: readonly string[], delegateScope: readonly string[], tenantId?: string, delegationId?: string): void;
    /**
     * EN: Asserts lease coverage validity for a delegation.
     * VI: Khẳng định tính hợp lệ của bảo hiểm hợp đồng thuê cho ủy quyền.
     */
    assertValidLeaseBinding(leaseBinding: {
        readonly leaseId: string;
        readonly expiresAt: number;
    } | undefined, delegationExpiresAt: number, now?: number, tenantId?: string): void;
}
