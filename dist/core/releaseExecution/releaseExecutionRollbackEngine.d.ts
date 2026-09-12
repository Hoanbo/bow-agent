import { type ReleaseExecutionTarget, type ReleaseExecutionRollbackBackup, type ReleaseExecutionManifest } from './releaseExecutionTypes.js';
export interface ExecuteReleaseRollbackInput {
    readonly target: ReleaseExecutionTarget;
    readonly backups: readonly ReleaseExecutionRollbackBackup[];
    readonly reason: string;
    readonly isUserStopActive?: boolean;
    readonly isRevoked?: boolean;
}
export interface ReleaseRollbackOutput {
    readonly restoredCount: number;
    readonly postRollbackManifest: ReleaseExecutionManifest;
}
export declare class ReleaseExecutionRollbackEngine {
    /**
     * Executes atomic restore from backups.
     * Thực thi khôi phục nguyên tử từ các bản sao lưu.
     */
    static rollback(input: ExecuteReleaseRollbackInput): ReleaseRollbackOutput;
}
