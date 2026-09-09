import type { AgentLoopState } from './agentLoopTypes.js';
export declare const VALID_LOOP_TRANSITIONS: Readonly<Record<AgentLoopState, readonly AgentLoopState[]>>;
export declare function isValidLoopTransition(from: AgentLoopState, to: AgentLoopState): boolean;
export declare function assertValidLoopTransition(from: AgentLoopState, to: AgentLoopState, context?: string): void;
