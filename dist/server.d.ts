export interface ServerOptions {
    port?: number;
    host?: string;
}
export declare class BowCentralAgentServer {
    private server?;
    private wss?;
    private isRunning;
    private port;
    private host;
    constructor(options?: ServerOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
}
export declare const server: BowCentralAgentServer;
