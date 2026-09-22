export declare const BodyProtocolErrorCode: {
    /** Thể xác (Body) bị ngắt kết nối hoặc mất kết nối đột ngột */
    readonly BODY_DISCONNECTED: "BODY_DISCONNECTED";
    /** Body chủ động hoặc bị yêu cầu gỡ đăng ký thủ công */
    readonly MANUAL_UNREGISTER: "MANUAL_UNREGISTER";
    /** Quá thời hạn không nhận được heartbeat ping từ Body */
    readonly HEARTBEAT_TIMEOUT: "HEARTBEAT_TIMEOUT";
    /** Không tìm thấy Body khả dụng cung cấp năng lực yêu cầu */
    readonly NO_BODY_AVAILABLE: "NO_BODY_AVAILABLE";
    /** Lệnh điều phối xuống Body bị quá thời gian chờ phản hồi */
    readonly COMMAND_TIMEOUT: "COMMAND_TIMEOUT";
    /** Lệnh bị hủy chủ động trước khi hoàn tất */
    readonly COMMAND_ABORTED: "COMMAND_ABORTED";
    /** Lỗi khi gửi lệnh xuống Body ngoại vi */
    readonly COMMAND_DISPATCH_FAILED: "COMMAND_DISPATCH_FAILED";
    /** BodyRegistry đã dừng hoạt động */
    readonly REGISTRY_STOPPED: "REGISTRY_STOPPED";
    /** Khóa chứng chỉ TLS không khớp (cảnh báo tấn công MITM) */
    readonly CERTIFICATE_MISMATCH: "CERTIFICATE_MISMATCH";
    /** Không tìm thấy công cụ OpenSSL để tạo chứng chỉ TLS */
    readonly OPENSSL_NOT_FOUND: "OPENSSL_NOT_FOUND";
    /** Pre-Shared Key (PSK) không hợp lệ khi bắt tay xác thực */
    readonly INVALID_PSK: "INVALID_PSK";
    /** Thiếu tham số xác thực Pre-Shared Key */
    readonly MISSING_PSK: "MISSING_PSK";
    /** Người dùng không bấm phím xác nhận vật lý Push-to-Talk trong thời hạn */
    readonly USER_DID_NOT_CONFIRM: "USER_DID_NOT_CONFIRM";
    /** Chỉ báo quyền riêng tư vật lý (khay hệ thống) không sẵn sàng */
    readonly PRIVACY_INDICATOR_UNAVAILABLE: "PRIVACY_INDICATOR_UNAVAILABLE";
    /** Phương thức chỉ dành cho test bị gọi ngoài môi trường test */
    readonly TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV: "TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV";
};
export type BodyProtocolErrorCode = (typeof BodyProtocolErrorCode)[keyof typeof BodyProtocolErrorCode];
