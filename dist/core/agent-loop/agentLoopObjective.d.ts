import type { AgentLoopObjective, ObjectivePriority, ObjectiveStatus } from './agentLoopTypes.js';
export declare class AgentLoopObjectiveManager {
    private readonly objectives;
    private activeObjectiveId?;
    createObjective(params: {
        title: string;
        description: string;
        targetResource?: string;
        priority?: ObjectivePriority;
        metadata?: Record<string, any>;
    }): AgentLoopObjective;
    getObjective(objectiveId: string): AgentLoopObjective | undefined;
    getActiveObjective(): AgentLoopObjective | undefined;
    setActiveObjective(objectiveId: string): AgentLoopObjective;
    updateStatus(objectiveId: string, status: ObjectiveStatus): AgentLoopObjective;
    listObjectives(): AgentLoopObjective[];
    clear(): void;
}
export declare const globalAgentLoopObjectiveManager: AgentLoopObjectiveManager;
