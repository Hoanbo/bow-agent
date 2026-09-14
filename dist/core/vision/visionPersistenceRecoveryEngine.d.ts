import { type VisualSessionDocument } from './visionTypes.js';
export interface VisionPersistenceOptions {
    readonly baseDir?: string;
    readonly userStopProvider?: () => boolean;
}
export declare class VisionPersistenceRecoveryEngine {
    private readonly baseDir;
    private readonly userStopProvider;
    constructor(options?: VisionPersistenceOptions);
    /**
     * EN: Resolves isolated directory for a specific tenant and session.
     * VI: Xác định thư mục cô lập cho một khách thuê và phiên cụ thể.
     */
    getSessionDir(tenantId: string, sessionId: string): string;
    /**
     * EN: Creates a new VisualSessionDocument in initial state.
     * VI: Tạo tài liệu VisualSessionDocument mới ở trạng thái khởi tạo.
     */
    createSessionDocument(tenantId: string, sessionId: string): VisualSessionDocument;
    /**
     * EN: Crash-safe atomic persistence: serialize -> write .tmp -> validate -> snapshot .bak -> atomic rename.
     * VI: Lưu trữ nguyên tử an toàn trước sự cố: tuần tự hóa -> ghi .tmp -> xác thực -> chụp .bak -> đổi tên nguyên tử.
     */
    saveSessionDocument(doc: VisualSessionDocument, expectedVersion?: number, activeTenantId?: string): void;
    /**
     * EN: Loads a visual session document from disk with SHA-256 provenance verification and .bak recovery.
     * VI: Tải tài liệu phiên thị giác từ đĩa với xác minh nguồn gốc SHA-256 và phục hồi từ .bak.
     */
    loadSessionDocument(sessionId: string, tenantId: string): VisualSessionDocument;
    /**
     * EN: Deletes session partition files for cleanup.
     * VI: Xóa các tệp phân vùng phiên để dọn dẹp.
     */
    deleteSessionDocument(sessionId: string, tenantId: string): void;
    private sanitizeFileName;
}
export declare const globalVisionPersistenceRecoveryEngine: VisionPersistenceRecoveryEngine;
