import type { AgentLoopCheckpoint, AgentLoopObjective, AgentLoopObservation, AgentLoopDecision, AgentLoopPlan, AgentLoopState, AuthorizationState } from './agentLoopTypes.js';
export declare class AgentLoopPersistenceManager {
    private readonly checkpointDir;
    private readonly checkpointFile;
    constructor(baseDir?: string);
    private redactSecrets;
    saveCheckpoint(params: {
        state: AgentLoopState;
        objective?: AgentLoopObjective;
        session: string;
        iteration: number;
        lastObservation?: AgentLoopObservation;
        lastDecision?: AgentLoopDecision;
        lastPlan?: AgentLoopPlan;
        authorizationState: AuthorizationState;
        verificationState?: string;
        recoveryAttempts: number;
    }): AgentLoopCheckpoint;
    loadCheckpoint(): AgentLoopCheckpoint | undefined;
    isCheckpointStale(checkpoint: AgentLoopCheckpoint, maxAgeMs?: number): boolean;
    clear(): void;
}
export declare const globalAgentLoopPersistence: AgentLoopPersistenceManager;
