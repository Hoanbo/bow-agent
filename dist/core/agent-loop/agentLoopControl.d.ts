import type { AgentLoopControlCommand, ControlCommandType } from './agentLoopTypes.js';
export declare class AgentLoopControlPlane {
    private _isStopped;
    private _isPaused;
    private _stopReason?;
    private _pauseReason?;
    private readonly commandHistory;
    requestControl(params: {
        type: ControlCommandType;
        operatorId: string;
        payload?: Record<string, any>;
    }): AgentLoopControlCommand;
    isStopped(): boolean;
    isPaused(): boolean;
    getStopReason(): string | undefined;
    getPauseReason(): string | undefined;
    isAutonomousExecutionAllowed(): boolean;
    getHistory(): readonly AgentLoopControlCommand[];
    stop(reason?: string, operatorId?: string): AgentLoopControlCommand;
    resetStop(operatorId?: string, operatorToken?: string): AgentLoopControlCommand;
}
export declare const globalAgentLoopControl: AgentLoopControlPlane;
