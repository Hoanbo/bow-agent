import type { AdmissionSecurityEventType } from './admissionTypes.js';
export interface AdmissionAuditRecord {
    readonly auditId: string;
    readonly eventType: AdmissionSecurityEventType;
    readonly deviceId: string;
    readonly scopeString?: string;
    readonly details: Readonly<Record<string, unknown>>;
    readonly timestamp: number;
    readonly auditFingerprint: string;
}
export declare const ADMISSION_REDACTED_MARKER = "[REDACTED_SECRET]";
/**
 * Recursively redacts sensitive keys from audit details.
 */
export declare function scrubAdmissionSecrets(value: unknown): unknown;
export interface RecordAdmissionAuditInput {
    readonly eventType: AdmissionSecurityEventType;
    readonly deviceId: string;
    readonly scopeString?: string;
    readonly details?: Record<string, unknown>;
    readonly timestamp?: number;
}
export declare class AdmissionAuditLedger {
    private readonly records;
    record(input: RecordAdmissionAuditInput): AdmissionAuditRecord;
    list(): readonly AdmissionAuditRecord[];
    getByEventType(type: AdmissionSecurityEventType): readonly AdmissionAuditRecord[];
    getByDeviceId(deviceId: string): readonly AdmissionAuditRecord[];
    size(): number;
    clear(): void;
}
