import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type PolicySnapshot, type PolicySnapshotId, type PolicyConfiguration } from './policyEvolutionTypes.js';
import type { ActionClassification } from '../policyDecisionPoint.js';
export declare const DEFAULT_BASELINE_CLASSIFICATIONS: Readonly<Record<string, ActionClassification>>;
export interface PolicyStoreRecord {
    readonly activeSnapshot: PolicySnapshot;
    readonly history: readonly PolicySnapshot[];
}
/**
 * Initial baseline factory generating nominal system policy configuration.
 * Nhà máy đường cơ sở ban đầu tạo cấu hình chính sách hệ thống danh nghĩa.
 */
export declare function createBaselinePolicyConfiguration(): PolicyConfiguration;
export declare class PolicySnapshotStore {
    private readonly baseDir;
    private readonly sanitizer;
    private readonly stores;
    constructor(options?: {
        readonly baseDir?: string;
        readonly sanitizer?: DiagnosisSanitizer;
    });
    /**
     * Resolves the isolated DurableJsonStore for the authenticated user partition.
     * Never bypasses UserPartitionResolver.
     * Giải quyết DurableJsonStore cô lập cho phân vùng người dùng đã xác thực.
     */
    private getStore;
    /**
     * Retrieves the currently active policy configuration for a user partition.
     * Lấy cấu hình chính sách hiện đang hoạt động cho một phân vùng người dùng.
     */
    getActiveConfiguration(userId?: string): PolicyConfiguration;
    /**
     * Retrieves the currently active snapshot object.
     * Lấy đối tượng bản chụp hiện đang hoạt động.
     */
    getActiveSnapshot(userId?: string): PolicySnapshot;
    /**
     * Creates and atomically commits a new policy configuration snapshot.
     * Moves existing active snapshot to historical version log.
     * Tạo và ghi nguyên tử một bản chụp cấu hình chính sách mới.
     * Chuyển bản chụp đang hoạt động hiện tại vào nhật ký phiên bản lịch sử.
     */
    commitSnapshot(newConfig: PolicyConfiguration, userId?: string): PolicySnapshot;
    /**
     * Rolls back the active policy configuration to a specific historical snapshot.
     * Hoàn tác cấu hình chính sách đang hoạt động về một bản chụp lịch sử cụ thể.
     */
    rollbackToSnapshot(targetSnapshotId: PolicySnapshotId, userId?: string): PolicySnapshot;
    /**
     * Bounded query for historical policy snapshots with pagination.
     * Truy vấn có giới hạn cho các bản chụp chính sách lịch sử với phân trang.
     */
    queryHistoricalSnapshots(options?: {
        limit?: number;
        cursor?: string;
    }, userId?: string): {
        snapshots: readonly PolicySnapshot[];
        nextCursor?: string;
        totalMatching: number;
    };
}
