import type { BrainFailureClassification } from './brainServiceTypes.js';
export type BrainServiceErrorCode = 'BRAIN_SERVICE_NOT_READY' | 'BRAIN_SERVICE_BUSY' | 'BRAIN_SERVICE_BACKPRESSURE' | 'BRAIN_SERVICE_SHUTTING_DOWN' | 'BRAIN_SERVICE_INVALID_REQUEST' | 'BRAIN_SERVICE_DUPLICATE_REQUEST' | 'BRAIN_SERVICE_EXECUTION_FAILED' | 'BRAIN_SERVICE_PERSISTENCE_FAILED' | 'BRAIN_SERVICE_RECOVERY_FAILED' | 'BRAIN_SERVICE_INTERNAL_ERROR' | 'BRAIN_SERVICE_FATAL_ERROR';
export declare class BrainServiceError extends Error {
    readonly code: BrainServiceErrorCode;
    readonly classification: BrainFailureClassification;
    readonly recoverable: boolean;
    readonly timestamp: number;
    readonly details?: Record<string, unknown>;
    constructor(code: BrainServiceErrorCode, message: string, classification?: BrainFailureClassification, details?: Record<string, unknown>);
}
export declare function classifyServiceError(err: unknown): BrainFailureClassification;
export declare function isFatalServiceError(err: unknown): boolean;
