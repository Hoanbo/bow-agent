export declare const FORBIDDEN_ADMISSION_CAPABILITIES: readonly string[];
export declare const FORBIDDEN_ADMISSION_EXECUTION_CAPABILITIES: readonly string[];
export declare const ALLOWED_DATA_PLANE_CAPABILITIES: readonly string[];
export declare const DEFAULT_ALLOWED_ADMISSION_CAPABILITIES: readonly string[];
export interface CapabilityFilterResult {
    readonly valid: boolean;
    readonly allowed: readonly string[];
    readonly rejected: readonly string[];
    readonly forbidden: readonly string[];
}
/**
 * Evaluates requested capabilities and fails closed if any forbidden execution capabilities are present.
 */
export declare function filterAdmissionCapabilities(requested: readonly string[]): CapabilityFilterResult;
export declare function isCognitiveEscalationAttempt(requested: readonly string[]): boolean;
export declare function assertSafeAdmissionCapabilities(requested: readonly string[]): void;
