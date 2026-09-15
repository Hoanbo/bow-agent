export type SecurityCheckpointName = 'multi_step_entry' | 'pre_step_authorization' | 'pre_lease_acquisition' | 'pre_dispatch' | 'post_step_return' | 'pre_checkpoint' | 'pre_replan' | 'pre_generation_commit' | 'pre_persistence';
export declare class MultiStepExecutionSecurityBoundary {
    private readonly userStopProvider;
    constructor(options?: {
        readonly userStopProvider?: () => boolean;
    });
    /**
     * EN: Synchronously asserts USER_STOP at an exact lifecycle checkpoint.
     * VI: Khẳng định đồng bộ USER_STOP tại một điểm kiểm tra vòng đời chính xác.
     */
    assertUserStop(checkpoint: SecurityCheckpointName): void;
    /**
     * EN: Asserts strict tenant and session isolation across operations.
     * VI: Khẳng định sự cô lập nghiêm ngặt giữa các bên thuê và phiên làm việc.
     */
    assertIsolation(expectedTenantId: string, expectedSessionId: string, actualTenantId: string, actualSessionId: string): void;
    /**
     * EN: Sanitizes arbitrary objects or payloads before persistence or audit logging.
     * VI: Khử trùng các đối tượng hoặc tải trọng tùy ý trước khi lưu trữ hoặc ghi nhật ký kiểm toán.
     */
    sanitizePayload<T>(payload: T): T;
    private scrubString;
    private deepScrub;
}
