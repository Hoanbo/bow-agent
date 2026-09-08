import type { CapabilityDescriptor, CapabilityExecutionRequest, CapabilityExecutionResult } from './capabilityTypes.js';
export interface CapabilityVerificationOutcome {
    readonly passed: boolean;
    readonly checksPerformed: string[];
    readonly observation: Record<string, any>;
    readonly failureReason?: string;
}
export declare class CapabilityVerifier {
    verify(descriptor: CapabilityDescriptor, request: CapabilityExecutionRequest, result: CapabilityExecutionResult): Promise<CapabilityVerificationOutcome>;
}
export declare const globalCapabilityVerifier: CapabilityVerifier;
