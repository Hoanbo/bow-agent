// src/gateway.ts
// BOW AGENT V3.3 — WEBSOCKET GATEWAY SERVER COMPATIBILITY WRAPPER
import { BowCentralAgentServer } from './server.js';
export class BowAgentGatewayServer extends BowCentralAgentServer {
    constructor(config = {}) {
        super(config);
    }
}
// Standalone runner if executed directly
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
    const gateway = new BowAgentGatewayServer();
    gateway.start().catch((err) => {
        console.error('Failed to start BowAgentGatewayServer:', err);
        process.exit(1);
    });
}
