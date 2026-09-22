export declare const CERTS_DIR: string;
export declare const CA_KEY_PATH: string;
export declare const CA_CRT_PATH: string;
export declare const CA_FINGERPRINT_PATH: string;
export declare const SERVER_KEY_PATH: string;
export declare const SERVER_CSR_PATH: string;
export declare const SERVER_CRT_PATH: string;
export declare const SERVER_EXT_PATH: string;
export declare const SERVER_FINGERPRINT_PATH: string;
export interface TlsCertificatePaths {
    caCertPath: string;
    caKeyPath: string;
    serverCertPath: string;
    serverKeyPath: string;
    caFingerprint: string;
    serverFingerprint: string;
}
/**
 * Tìm đường dẫn thực thi của OpenSSL trên hệ thống Windows/Linux/macOS
 */
export declare function findOpenSslBinary(): string;
/**
 * Tính toán SHA-256 fingerprint của certificate X509 (chuỗi hex viết hoa cách nhau bởi dấu hai chấm)
 */
export declare function calculateCertFingerprint(certPem: string): string;
/**
 * Khởi tạo hoặc nạp các chứng chỉ TLS (Internal CA và Machine A Server Certificate).
 * Nếu chứng chỉ chưa có hoặc được yêu cầu `forceRenew`, hệ thống sẽ tự sinh tự động.
 */
export declare function ensureTlsCertificates(options?: {
    hosts?: string[];
    forceRenew?: boolean;
}): TlsCertificatePaths;
/**
 * Trả về đường dẫn tới Root CA Certificate
 */
export declare function getCaCertPath(): string;
/**
 * Trả về SHA-256 fingerprint của Root CA Certificate
 */
export declare function getCaFingerprint(): string;
/**
 * Trả về SHA-256 fingerprint của Server Certificate
 */
export declare function getServerFingerprint(): string;
