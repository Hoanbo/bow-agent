import type { CognitiveProviderType } from './cognitiveTypes.js';
export type CognitiveFailureCode = 'PROVIDER_UNAVAILABLE' | 'PROVIDER_TIMEOUT' | 'PROVIDER_INVALID_RESPONSE' | 'PROVIDER_MALFORMED_OUTPUT' | 'PROVIDER_AUTH_FAILURE' | 'PROVIDER_RATE_LIMITED' | 'PROVIDER_PROTOCOL_ERROR' | 'PROVIDER_INTERNAL_ERROR';
export declare class CognitiveError extends Error {
    readonly code: CognitiveFailureCode;
    readonly providerType?: CognitiveProviderType;
    readonly isRecoverable: boolean;
    readonly timestamp: string;
    constructor(code: CognitiveFailureCode, message: string, options?: {
        providerType?: CognitiveProviderType;
        isRecoverable?: boolean;
        cause?: unknown;
    });
}
export declare function isRecoverableCognitiveError(error: unknown): boolean;
export declare function classifyCognitiveError(error: unknown): CognitiveFailureCode;
