import type { CapabilityDescriptor, CapabilityExecutionRequest, CapabilityExecutionResult, HostEnvironmentSnapshot } from './capabilityTypes.js';
import { type CapabilityRuntimeHealth } from './capabilityRuntime.js';
export declare class CapabilityFacade {
    getEnvironmentSnapshot(forceRefresh?: boolean): HostEnvironmentSnapshot;
    getAllCapabilities(): CapabilityDescriptor[];
    getCapability(capabilityId: string): CapabilityDescriptor | undefined;
    execute(request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult>;
    preview(request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult>;
    getHealth(): CapabilityRuntimeHealth;
}
export declare const capability: CapabilityFacade;
