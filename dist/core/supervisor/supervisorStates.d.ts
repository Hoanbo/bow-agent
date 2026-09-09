import type { SupervisorRuntimeState } from './supervisorTypes.js';
export declare function isSupervisorOperationalState(state: SupervisorRuntimeState): boolean;
export declare function isRecoveryActive(state: SupervisorRuntimeState): boolean;
export declare function isWaitingForHuman(state: SupervisorRuntimeState): boolean;
export declare function isSafeStop(state: SupervisorRuntimeState): boolean;
export declare function canInitiateRecovery(state: SupervisorRuntimeState): boolean;
