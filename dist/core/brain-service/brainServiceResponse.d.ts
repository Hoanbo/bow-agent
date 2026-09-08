import type { BrainServiceResponseEnvelope, BrainServiceHealthState, BrainQueueStatus } from './brainServiceTypes.js';
import type { BrainTaskResult } from '../brain/brainTypes.js';
export interface BuildSuccessResponseOptions {
    requestId: string;
    sessionId: string;
    result: BrainTaskResult;
    health: BrainServiceHealthState;
    queueStatus: BrainQueueStatus;
    durationMs: number;
    metadata?: Record<string, unknown>;
}
export interface BuildErrorResponseOptions {
    requestId: string;
    sessionId: string;
    error: unknown;
    health: BrainServiceHealthState;
    queueStatus: BrainQueueStatus;
    durationMs: number;
    metadata?: Record<string, unknown>;
}
export declare function buildSuccessResponse(options: BuildSuccessResponseOptions): BrainServiceResponseEnvelope;
export declare function buildErrorResponse(options: BuildErrorResponseOptions): BrainServiceResponseEnvelope;
export declare function serializeResponseJson(response: BrainServiceResponseEnvelope): string;
