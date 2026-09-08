export type CapabilityAuditEventType = 'CAPABILITY_DISCOVERED' | 'CAPABILITY_REGISTERED' | 'CAPABILITY_REQUESTED' | 'CAPABILITY_PLANNED' | 'CAPABILITY_AUTHORIZED' | 'CAPABILITY_DENIED' | 'CAPABILITY_EXECUTED' | 'CAPABILITY_VERIFIED' | 'CAPABILITY_FAILED' | 'CAPABILITY_RECOVERED' | 'SAFE_STOP_TRIGGERED';
export interface CapabilityAuditEntry {
    readonly eventId: string;
    readonly eventType: CapabilityAuditEventType;
    readonly capabilityId: string;
    readonly target?: string;
    readonly timestamp: string;
    readonly payload: Record<string, any>;
    readonly payloadHash: string;
    readonly previousHash: string;
}
export declare class CapabilityAuditLogger {
    private events;
    private lastHash;
    record(eventType: CapabilityAuditEventType, capabilityId: string, payload?: Record<string, any>, target?: string): CapabilityAuditEntry;
    getAllEvents(): readonly CapabilityAuditEntry[];
    scrub(obj: any): any;
    clear(): void;
}
export declare const globalCapabilityAudit: CapabilityAuditLogger;
