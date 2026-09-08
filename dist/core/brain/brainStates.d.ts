export type BrainLifecycleState = 'IDLE' | 'INPUT_RECEIVED' | 'UNDERSTANDING' | 'REASONING' | 'PLANNING' | 'DECIDING' | 'ACTION_PREPARING' | 'EXECUTING' | 'OBSERVING' | 'VERIFYING' | 'COMMITTING' | 'COMPLETED' | 'RECOVERING' | 'REPLANNING' | 'FAILED' | 'PAUSED' | 'STOPPED';
export declare const ALL_BRAIN_STATES: readonly BrainLifecycleState[];
export declare const BRAIN_TERMINAL_STATES: readonly BrainLifecycleState[];
export declare const BRAIN_RESTING_STATES: readonly BrainLifecycleState[];
export declare const BRAIN_ACTIVE_EXECUTION_STATES: readonly BrainLifecycleState[];
export declare function isBrainTerminal(state: BrainLifecycleState): boolean;
export declare function isBrainResting(state: BrainLifecycleState): boolean;
export declare function isBrainActivelyExecuting(state: BrainLifecycleState): boolean;
export declare function canBrainAcceptInput(state: BrainLifecycleState): boolean;
