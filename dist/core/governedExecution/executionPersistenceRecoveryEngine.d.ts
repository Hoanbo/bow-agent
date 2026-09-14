import { type GovernedExecutionSessionDocument } from './executionTypes.js';
export interface PersistenceEngineOptions {
    readonly baseDirectory?: string;
    readonly userStopProvider?: () => boolean;
}
export declare class ExecutionPersistenceRecoveryEngine {
    private readonly baseDirectory;
    private readonly userStopProvider;
    constructor(options?: PersistenceEngineOptions);
    /**
     * EN: Resolves safe session directory under tenant partition.
     * VI: Giải quyết thư mục phiên an toàn dưới phân vùng bên thuê.
     */
    getSessionDir(tenantId: string, sessionId: string): string;
    private sanitizeSessionId;
    /**
     * EN: Loads session document with automatic backup recovery upon corruption.
     * VI: Tải tài liệu phiên với khả năng phục hồi sao lưu tự động khi phát hiện tệp bị hỏng.
     */
    loadSessionDocument(tenantId: string, sessionId: string): GovernedExecutionSessionDocument;
    private loadAndValidateFile;
    createInitialDocument(tenantId: string, sessionId: string): GovernedExecutionSessionDocument;
    /**
     * EN: Atomically saves an execution session document with OCC version CAS validation.
     * VI: Lưu nguyên tử một tài liệu phiên thực thi với xác thực phiên bản OCC CAS.
     */
    saveSessionDocument(doc: GovernedExecutionSessionDocument, expectedVersion: number): GovernedExecutionSessionDocument;
}
