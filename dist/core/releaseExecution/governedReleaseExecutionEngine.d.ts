import { type ReleaseExecutionRequest, type ReleaseExecutionApprovalBinding, type ReleaseExecutionRollbackBackup } from './releaseExecutionTypes.js';
import type { ReleaseCandidate } from '../release/releaseTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import { ReleaseExecutionAuthorizationBridge } from './releaseExecutionAuthorizationBridge.js';
export interface ExecuteReleaseMutationInput {
    readonly request: ReleaseExecutionRequest;
    readonly candidate: ReleaseCandidate;
    readonly approval: ReleaseExecutionApprovalBinding;
    readonly token: AuthorizationToken;
    readonly sourceFiles?: readonly {
        readonly relativePath: string;
        readonly content: string | Buffer;
    }[];
    readonly sourceDirectory?: string;
    readonly isUserStopActive?: boolean;
    readonly isRevoked?: boolean;
}
export interface ReleaseMutationOutput {
    readonly preExecutionManifestHash: string;
    readonly filesMutated: readonly string[];
    readonly backups: readonly ReleaseExecutionRollbackBackup[];
}
export declare class GovernedReleaseExecutionEngine {
    private readonly authBridge;
    constructor(authBridge: ReleaseExecutionAuthorizationBridge);
    /**
     * Governed execution boundary for release mutation.
     * Ranh giới thực thi có quản trị cho đột biến phát hành.
     */
    executeRelease(input: ExecuteReleaseMutationInput): ReleaseMutationOutput;
}
