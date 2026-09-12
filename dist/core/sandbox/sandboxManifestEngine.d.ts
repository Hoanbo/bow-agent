import { type SandboxDescriptor, type SandboxEntry, type SandboxManifest } from './sandboxTypes.js';
import { SandboxFilesystemEngine, type FileOperationContext } from './sandboxFilesystemEngine.js';
export declare class SandboxManifestEngine {
    private readonly fsEngine;
    constructor(fsEngine: SandboxFilesystemEngine);
    /**
     * Directly scans an authorized directory (with strict protected workspace rejection) and returns sorted entries.
     * Quét trực tiếp một thư mục được phép (với việc từ chối nghiêm ngặt không gian làm việc được bảo vệ) và trả về các mục đã sắp xếp.
     */
    static scanProjectDirectory(projectRoot: string): SandboxEntry[];
    /**
     * Calculates deterministic SHA-256 hash for a manifest's sorted entries.
     * Tính toán mã băm SHA-256 tất định cho các mục kê khai đã sắp xếp.
     */
    static calculateManifestHash(entries: readonly SandboxEntry[]): string;
    /**
     * Generates a deterministic filesystem manifest for an isolated sandbox.
     * Tạo bảng kê khai hệ thống tệp tất định cho một sandbox cô lập.
     */
    generateManifest(sandbox: SandboxDescriptor, context: FileOperationContext): SandboxManifest;
    /**
     * Verifies mathematical and cryptographic integrity of a manifest.
     * Xác minh tính toàn vẹn toán học và mật mã học của một bảng kê khai.
     */
    verifyManifestIntegrity(manifest: SandboxManifest): boolean;
}
