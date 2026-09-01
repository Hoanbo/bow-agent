import type { AgentContext, AgentAction } from '../core/types.js';
export interface WebAgentRequestPayload {
    query?: string;
    text?: string;
    sessionId?: string;
    context?: Partial<AgentContext>;
}
export interface WebAgentResponsePayload {
    id: string;
    query: string;
    sessionId: string;
    intent: string;
    text: string;
    content: string;
    success: boolean;
    actionCard?: AgentAction | null;
    action?: AgentAction;
    actions?: AgentAction[];
    suggestions: string[];
    knowledgeGap?: boolean;
    telemetryEvents?: any[];
    data?: any;
    timestamp: string;
}
export declare class WebAdapter {
    /**
     * Process web query and format 100% strictly compatible response for shopofbow
     */
    handleRequest(payload: WebAgentRequestPayload): Promise<WebAgentResponsePayload>;
}
export declare const webAdapter: WebAdapter;
