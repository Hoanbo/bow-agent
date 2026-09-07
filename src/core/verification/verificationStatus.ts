// src/core/verification/verificationStatus.ts
// BOWCON V4.0 — MILESTONE 1.3.14: VERIFICATION STATUS
//
// EN:
// Authoritative definitions for verification status and classification predicates.
// Enforces clear distinction between Execution Success and Task Success.
//
// VI:
// Định nghĩa có thẩm quyền cho trạng thái xác minh và các vị từ phân loại.
// Thực thi sự phân biệt rõ ràng giữa Thành công Thực thi và Thành công Tác vụ.

/**
 * EN: Authoritative verification status classification.
 * VI: Phân loại trạng thái xác minh có thẩm quyền.
 */
export type VerificationStatus =
  | 'VERIFIED'
  | 'FAILED'
  | 'UNKNOWN'
  | 'INCONCLUSIVE'
  | 'NOT_VERIFIABLE';

export type GovernedVerificationStatus = VerificationStatus;

/**
 * EN: Checks if a verification status indicates verified task success.
 * VI: Kiểm tra xem trạng thái xác minh có biểu thị tác vụ đã thành công hay không.
 */
export function isVerificationSuccessful(status: VerificationStatus): boolean {
  return status === 'VERIFIED';
}

/**
 * EN: Checks if a verification status is conclusive/terminal.
 * VI: Kiểm tra xem trạng thái xác minh đã dứt khoát/kết thúc hay chưa.
 */
export function isVerificationTerminal(status: VerificationStatus): boolean {
  return status === 'VERIFIED' || status === 'FAILED' || status === 'NOT_VERIFIABLE';
}
