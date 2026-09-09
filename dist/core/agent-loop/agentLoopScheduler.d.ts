export declare class AgentLoopScheduler {
    private readonly locks;
    private readonly executedKeys;
    acquireResourceLock(resource: string, objectiveId: string): boolean;
    releaseResourceLock(resource: string, objectiveId: string): boolean;
    isResourceLocked(resource: string): boolean;
    checkAndMarkIdempotent(key: string, ttlMs?: number): boolean;
    clear(): void;
}
export declare const globalAgentLoopScheduler: AgentLoopScheduler;
