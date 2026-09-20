// src/core/bodyProtocol/errorCodes.ts
// BOWCON V4.0 — CENTRALIZED ERROR CODES FOR BODY PROTOCOL & HARDWARE GOVERNANCE
//
// EN:
// Authoritative error code constants for Body Protocol, WebSocket connectivity,
// Push-to-Talk confirmation, and hardware privacy governance.
// Guarantees type safety and eliminates accidental string typos.
//
// VI:
// Mã lỗi chuẩn hóa tập trung cho Body Protocol, kết nối WebSocket,
// xác nhận Push-to-Talk và quản trị an toàn phần cứng.
// Đảm bảo an toàn kiểu dữ liệu (type safety), chống gõ sai chuỗi lỗi.

export const BodyProtocolErrorCode = {
  /** Thể xác (Body) bị ngắt kết nối hoặc mất kết nối đột ngột */
  BODY_DISCONNECTED: 'BODY_DISCONNECTED',

  /** Body chủ động hoặc bị yêu cầu gỡ đăng ký thủ công */
  MANUAL_UNREGISTER: 'MANUAL_UNREGISTER',

  /** Quá thời hạn không nhận được heartbeat ping từ Body */
  HEARTBEAT_TIMEOUT: 'HEARTBEAT_TIMEOUT',

  /** Không tìm thấy Body khả dụng cung cấp năng lực yêu cầu */
  NO_BODY_AVAILABLE: 'NO_BODY_AVAILABLE',

  /** Lệnh điều phối xuống Body bị quá thời gian chờ phản hồi */
  COMMAND_TIMEOUT: 'COMMAND_TIMEOUT',

  /** Lệnh bị hủy chủ động trước khi hoàn tất */
  COMMAND_ABORTED: 'COMMAND_ABORTED',

  /** Lỗi khi gửi lệnh xuống Body ngoại vi */
  COMMAND_DISPATCH_FAILED: 'COMMAND_DISPATCH_FAILED',

  /** BodyRegistry đã dừng hoạt động */
  REGISTRY_STOPPED: 'REGISTRY_STOPPED',

  /** Khóa chứng chỉ TLS không khớp (cảnh báo tấn công MITM) */
  CERTIFICATE_MISMATCH: 'CERTIFICATE_MISMATCH',

  /** Không tìm thấy công cụ OpenSSL để tạo chứng chỉ TLS */
  OPENSSL_NOT_FOUND: 'OPENSSL_NOT_FOUND',

  /** Pre-Shared Key (PSK) không hợp lệ khi bắt tay xác thực */
  INVALID_PSK: 'INVALID_PSK',

  /** Thiếu tham số xác thực Pre-Shared Key */
  MISSING_PSK: 'MISSING_PSK',

  /** Người dùng không bấm phím xác nhận vật lý Push-to-Talk trong thời hạn */
  USER_DID_NOT_CONFIRM: 'USER_DID_NOT_CONFIRM',

  /** Chỉ báo quyền riêng tư vật lý (khay hệ thống) không sẵn sàng */
  PRIVACY_INDICATOR_UNAVAILABLE: 'PRIVACY_INDICATOR_UNAVAILABLE',

  /** Phương thức chỉ dành cho test bị gọi ngoài môi trường test */
  TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV: 'TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV',
} as const;

export type BodyProtocolErrorCode = (typeof BodyProtocolErrorCode)[keyof typeof BodyProtocolErrorCode];
