import { CollaborationCheckpoint } from './federatedCollaborationMemoryTypes.js';
export declare class CollaborationMemorySecurityBoundary {
    private emergencyStopActive;
    private userStopActive;
    /**
     * EN: Signals or clears EMERGENCY_STOP.
     * VI: Bật hoặc tắt trạng thái EMERGENCY_STOP.
     */
    setEmergencyStop(active: boolean): void;
    isEmergencyStopActive(): boolean;
    /**
     * EN: Signals or clears USER_STOP.
     * VI: Bật hoặc tắt trạng thái USER_STOP.
     */
    setUserStop(active: boolean): void;
    isUserStopActive(): boolean;
    /**
     * EN: Synchronously validates safety gates at a critical checkpoint.
     * VI: Xác thực đồng bộ các cổng an toàn tại một điểm kiểm tra trọng yếu.
     */
    assertStopInactive(checkpoint: CollaborationCheckpoint, tenantId?: string, contextId?: string): void;
    /**
     * EN: Validates tenant identifier and prevents path traversal & reserved Windows names.
     * VI: Xác thực mã định danh tenant và ngăn chặn duyệt đường dẫn cùng các tên dành riêng Windows.
     */
    assertTenantSafe(tenantId: string): void;
    /**
     * EN: Asserts session isolation.
     * VI: Khẳng định cô lập phiên.
     */
    assertSessionSafe(sessionId: string): void;
    /**
     * EN: Asserts tenant matching across all related entities.
     * VI: Khẳng định sự khớp tenant trên tất cả các thực thể liên quan.
     */
    assertTenantIsolation(primaryTenantId: string, ...otherTenantIds: string[]): void;
    /**
     * EN: Asserts session matching across all related entities.
     * VI: Khẳng định sự khớp phiên trên tất cả các thực thể liên quan.
     */
    assertSessionIsolation(primarySessionId: string, ...otherSessionIds: string[]): void;
}
