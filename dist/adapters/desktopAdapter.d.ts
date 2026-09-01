export interface DesktopCommandRequest {
    action: string;
    authToken: string;
    parameters?: Record<string, any>;
    sessionId?: string;
}
export interface DesktopCommandResponse {
    success: boolean;
    action: string;
    result?: any;
    error?: string;
    timestamp: string;
}
export declare class DesktopChannelAdapter {
    /**
     * Process and dispatch desktop automation commands with strict security verification
     */
    executeCommand(req: DesktopCommandRequest): Promise<DesktopCommandResponse>;
}
export declare const desktopChannelAdapter: DesktopChannelAdapter;
