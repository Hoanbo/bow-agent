export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export interface CapabilityDescriptor {
    /** Unique capability identifier (e.g. 'system.open_app', 'fs.search', 'fs.read', 'system.run_script') */
    readonly name: string;
    /** Human-readable explanation of what this capability does */
    readonly description: string;
    /** Safety risk rating determining PDP governance and approval requirements */
    readonly riskLevel: RiskLevel;
    /** Parameter schema or descriptor for invocation */
    readonly parameters?: {
        type?: 'object';
        properties?: Record<string, {
            type: string;
            description?: string;
            required?: boolean;
        }>;
        required?: string[];
    };
}
export interface CapabilityAdvertisement {
    /** Unique identifier of the body instance (e.g. 'desktop_xeon_01') */
    readonly bodyId: string;
    /** Hardware or runtime category */
    readonly bodyType: 'desktop' | 'mobile' | 'robot' | string;
    /** Human-readable display label */
    readonly name: string;
    /** List of capabilities exposed by this body */
    readonly capabilities: CapabilityDescriptor[];
    /** Optional metadata (OS, hostname, hardware details) */
    readonly metadata?: Record<string, unknown>;
    /** Timestamp of advertisement emission */
    readonly timestamp?: number;
}
export interface BodyCommand {
    /** Unique identifier for this command dispatch */
    readonly commandId: string;
    /** Target body ID */
    readonly bodyId: string;
    /** Capability to invoke (e.g. 'system.open_app') */
    readonly capability: string;
    /** Arguments supplied to the capability */
    readonly params: Record<string, unknown>;
    /** Tracing correlation ID */
    readonly correlationId?: string;
    /** Maximum execution duration before timing out */
    readonly timeoutMs?: number;
}
export interface BodyCommandResult {
    /** Matches the dispatched commandId */
    readonly commandId: string;
    /** Execution success flag */
    readonly success: boolean;
    /** Output data if successful */
    readonly data?: unknown;
    /** Error message if failed */
    readonly error?: string;
    /** Total elapsed time on body in milliseconds */
    readonly executionTimeMs?: number;
}
export interface BodyConnectionSender {
    sendCommand(command: BodyCommand): Promise<BodyCommandResult>;
    isAlive(): boolean;
    close?(reason?: string): void;
}
export interface BodyRecord {
    readonly bodyId: string;
    readonly bodyType: string;
    readonly name: string;
    readonly capabilities: Map<string, CapabilityDescriptor>;
    readonly metadata: Record<string, unknown>;
    readonly registeredAt: number;
    lastHeartbeatAt: number;
    connection?: BodyConnectionSender;
}
