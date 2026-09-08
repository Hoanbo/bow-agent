import type { AdmissionDecision, AdmissionDecisionType, AdmissionRejectionReason, AdmissionRequest } from './admissionTypes.js';
import type { DeviceChallenge } from '../deviceIdentity/persistentDeviceTypes.js';
export interface CreateDecisionParams {
    readonly request: AdmissionRequest;
    readonly decision: AdmissionDecisionType;
    readonly admitted: boolean;
    readonly assignedSessionId?: string;
    readonly allowedCapabilities?: readonly string[];
    readonly rejectedCapabilities?: readonly string[];
    readonly rejectionReason?: AdmissionRejectionReason;
    readonly rejectionDetails?: string;
    readonly challenge?: DeviceChallenge;
    readonly timestamp?: number;
}
/**
 * Creates an authoritative, deeply frozen AdmissionDecision.
 */
export declare function createAdmissionDecision(params: CreateDecisionParams): AdmissionDecision;
export declare function createAdmitDecision(request: AdmissionRequest, assignedSessionId: string, allowedCapabilities: readonly string[], timestamp?: number): AdmissionDecision;
export declare function createRejectDecision(request: AdmissionRequest, reason: AdmissionRejectionReason, details: string, timestamp?: number): AdmissionDecision;
export declare function createChallengeRequiredDecision(request: AdmissionRequest, challenge: DeviceChallenge, timestamp?: number): AdmissionDecision;
