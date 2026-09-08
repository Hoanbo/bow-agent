import type { WireAuditRecord, WireSecurityEventType, WireRiskLevel } from './wireTypes.js';
export declare function scrubSecrets(data: unknown, depth?: number): unknown;
export declare class WireAuditLedger {
    private records;
    private readonly maxRecords;
    constructor(maxRecords?: number);
    recordEvent(params: {
        eventType: WireSecurityEventType;
        connectionId: string;
        deviceId?: string;
        sessionId?: string;
        details?: Record<string, unknown>;
        riskLevel?: WireRiskLevel;
    }): WireAuditRecord;
    getRecords(): readonly WireAuditRecord[];
    getRecordsByConnection(connectionId: string): readonly WireAuditRecord[];
    getRecordsByDevice(deviceId: string): readonly WireAuditRecord[];
    clear(): void;
}
