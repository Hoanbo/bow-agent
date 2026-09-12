import { type DeploymentId, type DeploymentTarget, type DeploymentBackupEntry, type DeploymentRollbackRecord } from './deploymentTypes.js';
export interface ExecuteDeploymentRollbackInput {
    readonly deploymentId: DeploymentId;
    readonly target: DeploymentTarget;
    readonly deployedFiles: readonly string[];
    readonly backups: readonly DeploymentBackupEntry[];
    readonly expectedPreManifestHash: string;
    readonly reason: string;
    readonly isUserStopActive?: boolean;
    readonly isRevoked?: boolean;
}
export declare class DeploymentRollbackEngine {
    /**
     * Asserts that a target path does not touch the protected workspace C:\BOW\shopofbow.
     * Khẳng định rằng đường dẫn mục tiêu không chạm vào không gian làm việc được bảo vệ C:\BOW\shopofbow.
     */
    assertProtectedWorkspaceIsolation(targetPath: string): void;
    /**
     * Computes a deterministic SHA-256 tree manifest for files in a directory.
     * Tính toán mã băm cây biểu kê SHA-256 xác định cho các tệp trong một thư mục.
     */
    computeDirectoryManifest(dirPath: string): {
        readonly files: readonly {
            readonly relativePath: string;
            readonly sha256: string;
        }[];
        readonly manifestHash: string;
    };
    /**
     * Executes governed rollback of target directory to the verified pre-deployment state.
     * Thực thi hoàn nguyên có quản trị của thư mục mục tiêu về trạng thái trước triển khai đã được xác minh.
     */
    executeRollback(input: ExecuteDeploymentRollbackInput): DeploymentRollbackRecord;
}
