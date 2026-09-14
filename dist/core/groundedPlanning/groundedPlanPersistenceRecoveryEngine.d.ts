import { type GroundedPlanSessionDocument } from './groundedPlanTypes.js';
export interface PlanPersistenceOptions {
    readonly baseDirectory?: string;
    readonly userStopProvider?: () => boolean;
}
export declare class GroundedPlanPersistenceRecoveryEngine {
    private readonly baseDirectory;
    private readonly userStopProvider;
    constructor(options?: PlanPersistenceOptions);
    /**
     * EN: Resolves safe session directory under tenant partition.
     * VI: Giải quyết thư mục phiên an toàn dưới phân vùng bên thuê.
     */
    getSessionDir(tenantId: string, sessionId: string): string;
    /**
     * EN: Persists a plan session document atomically using crash-safe temporary file and backup snapshot.
     * VI: Lưu tài liệu phiên kế hoạch nguyên tử bằng tệp tạm thời an toàn sự cố và ảnh chụp sao lưu.
     */
    saveSessionDocument(doc: GroundedPlanSessionDocument, expectedVersion?: number): {
        writtenPath: string;
        bytesWritten: number;
    };
    /**
     * EN: Rehydrates a session document, automatically falling back to .bak if canonical is corrupt.
     * VI: Khôi phục tài liệu phiên, tự động chuyển về .bak nếu tệp chính tắc bị hỏng.
     */
    recoverSessionDocument(tenantId: string, sessionId: string): {
        document: GroundedPlanSessionDocument;
        recoveredFromBackup: boolean;
    };
    private verifyDocumentIntegrity;
    private sanitizeSessionId;
}
