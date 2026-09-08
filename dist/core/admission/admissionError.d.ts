export type AdmissionErrorCode = 'ADMISSION_UNAUTHORIZED' | 'ADMISSION_SCOPE_INVALID' | 'ADMISSION_SCOPE_MISMATCH' | 'ADMISSION_DEVICE_NOT_FOUND' | 'ADMISSION_DEVICE_REVOKED' | 'ADMISSION_KEY_REVOKED' | 'ADMISSION_TRUST_EXPIRED' | 'ADMISSION_TRUST_INSUFFICIENT' | 'ADMISSION_CHALLENGE_EXPIRED' | 'ADMISSION_PROOF_INVALID' | 'ADMISSION_PROOF_MISSING' | 'ADMISSION_REPLAY_DETECTED' | 'ADMISSION_SESSION_INVALID' | 'ADMISSION_SESSION_NOT_FOUND' | 'ADMISSION_SESSION_MISMATCH' | 'ADMISSION_CAPABILITY_FORBIDDEN' | 'ADMISSION_INVALID_ENDPOINT' | 'ADMISSION_INVALID_TRANSITION' | 'ADMISSION_SECRET_LEAKAGE_PREVENTED' | 'ADMISSION_ROAMING_RECONNECT_FAILED' | 'ADMISSION_INTERNAL_ERROR';
export declare const ALL_ADMISSION_ERROR_CODES: readonly AdmissionErrorCode[];
export declare class AdmissionError extends Error {
    readonly errorCode: AdmissionErrorCode;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly timestamp: number;
    constructor(errorCode: AdmissionErrorCode, message: string, details?: Record<string, unknown>);
}
export declare function createAdmissionError(errorCode: AdmissionErrorCode, message: string, details?: Record<string, unknown>): AdmissionError;
export declare function isAdmissionError(err: unknown): err is AdmissionError;
