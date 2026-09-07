import type { ScopedConnectionIdentity } from './connectionTypes.js';
import type { ConnectionState } from './connectionStates.js';
import type { ConnectionMessage } from './connectionMessage.js';
export interface NetworkConnectionAdapter {
    readonly adapterId: string;
    readonly transportType: string;
    connect(identity: ScopedConnectionIdentity): Promise<void>;
    disconnect(connectionId: string): Promise<void>;
    send(message: ConnectionMessage): Promise<void>;
    onReceive(handler: (message: ConnectionMessage) => Promise<void> | void): void;
    onError(handler: (err: Error) => void): void;
    getStatus(connectionId: string): ConnectionState;
    dispose(): Promise<void>;
}
export declare class ConnectionInMemoryAdapter implements NetworkConnectionAdapter {
    readonly adapterId: string;
    readonly transportType = "IN_MEMORY";
    private readonly statuses;
    private receiveHandler?;
    private errorHandler?;
    private readonly sentMessages;
    private isDisposed;
    constructor(adapterId?: string);
    connect(identity: ScopedConnectionIdentity): Promise<void>;
    disconnect(connectionId: string): Promise<void>;
    send(message: ConnectionMessage): Promise<void>;
    /**
     * Simulates receiving a message into the runtime from the remote peer
     */
    simulateReceive(message: ConnectionMessage): Promise<void>;
    /**
     * Simulates a transport-level error
     */
    simulateError(err: Error): void;
    onReceive(handler: (message: ConnectionMessage) => Promise<void> | void): void;
    onError(handler: (err: Error) => void): void;
    getStatus(connectionId: string): ConnectionState;
    setStatus(connectionId: string, state: ConnectionState): void;
    getSentMessages(): readonly ConnectionMessage[];
    clearSentMessages(): void;
    dispose(): Promise<void>;
}
