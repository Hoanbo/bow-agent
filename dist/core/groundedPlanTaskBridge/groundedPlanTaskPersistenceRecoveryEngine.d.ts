import { type GroundedPlanTaskBinding, type GroundedPlanTaskSessionDocument } from './groundedPlanTaskTypes.js';
export interface GroundedPlanTaskPersistenceOptions {
    readonly baseDirectory?: string;
    readonly userStopProvider?: () => boolean;
}
export declare class GroundedPlanTaskPersistenceRecoveryEngine {
    private readonly baseDirectory;
    private readonly userStopProvider;
    constructor(options?: GroundedPlanTaskPersistenceOptions);
    /**
     * EN: Resolves the multi-tenant directory path for a session.
     * VI: Giải quyết đường dẫn thư mục đa bên thuê cho một phiên.
     */
    getSessionDir(tenantId: string, sessionId: string): string;
    /**
     * EN: Saves a GroundedPlanTaskBinding to the tenant session document atomically.
     * VI: Lưu một GroundedPlanTaskBinding vào tài liệu phiên bên thuê một cách nguyên tử.
     */
    saveBinding(binding: GroundedPlanTaskBinding, expectedVersion?: number): GroundedPlanTaskSessionDocument;
    /**
     * EN: Loads and verifies session document from canonical disk or .bak fallback.
     * VI: Tải và xác minh tài liệu phiên từ đĩa chuẩn tắc hoặc dự phòng .bak.
     */
    loadSessionDocument(tenantId: string, sessionId: string): GroundedPlanTaskSessionDocument;
    /**
     * EN: Performs atomic write sequence: .tmp -> .bak snapshot -> rename.
     * VI: Thực hiện chuỗi ghi nguyên tử: .tmp -> chụp ảnh .bak -> đổi tên.
     */
    private atomicWriteDocument;
    /**
     * EN: Recovers session document from .bak backup snapshot.
     * VI: Phục hồi tài liệu phiên từ ảnh sao lưu .bak.
     */
    private recoverFromBackup;
    /**
     * EN: Verifies SHA-256 provenance checksum of a session document.
     * VI: Xác minh tổng kiểm provenance SHA-256 của tài liệu phiên.
     */
    private verifyDocumentIntegrity;
}
