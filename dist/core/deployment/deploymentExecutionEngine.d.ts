import { type DeploymentRequest, type DeploymentCandidate, type DeploymentBackupEntry, type RolloutRingLevel } from './deploymentTypes.js';
import { WorldActionAuthorizationEngine } from '../world-action/worldActionAuthorization.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
export interface ExecuteDeploymentMutationInput {
    readonly request: DeploymentRequest;
    readonly candidate: DeploymentCandidate;
    readonly token: AuthorizationToken;
    readonly targetRing: RolloutRingLevel;
    readonly isUserStopActive: boolean;
    readonly isRevoked: boolean;
    readonly backupDir: string;
}
export interface DeploymentMutationResult {
    readonly deployedFiles: readonly string[];
    readonly backups: readonly DeploymentBackupEntry[];
    readonly preDeploymentManifestHash: string;
    readonly postDeploymentManifestHash: string;
    readonly executedAt: number;
}
export declare class DeploymentExecutionEngine {
    private readonly authEngine;
    private consumedTokenIds;
    constructor(authEngine?: WorldActionAuthorizationEngine);
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
     * Validates and consumes a single-use authorization token.
     * Xác thực và tiêu thụ một mã ủy quyền sử dụng một lần.
     */
    consumeToken(token: AuthorizationToken, request: DeploymentRequest): void;
    /**
     * Executes governed deployment mutation to the authorized target directory.
     * Thực thi thay đổi triển khai có quản trị vào thư mục mục tiêu được ủy quyền.
     */
    executeMutation(input: ExecuteDeploymentMutationInput): DeploymentMutationResult;
}
