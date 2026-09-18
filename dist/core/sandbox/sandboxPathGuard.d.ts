export declare class SandboxPathGuard {
    /**
     * Asserts that a path string does not reference or target protected paths from configuration.
     * Khẳng định rằng chuỗi đường dẫn không tham chiếu hoặc nhắm tới đường dẫn được bảo vệ từ cấu hình.
     */
    static assertNotProtectedWorkspace(rawPath: string): void;
    /**
     * Validates and canonicalizes a relative or nested path within a designated sandbox root.
     * Returns the safe normalized relative path and the absolute contained path.
     *
     * Xác thực và chuẩn hóa đường dẫn tương đối hoặc lồng nhau bên trong thư mục gốc sandbox được chỉ định.
     * Trả về đường dẫn tương đối an toàn đã chuẩn hóa và đường dẫn tuyệt đối được chứa bên trong.
     */
    static resolveAndAssertContainedPath(sandboxRoot: string, rawRelativePath: string): {
        relativePath: string;
        absolutePath: string;
    };
}
