import type { WorldAction, ActionExecutionResult } from './worldActionTypes.js';
/**
 * Validates and normalizes target filesystem paths.
 * Enforces workspace confinement and protected boundary isolation.
 */
export declare function validateAndResolvePath(targetPath: string): string;
export declare class WorldActionExecutor {
    static executeFsWrite(action: WorldAction): Promise<ActionExecutionResult>;
    static executeFsRead(action: WorldAction): Promise<ActionExecutionResult>;
    static executeFsAppend(action: WorldAction): Promise<ActionExecutionResult>;
    static executeFsMkdir(action: WorldAction): Promise<ActionExecutionResult>;
    static executeFsRename(action: WorldAction): Promise<ActionExecutionResult>;
    static executeFsCopy(action: WorldAction): Promise<ActionExecutionResult>;
    static executeFsMove(action: WorldAction): Promise<ActionExecutionResult>;
    static executeFsDelete(action: WorldAction): Promise<ActionExecutionResult>;
    static executeProcessList(action: WorldAction): Promise<ActionExecutionResult>;
    static executeProcessInspect(action: WorldAction): Promise<ActionExecutionResult>;
    static executeProcessExists(action: WorldAction): Promise<ActionExecutionResult>;
    static executeProcessStart(action: WorldAction): Promise<ActionExecutionResult>;
    static executeProcessStop(action: WorldAction): Promise<ActionExecutionResult>;
    static executeAllowlistedCommand(action: WorldAction): Promise<ActionExecutionResult>;
    static getGovernedProcessCount(): number;
    static clearAllGovernedProcesses(): void;
}
export declare const globalWorldActionExecutor: typeof WorldActionExecutor;
