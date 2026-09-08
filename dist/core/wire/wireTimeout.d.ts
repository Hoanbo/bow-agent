export declare const WIRE_TIMEOUT_CONFIG: Readonly<{
    CONNECT_TIMEOUT_MS: 5000;
    HANDSHAKE_TIMEOUT_MS: 5000;
    ADMISSION_TIMEOUT_MS: 5000;
    HEARTBEAT_TIMEOUT_MS: 10000;
    RESUME_TIMEOUT_MS: 5000;
    DRAIN_TIMEOUT_MS: 5000;
    IDLE_TIMEOUT_MS: 30000;
}>;
export declare function withWireTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T>;
