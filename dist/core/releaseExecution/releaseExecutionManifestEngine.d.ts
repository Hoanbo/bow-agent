import { type ReleaseExecutionManifest } from './releaseExecutionTypes.js';
export declare class ReleaseExecutionManifestEngine {
    /**
     * Scans a target directory and computes a deterministic SHA-256 manifest.
     * Quét một thư mục mục tiêu và tính toán bản kê khai SHA-256 tất định.
     */
    static scanDirectory(dirPath: string): ReleaseExecutionManifest;
    /**
     * Compares two manifests and returns true if they match identically.
     * So sánh hai bản kê khai và trả về true nếu chúng khớp hoàn toàn.
     */
    static compareManifests(a: ReleaseExecutionManifest, b: ReleaseExecutionManifest): {
        readonly isIdentical: boolean;
        readonly addedFiles: readonly string[];
        readonly removedFiles: readonly string[];
        readonly modifiedFiles: readonly string[];
    };
}
