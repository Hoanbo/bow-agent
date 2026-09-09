import type { AgentLoopObservation } from './agentLoopTypes.js';
export declare class AgentLoopObservationEngine {
    captureObservation(): AgentLoopObservation;
}
export declare const globalAgentLoopObservation: AgentLoopObservationEngine;
