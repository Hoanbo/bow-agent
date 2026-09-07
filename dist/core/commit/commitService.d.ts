import type { CommitRequest, CommitResult } from './commitTypes.js';
export declare class CommitService {
    private readonly historyStore;
    private readonly commitIndex;
    /**
     * EN: Returns the partition key for multi-tenant user/session scoping.
     * VI: Trả về khóa phân vùng để định phạm vi user/session multi-tenant.
     */
    private getPartitionKey;
    /**
     * EN: Computes a hash string representing the semantic operations payload.
     * VI: Tính toán chuỗi băm đại diện cho payload thao tác ngữ nghĩa.
     */
    private computeOperationsHash;
    /**
     * EN: Prepares, validates, and executes an atomic durable state commit.
     * VI: Chuẩn bị, xác thực và thực thi commit trạng thái nguyên tử bền vững.
     */
    commit(request: CommitRequest): Readonly<CommitResult>;
    /**
     * EN: Retrieves immutable commit history for a given user and session.
     * VI: Truy xuất lịch sử commit bất biến cho user và phiên cụ thể.
     */
    getHistory(userId: string, sessionId: string): readonly CommitResult[];
    /**
     * EN: Clears commit audit history for a specified session.
     * VI: Xóa lịch sử kiểm toán commit cho phiên được chỉ định.
     */
    clearSession(userId: string, sessionId: string): void;
}
