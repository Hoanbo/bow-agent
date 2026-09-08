import type { AdmissionState } from './admissionStates.js';
export declare const ADMISSION_STATE_TRANSITION_MATRIX: Record<AdmissionState, readonly AdmissionState[]>;
export declare function isValidAdmissionTransition(from: AdmissionState, to: AdmissionState): boolean;
export declare function assertValidAdmissionTransition(from: AdmissionState, to: AdmissionState): void;
