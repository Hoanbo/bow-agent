import { type SandboxDescriptor, type SandboxEntry, type SandboxFileOperation } from './sandboxTypes.js';
import { SandboxPolicyEngine } from './sandboxPolicyEngine.js';
export interface FileOperationContext {
    readonly sessionId: string;
    readonly taskId: string;
    readonly agentId: string;
    readonly deviceId: string;
}
export declare class SandboxFilesystemEngine {
    private readonly policyEngine;
    private stagedChanges;
    constructor(policyEngine: SandboxPolicyEngine);
    /**
     * Scans content to prevent accidental persistence of credentials, tokens, or private keys.
     * Quét nội dung để ngăn chặn việc vô tình lưu giữ thông tin xác thực, token hoặc khóa riêng tư.
     */
    private assertNoForbiddenCredentials;
    /**
     * Calculates SHA-256 hash of a file string content.
     * Tính toán mã băm SHA-256 cho nội dung chuỗi của tệp.
     */
    static hashContent(content: string): string;
    /**
     * Initializes staging tracking map for a given sandbox.
     * Khởi tạo bản đồ theo dõi tạm thời (staging) cho một sandbox nhất định.
     */
    private getStagingMap;
    /**
     * Computes file count and total size within the sandbox root without triggering LIST policy validation.
     * Tính toán số lượng tệp và tổng kích thước trong thư mục gốc sandbox mà không kích hoạt xác thực chính sách LIST.
     */
    private getSandboxMetrics;
    /**
     * Creates a new file inside the governed sandbox.
     * Tạo một tệp mới bên trong sandbox được quản trị.
     */
    createFile(sandbox: SandboxDescriptor, relativePath: string, content: string, context: FileOperationContext): SandboxFileOperation;
    /**
     * Reads content of an existing file within the sandbox.
     * Đọc nội dung của một tệp hiện có bên trong sandbox.
     */
    readFile(sandbox: SandboxDescriptor, relativePath: string, context: FileOperationContext): string;
    /**
     * Updates content of an existing file within the sandbox.
     * Cập nhật nội dung của một tệp hiện có bên trong sandbox.
     */
    updateFile(sandbox: SandboxDescriptor, relativePath: string, content: string, context: FileOperationContext): SandboxFileOperation;
    /**
     * Renames a file within the sandbox boundary.
     * Đổi tên một tệp bên trong ranh giới sandbox.
     */
    renameFile(sandbox: SandboxDescriptor, oldRelativePath: string, newRelativePath: string, context: FileOperationContext): SandboxFileOperation;
    /**
     * Deletes a file within the sandbox boundary.
     * Xóa một tệp bên trong ranh giới sandbox.
     */
    deleteFile(sandbox: SandboxDescriptor, relativePath: string, context: FileOperationContext): SandboxFileOperation;
    /**
     * Lists all files recursively inside a relative directory within the sandbox.
     * Liệt kê đệ quy tất cả các tệp bên trong một thư mục tương đối thuộc sandbox.
     */
    listFiles(sandbox: SandboxDescriptor, relativeDir: string | undefined, context: FileOperationContext): SandboxEntry[];
    /**
     * Retrieves file stat information inside the sandbox.
     * Lấy thông tin thống kê stat của tệp bên trong sandbox.
     */
    statFile(sandbox: SandboxDescriptor, relativePath: string, context: FileOperationContext): SandboxEntry;
    /**
     * Retrieves staged changes for a sandbox.
     * Lấy danh sách các thay đổi tạm thời của một sandbox.
     */
    getStagedChanges(sandboxId: string): Map<string, {
        originalContent?: string;
        currentContent?: string;
    }>;
    /**
     * Clears staging tracking for a sandbox.
     * Xóa theo dõi staging cho một sandbox.
     */
    clearStaging(sandboxId: string): void;
}
