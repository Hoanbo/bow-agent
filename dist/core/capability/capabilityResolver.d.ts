import type { CapabilityDescriptor } from './capabilityTypes.js';
export declare class CapabilityResolver {
    private aliases;
    resolve(identifier: string): CapabilityDescriptor;
    registerAlias(alias: string, canonicalId: string): void;
}
export declare const globalCapabilityResolver: CapabilityResolver;
