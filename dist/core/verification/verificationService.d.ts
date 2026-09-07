import type { VerificationRequest, VerificationResult } from './verificationTypes.js';
export declare class VerificationService {
    private readonly historyStore;
    /**
     * EN: Returns the partition key for multi-tenant user/session scoping.
     * VI: Trả về khóa phân vùng để định phạm vi user/session multi-tenant.
     */
    private getPartitionKey;
    /**
     * EN: Evaluates an authoritative verification request and produces an immutable outcome.
     * VI: Đánh giá một yêu cầu xác minh có thẩm quyền và tạo ra kết quả bất biến.
     */
    verify(request: VerificationRequest): Readonly<VerificationResult>;
    /**
     * EN: Retrieves immutable verification history for a given user and session.
     * VI: Truy xuất lịch sử xác minh bất biến cho user và phiên cụ thể.
     */
    getHistory(userId: string, sessionId: string): readonly VerificationResult[];
    /**
     * EN: Clears verification audit history for a specified session.
     * VI: Xóa lịch sử kiểm toán xác minh cho phiên được chỉ định.
     */
    clearSession(userId: string, sessionId: string): void;
}
