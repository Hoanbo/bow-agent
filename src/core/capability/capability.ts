// src/core/capability/capability.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// High-Level Capability Facade for BrainRuntime, BrainService, and CognitivePipeline.

import type {
  CapabilityDescriptor,
  CapabilityExecutionRequest,
  CapabilityExecutionResult,
  HostEnvironmentSnapshot,
} from './capabilityTypes.js';
import { globalCapabilityRuntime, type CapabilityRuntimeHealth } from './capabilityRuntime.js';
import { globalCapabilityRegistry } from './capabilityRegistry.js';

export class CapabilityFacade {
  public getEnvironmentSnapshot(forceRefresh: boolean = false): HostEnvironmentSnapshot {
    return globalCapabilityRuntime.getEnvironmentSnapshot(forceRefresh);
  }

  public getAllCapabilities(): CapabilityDescriptor[] {
    return globalCapabilityRegistry.getAllCapabilities();
  }

  public getCapability(capabilityId: string): CapabilityDescriptor | undefined {
    return globalCapabilityRegistry.getCapability(capabilityId);
  }

  public async execute(request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    return globalCapabilityRuntime.executeCapability(request);
  }

  public async preview(request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    return globalCapabilityRuntime.executeCapability({ ...request, isDryRun: true });
  }

  public getHealth(): CapabilityRuntimeHealth {
    return globalCapabilityRuntime.getHealth();
  }
}

export const capability = new CapabilityFacade();
