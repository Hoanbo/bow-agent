import type { RecoveryRequest, RecoveryResult } from './recoveryTypes.js';
/**
 * EN: Authoritative recovery service for the BOWCON Brain.
 * VI: Dịch vụ phục hồi có thẩm quyền cho BOWCON Brain.
 */
export declare class RecoveryService {
    private readonly journals;
    private readonly lastResults;
    private getPartitionKey;
    private getOrCreateJournal;
    /**
     * EN: Executes post-crash recovery inspection, state reconstruction, and safety classification.
     * VI: Thực thi kiểm tra phục hồi sau sự cố, tái thiết lập trạng thái và phân loại an toàn.
     */
    recover(request: RecoveryRequest): Promise<RecoveryResult>;
    /**
     * EN: Retrieves the most recent recovery result for a specific user and session.
     * VI: Lấy kết quả phục hồi gần đây nhất cho một người dùng và phiên cụ thể.
     */
    getLastRecoveryResult(userId: string, sessionId: string): RecoveryResult | undefined;
    /**
     * EN: Returns the immutable recovery journal for a specific user and session.
     * VI: Trả về nhật ký phục hồi bất biến cho một người dùng và phiên cụ thể.
     */
    getJournal(userId: string, sessionId: string): readonly import('./recoveryTypes.js').RecoveryJournalRecord[];
    /**
     * EN: Resets recovery state and journal for a specific user and session.
     * VI: Đặt lại trạng thái phục hồi và nhật ký cho một người dùng và phiên cụ thể.
     */
    resetSessionRecovery(userId: string, sessionId: string): void;
}
