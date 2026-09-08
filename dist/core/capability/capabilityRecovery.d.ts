import type { CapabilityDescriptor } from './capabilityTypes.js';
import { type CapabilityFailureCode } from './capabilityFailure.js';
export interface RecoveryOutcome {
    readonly recovered: boolean;
    readonly failureCode: CapabilityFailureCode;
    readonly recoveryStrategy: string;
    readonly message: string;
}
export declare class CapabilityRecoveryManager {
    handleFailure(descriptor: CapabilityDescriptor, error: any, context?: Record<string, any>): RecoveryOutcome;
}
export declare const globalCapabilityRecovery: CapabilityRecoveryManager;
