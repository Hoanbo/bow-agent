import type { SupervisorRuntimeState } from './supervisorTypes.js';
export declare const VALID_SUPERVISOR_TRANSITIONS: Readonly<Record<SupervisorRuntimeState, readonly SupervisorRuntimeState[]>>;
export declare function isValidSupervisorTransition(from: SupervisorRuntimeState, to: SupervisorRuntimeState): boolean;
export declare function assertValidSupervisorTransition(from: SupervisorRuntimeState, to: SupervisorRuntimeState, context?: string): void;
