import { type LongHorizonSession, type LongHorizonSessionDocument } from './longHorizonExecutionTypes.js';
export interface PersistenceEngineOptions {
    readonly baseDirectory?: string;
    readonly userStopProvider?: () => boolean;
}
export declare class LongHorizonPersistenceRecoveryEngine {
    private readonly baseDirectory;
    private readonly securityBoundary;
    constructor(options?: PersistenceEngineOptions);
    getSessionDir(tenantId: string, sessionId: string): string;
    private sanitizeSessionId;
    /**
     * EN: Loads session document from disk, recovering from .bak if canonical is corrupt.
     * VI: Tải tài liệu phiên từ đĩa, phục hồi từ .bak nếu tệp chính tắc bị hỏng.
     */
    loadSessionDocument(tenantId: string, sessionId: string): LongHorizonSessionDocument & {
        version: number;
        sessionId: string;
        tenantId: string;
    };
    /**
     * EN: Checks if a session document exists on disk.
     * VI: Kiểm tra xem tài liệu phiên có tồn tại trên đĩa không.
     */
    hasSessionDocument(tenantId: string, sessionId: string): boolean;
    /**
     * EN: Saves session document atomically with OCC CAS enforcement (.tmp -> .bak -> rename).
     * VI: Lưu tài liệu phiên nguyên tử với thực thi OCC CAS (.tmp -> .bak -> đổi tên).
     */
    saveSessionDocument(doc: LongHorizonSessionDocument, expectedVersion?: number): void;
    /**
     * EN: Persists session or document directly with full OCC support.
     * VI: Lưu trực tiếp phiên hoặc tài liệu với hỗ trợ OCC đầy đủ.
     */
    persistSessionDocument(sessionOrDoc: any, expectedVersion?: number): void;
    /**
     * EN: Initializes a brand new session document on disk.
     * VI: Khởi tạo một tài liệu phiên hoàn toàn mới trên đĩa.
     */
    initializeSession(session: LongHorizonSession): LongHorizonSessionDocument;
}
