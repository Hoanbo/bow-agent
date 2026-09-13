import { type AuditLedger } from '../auditLedger.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type CognitiveInferenceRequest, type CognitiveInferenceResponse, type CognitiveResult } from './cognitiveTypes.js';
import { CognitiveCircuitBreaker, type CognitiveCircuitBreakerOptions } from './cognitiveCircuitBreaker.js';
export interface CognitiveProviderRuntimeOptions extends CognitiveCircuitBreakerOptions {
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
    readonly isUserStopActive?: () => boolean;
    readonly maxCumulativeTaskCostUsd?: number;
}
export declare class CognitiveProviderRuntime {
    private readonly circuitBreaker;
    private readonly auditLedger;
    private readonly sanitizer;
    private readonly externalUserStopFn?;
    private internalUserStop;
    private readonly maxCumulativeTaskCostUsd;
    private readonly taskCostLedger;
    private readonly activeControllers;
    constructor(options?: CognitiveProviderRuntimeOptions);
    setUserStopActive(active: boolean): void;
    setUserStop(active: boolean): void;
    isUserStopActive(): boolean;
    assertUserStopInactive(operation: string): void;
    getCircuitBreaker(): CognitiveCircuitBreaker;
    getTaskCumulativeCost(taskId: string): number;
    resetTaskCost(taskId: string): void;
    /**
     * Calculates canonical SHA-256 cryptographic provenance hash for a cognitive response.
     */
    calculateProvenanceHash(params: {
        requestId: string;
        tenantId: string;
        providerType: string;
        modelName: string;
        timestamp: string;
        resultFingerprint: string;
    }): string;
    /**
     * Generates a deterministic fingerprint of a CognitiveResult object.
     */
    fingerprintResult(result: CognitiveResult): string;
    /**
     * Master execution entrance for cognitive inference requests.
     */
    executeInference(request: CognitiveInferenceRequest, options?: {
        readonly signal?: AbortSignal;
    }): Promise<CognitiveInferenceResponse>;
    private recordAuditEvent;
}
export declare const globalCognitiveProviderRuntime: CognitiveProviderRuntime;
