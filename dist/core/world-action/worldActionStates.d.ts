import type { ActionLifecycleState, ActionAuthorizationState, ActionExecutionState, ActionVerificationState } from './worldActionTypes.js';
export declare const TERMINAL_ACTION_STATES: ReadonlySet<ActionLifecycleState>;
export declare function isActionTerminal(state: ActionLifecycleState): boolean;
export declare function isActionActive(state: ActionLifecycleState): boolean;
export declare function canActionPrepare(state: ActionLifecycleState): boolean;
export declare function canActionAuthorize(state: ActionLifecycleState): boolean;
export declare function canActionExecute(lifecycleState: ActionLifecycleState, authState: ActionAuthorizationState, execState: ActionExecutionState): boolean;
export declare function canActionVerify(lifecycleState: ActionLifecycleState, execState: ActionExecutionState): boolean;
export declare function canActionCommit(lifecycleState: ActionLifecycleState, verifState: ActionVerificationState): boolean;
