import { processAgentMessage as processCoreAgentMessage, processAgentMessageV2 } from './agentEngine.js';
import type { AgentContext, AgentMessage } from './types.js';
export interface MultiChannelInput {
    userText: string;
    channel?: 'WEB' | 'ROBOT' | 'DESKTOP' | 'SYSTEM';
    sessionId?: string;
    userId?: string;
    authToken?: string;
    context?: Partial<AgentContext>;
}
export interface MultiChannelOutput {
    message: AgentMessage;
    channel: 'WEB' | 'ROBOT' | 'DESKTOP' | 'SYSTEM';
    sessionId: string;
    latencyMs: number;
    security: {
        isSafe: boolean;
        piiDetected: boolean;
    };
}
export declare class AgentEngine {
    /**
     * Primary entry point for processing agent queries across Web, Robot, and Desktop channels
     */
    handleMessage(input: MultiChannelInput): Promise<MultiChannelOutput>;
}
export declare const agentEngine: AgentEngine;
export { processCoreAgentMessage as processAgentMessage, processAgentMessageV2 };
