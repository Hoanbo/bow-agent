import type { NetworkAdapter, NetworkAdapterMetrics } from './networkAdapter.js';
import type { ScopedNetworkIdentity, NetworkFrame, NetworkOperationResult, NetworkAdapterType } from './networkTypes.js';
import type { NetworkAdapterState } from './networkStates.js';
import { type NetworkConnectionSnapshot } from './networkConnection.js';
export interface NetworkInMemoryAdapterOptions {
    readonly adapterId?: string;
    readonly maxQueueDepth?: number;
}
export declare class NetworkInMemoryAdapter implements NetworkAdapter {
    readonly adapterId: string;
    readonly adapterType: NetworkAdapterType;
    private state;
    private readonly codec;
    private readonly maxQueueDepth;
    private readonly connections;
    private readonly frameQueues;
    private totalSent;
    private totalReceived;
    constructor(options?: NetworkInMemoryAdapterOptions);
    getState(): NetworkAdapterState;
    open(scope: ScopedNetworkIdentity): Promise<Readonly<NetworkConnectionSnapshot>>;
    close(connectionId: string, reason?: string): Promise<void>;
    send(frame: Readonly<NetworkFrame>): Promise<Readonly<NetworkOperationResult>>;
    receive(connectionId: string): Promise<Readonly<NetworkFrame> | undefined>;
    getConnection(connectionId: string): Readonly<NetworkConnectionSnapshot> | undefined;
    getHealth(): 'HEALTHY' | 'DEGRADED' | 'UNRESPONSIVE';
    getMetrics(): Readonly<NetworkAdapterMetrics>;
}
