export declare class DiagnosisSanitizer {
    private static readonly SECRET_KEY_PATTERNS;
    private static readonly STRING_REDACTION_PATTERNS;
    /**
     * Sanitizes a string, replacing all credential patterns with deterministic redaction markers.
     * Làm sạch một chuỗi, thay thế tất cả các mẫu thông tin đăng nhập bằng dấu hiệu làm sạch xác định.
     */
    sanitizeString(input: string): string;
    /**
     * Deeply sanitizes any object, array, or primitive without mutating the original input.
     * Returns a fresh, sanitized clone.
     * Làm sạch sâu bất kỳ đối tượng, mảng hoặc kiểu nguyên thủy nào mà không làm đột biến dữ liệu gốc.
     * Trả về bản sao sạch mới.
     */
    sanitize<T>(input: T): T;
}
export declare const globalDiagnosisSanitizer: DiagnosisSanitizer;
