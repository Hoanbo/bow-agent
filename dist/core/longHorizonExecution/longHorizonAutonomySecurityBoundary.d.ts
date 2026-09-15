import { type GovernedLongHorizonObjective } from './longHorizonExecutionTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export type LongHorizonCheckpointName = 'long_horizon_entry' | 'pre_objective_resume' | 'pre_generation_start' | 'pre_step_authorization' | 'pre_lease' | 'pre_dispatch' | 'post_dispatch' | 'pre_progress_commit' | 'pre_replan' | 'pre_generation_commit' | 'pre_persistence';
export declare class LongHorizonAutonomySecurityBoundary {
    private readonly userStopProvider;
    constructor(options?: {
        readonly userStopProvider?: () => boolean;
    });
    /**
     * EN: Synchronously asserts USER_STOP at an exact long-horizon lifecycle checkpoint.
     * VI: Khẳng định đồng bộ USER_STOP tại một điểm kiểm tra vòng đời tầm nhìn dài chính xác.
     */
    assertUserStop(checkpoint: LongHorizonCheckpointName): void;
    assertUserStopInactive(checkpoint: LongHorizonCheckpointName): void;
    /**
     * EN: Asserts strict tenant and session isolation across operations.
     * VI: Khẳng định sự cô lập nghiêm ngặt giữa các bên thuê và phiên làm việc.
     */
    assertIsolation(expectedTenantId: string, expectedSessionId: string, actualTenantId: string, actualSessionId: string): void;
    enforceTenantSessionIsolation(expectedTenantId: string, expectedSessionId: string, actualTenantId: string, actualSessionId: string): void;
    enforceObjectiveScope(objective: GovernedLongHorizonObjective, requestedScope: string[]): void;
    quarantineUntrustedText(text: string): string;
    isQuarantined(text: string): boolean;
    sanitizeSecrets<T>(payload: T): T;
    /**
     * EN: Resolves safe user partition directory preventing directory traversal attacks.
     * VI: Phân giải thư mục phân vùng người dùng an toàn, ngăn chặn tấn công duyệt thư mục.
     */
    resolveSafePartition(tenantId: string, baseDir: string): ReturnType<typeof resolveUserPartition>;
    /**
     * EN: Sanitizes arbitrary objects or payloads before persistence or audit logging.
     * VI: Khử trùng các đối tượng hoặc tải trọng tùy ý trước khi lưu trữ hoặc ghi nhật ký kiểm toán.
     */
    sanitizePayload<T>(payload: T): T;
    private scrubString;
    private deepScrub;
}
export declare const globalLongHorizonSecurityBoundary: LongHorizonAutonomySecurityBoundary;
