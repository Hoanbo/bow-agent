/**
 * EN: Authoritative verification status classification.
 * VI: Phân loại trạng thái xác minh có thẩm quyền.
 */
export type VerificationStatus = 'VERIFIED' | 'FAILED' | 'UNKNOWN' | 'INCONCLUSIVE' | 'NOT_VERIFIABLE';
export type GovernedVerificationStatus = VerificationStatus;
/**
 * EN: Checks if a verification status indicates verified task success.
 * VI: Kiểm tra xem trạng thái xác minh có biểu thị tác vụ đã thành công hay không.
 */
export declare function isVerificationSuccessful(status: VerificationStatus): boolean;
/**
 * EN: Checks if a verification status is conclusive/terminal.
 * VI: Kiểm tra xem trạng thái xác minh đã dứt khoát/kết thúc hay chưa.
 */
export declare function isVerificationTerminal(status: VerificationStatus): boolean;
