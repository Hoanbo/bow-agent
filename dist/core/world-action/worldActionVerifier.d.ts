import type { WorldAction, ActionExecutionResult, ActionVerificationResult } from './worldActionTypes.js';
export declare class WorldActionVerifier {
    /**
     * Independently verifies the real physical effect of a filesystem write.
     */
    static verifyFsWrite(action: WorldAction, execResult: ActionExecutionResult): Promise<ActionVerificationResult>;
    /**
     * Independently verifies the real physical effect of a filesystem append.
     */
    static verifyFsAppend(action: WorldAction, execResult: ActionExecutionResult): Promise<ActionVerificationResult>;
    /**
     * Independently verifies directory creation.
     */
    static verifyFsMkdir(action: WorldAction, execResult: ActionExecutionResult): Promise<ActionVerificationResult>;
    /**
     * Independently verifies file rename / move.
     */
    static verifyFsRename(action: WorldAction, execResult: ActionExecutionResult): Promise<ActionVerificationResult>;
    /**
     * Independently verifies file deletion.
     */
    static verifyFsDelete(action: WorldAction, execResult: ActionExecutionResult): Promise<ActionVerificationResult>;
    /**
     * Independently verifies process start.
     */
    static verifyProcessStart(action: WorldAction, execResult: ActionExecutionResult): Promise<ActionVerificationResult>;
    /**
     * Independently verifies process stop.
     */
    static verifyProcessStop(action: WorldAction, execResult: ActionExecutionResult): Promise<ActionVerificationResult>;
    /**
     * Generic observation verifier.
     */
    static verifyObservation(action: WorldAction, execResult: ActionExecutionResult): Promise<ActionVerificationResult>;
}
