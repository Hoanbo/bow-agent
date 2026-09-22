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
    /** Target body ID (optional if routed dynamically by capability) */
    readonly bodyId?: string;
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
export interface AudioDeviceDescriptor {
    readonly id: string | number;
    readonly name: string;
    readonly type: 'input' | 'output';
    readonly isDefault?: boolean;
    readonly channels?: number;
    readonly sampleRates?: number[];
}
export interface AudioDeviceListResult {
    readonly inputs: AudioDeviceDescriptor[];
    readonly outputs: AudioDeviceDescriptor[];
    readonly activeInput?: string;
    readonly activeOutput?: string;
}
export interface AudioStatusResult {
    readonly ready: boolean;
    readonly activeInput: string;
    readonly activeOutput: string;
    readonly defaultSampleRate: number;
    readonly defaultChannels: number;
    readonly isCapturing: boolean;
    readonly isPlaying: boolean;
}
export interface AudioCaptureParams {
    readonly durationMs?: number;
    readonly sampleRate?: number;
    readonly channels?: number;
    readonly mode?: 'record' | 'stream';
    readonly [key: string]: unknown;
}
export interface AudioCaptureResult {
    readonly audioBase64: string;
    readonly format: 'wav' | 'pcm';
    readonly durationMs: number;
    readonly sampleRate: number;
    readonly channels: number;
    readonly byteLength: number;
}
export interface AudioPlayParams {
    readonly audioBase64?: string;
    readonly audioFilePath?: string;
    readonly format?: 'wav' | 'mp3' | 'pcm';
    readonly volumePercent?: number;
    readonly [key: string]: unknown;
}
export interface AudioPlayResult {
    readonly success: boolean;
    readonly playbackDurationMs: number;
    readonly deviceName?: string;
    readonly error?: string;
}
export interface BodyEvent {
    readonly type: 'body.event';
    readonly id: string;
    readonly correlationId?: string;
    readonly bodyId: string;
    readonly capability: string;
    readonly payload: unknown;
    readonly timestamp: number;
}
