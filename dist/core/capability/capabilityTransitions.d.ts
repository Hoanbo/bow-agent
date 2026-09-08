import type { CapabilityState } from './capabilityTypes.js';
export declare const VALID_CAPABILITY_TRANSITIONS: Readonly<Record<CapabilityState, readonly CapabilityState[]>>;
export declare function isValidCapabilityTransition(from: CapabilityState, to: CapabilityState): boolean;
export declare function assertValidCapabilityTransition(from: CapabilityState, to: CapabilityState, capabilityId?: string): void;
