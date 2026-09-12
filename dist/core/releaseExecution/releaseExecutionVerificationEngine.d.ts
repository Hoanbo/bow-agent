import { type ReleaseExecutionTarget, type ReleaseExecutionManifest } from './releaseExecutionTypes.js';
export interface VerifyReleaseTargetInput {
    readonly target: ReleaseExecutionTarget;
    readonly expectedFiles: readonly string[];
    readonly preManifestHash: string;
}
export interface PostReleaseVerificationOutput {
    readonly passed: boolean;
    readonly postManifest: ReleaseExecutionManifest;
    readonly verifiedFiles: readonly string[];
    readonly failureReasons: readonly string[];
}
export declare class ReleaseExecutionVerificationEngine {
    /**
     * Verifies the target project post-mutation state.
     * Xác minh trạng thái sau đột biến của dự án mục tiêu.
     */
    static verifyPostExecution(input: VerifyReleaseTargetInput): PostReleaseVerificationOutput;
}
