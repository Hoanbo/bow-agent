// src/core/capability/capabilityDescriptor.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Capability Descriptor factory, validation, and schema checking.
import { CapabilityError } from './capabilityFailure.js';
export function defineCapability(descriptor) {
    if (!descriptor.capabilityId || typeof descriptor.capabilityId !== 'string') {
        throw new CapabilityError('FATAL', 'capabilityId must be a non-empty string.');
    }
    if (!descriptor.name || typeof descriptor.name !== 'string') {
        throw new CapabilityError('FATAL', 'name must be a non-empty string.', descriptor.capabilityId);
    }
    if (!descriptor.category) {
        throw new CapabilityError('FATAL', 'category is required.', descriptor.capabilityId);
    }
    const normalized = {
        ...descriptor,
        state: descriptor.state || 'AVAILABLE',
        dependencies: descriptor.dependencies || [],
        supportedHostModes: descriptor.supportedHostModes || ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
        supportedOperatingSystems: descriptor.supportedOperatingSystems || ['win32', 'linux', 'darwin'],
        timeoutMs: descriptor.timeoutMs || 10_000,
    };
    return Object.freeze(normalized);
}
export function validateCapabilityParameters(descriptor, params) {
    if (!descriptor.inputSchema)
        return;
    const required = descriptor.inputSchema.required;
    if (Array.isArray(required)) {
        for (const reqField of required) {
            if (params[reqField] === undefined) {
                throw new CapabilityError('RECOVERABLE', `Missing required parameter "${reqField}" for capability "${descriptor.capabilityId}".`, descriptor.capabilityId);
            }
        }
    }
}
