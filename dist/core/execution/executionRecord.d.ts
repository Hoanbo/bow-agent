import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { ExecutionRecord, ExecutionStatus, ReplayStatus } from './executionTypes.js';
export interface CreateRecordParams {
    readonly executionFingerprint: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly toolId: string;
    readonly actionId?: string;
    readonly domain?: string;
    readonly risk?: PlanRiskLevel;
    readonly status: ExecutionStatus;
    readonly success: boolean;
    readonly replayStatus?: ReplayStatus;
    readonly error?: string;
    readonly outputMetadata?: Readonly<Record<string, unknown>>;
    readonly executedAt?: string;
}
/**
 * EN: Creates an immutable ExecutionRecord with sanitized errors and frozen attributes.
 * VI: Tạo ExecutionRecord bất biến với lỗi đã được khử trùng và các thuộc tính được đóng băng.
 */
export declare function createExecutionRecord(params: CreateRecordParams): ExecutionRecord;
