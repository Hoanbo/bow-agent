import type { CapabilityDescriptor } from './capabilityTypes.js';
export declare function defineCapability(descriptor: CapabilityDescriptor): CapabilityDescriptor;
export declare function validateCapabilityParameters(descriptor: CapabilityDescriptor, params: Record<string, any>): void;
