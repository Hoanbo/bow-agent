import { BowCentralAgentServer } from './server.js';
export interface AgentGatewayConfig {
    port: number;
    host: string;
}
export declare class BowAgentGatewayServer extends BowCentralAgentServer {
    constructor(config?: Partial<AgentGatewayConfig>);
}
