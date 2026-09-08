export type BrainServiceLifecycleState = 'CREATED' | 'INITIALIZING' | 'LOADING_STATE' | 'READY' | 'RECEIVING' | 'PROCESSING' | 'PLANNING' | 'EXECUTING' | 'VERIFYING' | 'COMMITTING' | 'RESPONDING' | 'DEGRADED' | 'RECOVERING' | 'SHUTTING_DOWN' | 'STOPPED' | 'FAILED';
export declare const ALL_BRAIN_SERVICE_STATES: readonly BrainServiceLifecycleState[];
export declare const BRAIN_SERVICE_TERMINAL_STATES: readonly BrainServiceLifecycleState[];
export declare const BRAIN_SERVICE_ACCEPTING_STATES: readonly BrainServiceLifecycleState[];
export declare const BRAIN_SERVICE_PROCESSING_STATES: readonly BrainServiceLifecycleState[];
export declare function isServiceTerminal(state: BrainServiceLifecycleState): boolean;
export declare function canServiceAcceptRequest(state: BrainServiceLifecycleState): boolean;
export declare function isServiceProcessing(state: BrainServiceLifecycleState): boolean;
export declare function isServiceReady(state: BrainServiceLifecycleState): boolean;
