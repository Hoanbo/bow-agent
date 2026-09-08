import type { CapabilityDescriptor, CapabilityExecutionRequest, CapabilityExecutionResult } from './capabilityTypes.js';
export declare class CapabilityExecutor {
    execute(descriptor: CapabilityDescriptor, request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult>;
}
export declare const globalCapabilityExecutor: CapabilityExecutor;
