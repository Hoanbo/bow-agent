import { FederatedKnowledgeCheckpoint } from './GovernedFederatedKnowledgeStateTypes.js';
export declare class FederatedKnowledgeSecurityBoundary {
    private emergencyStopActive;
    private userStopActive;
    setEmergencyStop(active: boolean): void;
    isEmergencyStopActive(): boolean;
    setUserStop(active: boolean): void;
    isUserStopActive(): boolean;
    /**
     * EN: Synchronously asserts safety gates across all 15 critical checkpoints.
     * VI: Khẳng định đồng bộ các cổng an toàn qua toàn bộ 15 điểm kiểm tra trọng yếu.
     */
    assertStopInactive(checkpoint: FederatedKnowledgeCheckpoint, tenantId?: string, stateId?: string): void;
    /**
     * EN: Validates tenant identifier and prevents path traversal & reserved Windows names.
     * VI: Xác thực mã định danh tenant và ngăn chặn duyệt đường dẫn cùng các tên dành riêng Windows.
     */
    assertTenantSafe(tenantId: string): void;
    /**
     * EN: Asserts session isolation safety.
     * VI: Khẳng định an toàn cô lập phiên.
     */
    assertSessionSafe(sessionId: string): void;
    /**
     * EN: Asserts matching tenant identifiers across entities.
     * VI: Khẳng định các mã định danh tenant khớp nhau giữa các thực thể.
     */
    assertTenantIsolation(primaryTenantId: string, ...otherTenantIds: string[]): void;
    /**
     * EN: Asserts matching session identifiers across entities.
     * VI: Khẳng định các mã định danh phiên khớp nhau giữa các thực thể.
     */
    assertSessionIsolation(primarySessionId: string, ...otherSessionIds: string[]): void;
}
