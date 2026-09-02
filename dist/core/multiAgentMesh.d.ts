export type SubAgentRole = 'tech_scout' | 'coder_devops' | 'shop_operations' | 'hardware_vision';
export interface SubAgentTask {
    taskId: string;
    role: SubAgentRole;
    goal: string;
    payload?: Record<string, any>;
    assignedAt: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    result?: any;
    error?: string;
    executionTimeMs?: number;
}
export interface TeamExecutiveReport {
    generatedAt: string;
    summary: string;
    techScoutFindings: string;
    coderDevOpsStatus: string;
    shopOperationsHealth: string;
    hardwareVisionStatus: string;
    activeTasks: number;
    completedTasks: number;
}
export declare class MultiAgentMesh {
    private tasks;
    /**
     * Ủy thác một nhiệm vụ cho Agent con chuyên trách
     */
    delegateTask(role: SubAgentRole, goal: string, payload?: Record<string, any>): Promise<SubAgentTask>;
    private executeTechScout;
    private executeCoderDevOps;
    private executeShopOperations;
    private executeHardwareVision;
    /**
     * Tổng hợp báo cáo điều hành toàn diện từ 4 Agent con
     */
    synthesizeTeamReport(): Promise<TeamExecutiveReport>;
}
export declare const globalMultiAgentMesh: MultiAgentMesh;
