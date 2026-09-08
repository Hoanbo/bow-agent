import { RelayGatewayRuntime } from './relayGatewayRuntime.js';
import { RealWireClient } from './wireClient.js';
import type { WireTransportSnapshot, WireEndpointMetadata, WireSurfaceType } from './wireTypes.js';
export interface WireTransportRuntimeOptions {
    readonly mode?: 'REAL' | 'IN_MEMORY';
    readonly gatewayRuntime?: RelayGatewayRuntime;
}
export declare class WireTransportRuntime {
    private readonly mode;
    private readonly gatewayRuntime;
    constructor(options?: WireTransportRuntimeOptions);
    getGatewayRuntime(): RelayGatewayRuntime;
    getMode(): 'REAL' | 'IN_MEMORY';
    startGateway(port?: number, host?: string): Promise<WireEndpointMetadata>;
    stopGateway(): Promise<void>;
    createClient(params: {
        deviceId: string;
        surfaceId: string;
        surfaceType: WireSurfaceType;
        tenantId?: string;
        userId?: string;
        brainId?: string;
        relayId?: string;
    }): RealWireClient;
    getSnapshot(): WireTransportSnapshot;
}
