import { type MultiStepExecutionSessionDocument, type MultiStepExecutionSession } from './multiStepExecutionTypes.js';
export interface PersistenceEngineOptions {
    readonly baseDirectory?: string;
    readonly userStopProvider?: () => boolean;
}
export declare class MultiStepExecutionPersistenceRecoveryEngine {
    private readonly baseDirectory;
    private readonly userStopProvider;
    private readonly securityBoundary;
    constructor(options?: PersistenceEngineOptions);
    /**
     * EN: Resolves safe session directory under tenant partition.
     * VI: Giải quyết thư mục phiên an toàn dưới phân vùng bên thuê.
     */
    getSessionDir(tenantId: string, sessionId: string): string;
    private sanitizeSessionId;
    /**
     * EN: Loads session document from disk, recovering from .bak if canonical is corrupt.
     * VI: Tải tài liệu phiên từ đĩa, phục hồi từ .bak nếu tệp chính tắc bị hỏng.
     */
    loadSessionDocument(tenantId: string, sessionId: string): MultiStepExecutionSessionDocument;
    /**
     * EN: Checks if a session document exists on disk.
     * VI: Kiểm tra xem tài liệu phiên có tồn tại trên đĩa không.
     */
    hasSessionDocument(tenantId: string, sessionId: string): boolean;
    /**
     * EN: Saves session document atomically with OCC CAS enforcement (.tmp -> .bak -> rename).
     * VI: Lưu tài liệu phiên nguyên tử với thực thi OCC CAS (.tmp -> .bak -> đổi tên).
     */
    saveSessionDocument(doc: MultiStepExecutionSessionDocument, expectedVersion?: number): void;
    /**
     * EN: Creates and atomically persists an initial session document.
     * VI: Tạo và lưu trữ nguyên tử tài liệu phiên ban đầu.
     */
    initializeSession(session: MultiStepExecutionSession): MultiStepExecutionSessionDocument;
}
