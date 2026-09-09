import type { AgentLoopObjective, AgentLoopIteration, AgentLoopHealth, ControlCommandType, ObjectivePriority } from './agentLoopTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
export declare class AgentLoopFacade {
    boot(): Promise<void>;
    tick(options?: {
        isDryRun?: boolean;
        authorizationToken?: AuthorizationToken;
    }): Promise<AgentLoopIteration>;
    submitObjective(params: {
        title: string;
        description: string;
        targetResource?: string;
        priority?: ObjectivePriority;
        metadata?: Record<string, any>;
    }): AgentLoopObjective;
    requestControl(params: {
        type: ControlCommandType;
        operatorId: string;
        payload?: Record<string, any>;
    }): void;
    getHealth(): AgentLoopHealth;
    authorizeAndExecute(token: AuthorizationToken): Promise<AgentLoopIteration>;
    rehydrateFromCheckpoint(): {
        rehydrated: boolean;
        stale: boolean;
        checkpoint?: any;
    };
    get observation(): import("./agentLoopObservation.js").AgentLoopObservationEngine;
    get control(): import("./agentLoopControl.js").AgentLoopControlPlane;
    get scheduler(): import("./agentLoopScheduler.js").AgentLoopScheduler;
    get audit(): import("./agentLoopAudit.js").AgentLoopAuditLedger;
    get persistence(): import("./agentLoopPersistence.js").AgentLoopPersistenceManager;
}
export declare const globalContinuousAgentLoop: AgentLoopFacade;
