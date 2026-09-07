import type { CoordinationRecord, CoordinationFailure, CoordinationFailureCategory, ActiveSurface } from './coordinationTypes.js';
/**
 * EN: Creates an immutable CoordinationRecord.
 * VI: Tạo một CoordinationRecord bất biến.
 */
export declare function createCoordinationRecord(brainId: string, userId: string, sessionId: string, sequence: number, action: string, status: string, activeSurfaces: readonly ActiveSurface[], metadata?: Readonly<Record<string, unknown>>): CoordinationRecord;
/**
 * EN: Creates an immutable CoordinationFailure descriptor with secret redaction.
 * VI: Tạo một bộ mô tả sự cố CoordinationFailure bất biến với cơ chế che giấu bí mật.
 */
export declare function createCoordinationFailure(category: CoordinationFailureCategory, rawMessage: string, brainId: string, userId: string, details?: Readonly<Record<string, unknown>>): CoordinationFailure;
