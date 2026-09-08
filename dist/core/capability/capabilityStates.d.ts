import type { CapabilityState } from './capabilityTypes.js';
export declare function isCapabilityExecutable(state: CapabilityState): boolean;
export declare function isCapabilityAvailable(state: CapabilityState): boolean;
export declare function requiresHumanGate(state: CapabilityState): boolean;
export declare function isCapabilityOperational(state: CapabilityState): boolean;
