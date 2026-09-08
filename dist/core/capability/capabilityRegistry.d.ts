import type { CapabilityDescriptor, CapabilityCategory, CapabilityState } from './capabilityTypes.js';
export declare class GovernedCapabilityRegistry {
    private capabilities;
    constructor();
    register(descriptor: CapabilityDescriptor): void;
    getCapability(capabilityId: string): CapabilityDescriptor | undefined;
    hasCapability(capabilityId: string): boolean;
    getAllCapabilities(): CapabilityDescriptor[];
    getCapabilitiesByCategory(category: CapabilityCategory): CapabilityDescriptor[];
    setCapabilityState(capabilityId: string, newState: CapabilityState): void;
    runSelfChecks(): {
        total: number;
        available: number;
        degraded: number;
        unavailable: number;
    };
    private registerBuiltinCapabilities;
}
export declare const globalCapabilityRegistry: GovernedCapabilityRegistry;
