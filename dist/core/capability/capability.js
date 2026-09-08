// src/core/capability/capability.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// High-Level Capability Facade for BrainRuntime, BrainService, and CognitivePipeline.
import { globalCapabilityRuntime } from './capabilityRuntime.js';
import { globalCapabilityRegistry } from './capabilityRegistry.js';
export class CapabilityFacade {
    getEnvironmentSnapshot(forceRefresh = false) {
        return globalCapabilityRuntime.getEnvironmentSnapshot(forceRefresh);
    }
    getAllCapabilities() {
        return globalCapabilityRegistry.getAllCapabilities();
    }
    getCapability(capabilityId) {
        return globalCapabilityRegistry.getCapability(capabilityId);
    }
    async execute(request) {
        return globalCapabilityRuntime.executeCapability(request);
    }
    async preview(request) {
        return globalCapabilityRuntime.executeCapability({ ...request, isDryRun: true });
    }
    getHealth() {
        return globalCapabilityRuntime.getHealth();
    }
}
export const capability = new CapabilityFacade();
