// src/core/host/capabilityDiscoveryBridge.ts
// BOWCON V4.0 — MS-1.3.41: MASTER ARCHITECTURE IDENTITY, HOST ABSTRACTION & CAPABILITY-AWARE CORE
//
// Capability Discovery Bridge & Capability-Aware Planning Assessor:
// Separates HOST EXISTS from CAPABILITY EXISTS.
// Evaluates plan feasibility against available, restricted, and unavailable capabilities.
//
// INVARIANTS:
// - HOST_EXISTS != CAPABILITY_EXISTS
// - CAPABILITY_EXISTS != AUTHORIZED
// - PLANNING != EXECUTION
// - Reuses existing CapabilityRuntime and ExecutiveRuntime without duplication.

import type {
  HostEnvironment,
  CapabilityFeasibility,
  PlanFeasibilityReport,
  PlanFeasibilityStatus,
} from './hostEnvironmentTypes.js';
import { globalHostDiscovery } from './hostDiscoveryEngine.js';
import { globalCapabilityRegistry } from '../capability/capabilityRegistry.js';

export interface CapabilityDiscoveryQuery {
  capabilityId: string;
  requiredPermissions?: string[];
  requiredHostPlatform?: string;
  minMemoryMb?: number;
  minCores?: number;
}

export interface DiscoveredCapabilityStatus {
  readonly capabilityId: string;
  readonly feasibility: CapabilityFeasibility;
  readonly reason: string;
  readonly supportedHostPlatforms: string[];
  readonly registered: boolean;
}

export class CapabilityDiscoveryBridge {
  /**
   * Discovers the feasibility of a specific capability in the current host environment.
   */
  public discoverCapability(
    query: CapabilityDiscoveryQuery,
    customHost?: HostEnvironment
  ): DiscoveredCapabilityStatus {
    const host = customHost || globalHostDiscovery.discoverHost();
    let descriptor = globalCapabilityRegistry.getCapability(query.capabilityId);
    if (!descriptor && !query.capabilityId.startsWith('cap_')) {
      descriptor = globalCapabilityRegistry.getCapability(`cap_${query.capabilityId}`);
    }

    // 1. Check if capability code/descriptor is registered
    if (!descriptor) {
      return {
        capabilityId: query.capabilityId,
        feasibility: 'UNAVAILABLE',
        reason: `Capability "${query.capabilityId}" is not registered in the system capability registry.`,
        supportedHostPlatforms: [],
        registered: false,
      };
    }

    // 2. Check Platform Compatibility
    const requiredPlatform = query.requiredHostPlatform;
    if (requiredPlatform && host.operatingSystem.platform !== requiredPlatform) {
      return {
        capabilityId: query.capabilityId,
        feasibility: 'UNAVAILABLE',
        reason: `Capability "${query.capabilityId}" requires platform "${requiredPlatform}", but host is "${host.operatingSystem.platform}".`,
        supportedHostPlatforms: descriptor.supportedOperatingSystems || [],
        registered: true,
      };
    }

    if (
      descriptor.supportedOperatingSystems &&
      descriptor.supportedOperatingSystems.length > 0 &&
      !descriptor.supportedOperatingSystems.includes(host.operatingSystem.platform)
    ) {
      return {
        capabilityId: query.capabilityId,
        feasibility: 'UNAVAILABLE',
        reason: `Capability "${query.capabilityId}" is unsupported on host platform "${host.operatingSystem.platform}".`,
        supportedHostPlatforms: descriptor.supportedOperatingSystems,
        registered: true,
      };
    }

    // 3. Check Resource Requirements
    if (query.minMemoryMb && typeof host.memory.freeBytes === 'number') {
      const freeMb = host.memory.freeBytes / (1024 * 1024);
      if (freeMb < query.minMemoryMb) {
        return {
          capabilityId: query.capabilityId,
          feasibility: 'DEGRADED',
          reason: `Host free memory (${Math.round(freeMb)} MB) is below required ${query.minMemoryMb} MB.`,
          supportedHostPlatforms: descriptor.supportedOperatingSystems || [],
          registered: true,
        };
      }
    }

    if (query.minCores && typeof host.cpu.cores === 'number') {
      if (host.cpu.cores < query.minCores) {
        return {
          capabilityId: query.capabilityId,
          feasibility: 'DEGRADED',
          reason: `Host core count (${host.cpu.cores}) is below required ${query.minCores}.`,
          supportedHostPlatforms: descriptor.supportedOperatingSystems || [],
          registered: true,
        };
      }
    }

    // 4. Check Elevation / Permissions
    if (descriptor.permissionLevel === 'CRITICAL' || descriptor.permissionLevel === 'HIGH_IMPACT') {
      if (host.permissions.isElevated === false) {
        return {
          capabilityId: query.capabilityId,
          feasibility: 'RESTRICTED',
          reason: `Capability "${query.capabilityId}" requires elevated permissions which are not currently available.`,
          supportedHostPlatforms: descriptor.supportedOperatingSystems || [],
          registered: true,
        };
      }
    }

    // Default to AVAILABLE
    return {
      capabilityId: query.capabilityId,
      feasibility: 'AVAILABLE',
      reason: 'Capability is available and operational on the host.',
      supportedHostPlatforms: descriptor.supportedOperatingSystems || [],
      registered: true,
    };
  }

  /**
   * Discovers the feasibility of all registered capabilities in the host environment.
   */
  public discoverAllCapabilities(customHost?: HostEnvironment): DiscoveredCapabilityStatus[] {
    const host = customHost || globalHostDiscovery.discoverHost();
    const all = globalCapabilityRegistry.getAllCapabilities();
    return all.map((cap) => this.discoverCapability({ capabilityId: cap.capabilityId }, host));
  }

  /**
   * Assesses an executive or proactive plan against host capabilities before proposing it.
   */
  public assessPlanFeasibility(
    planId: string,
    requiredCapabilityIds: string[],
    customHost?: HostEnvironment
  ): PlanFeasibilityReport {
    const host = customHost || globalHostDiscovery.discoverHost();
    const availableCapabilities: string[] = [];
    const missingCapabilities: string[] = [];
    const restrictedCapabilities: string[] = [];
    const blockReasons: string[] = [];

    for (const capId of requiredCapabilityIds) {
      const status = this.discoverCapability({ capabilityId: capId }, host);
      if (status.feasibility === 'AVAILABLE') {
        availableCapabilities.push(capId);
      } else if (status.feasibility === 'UNAVAILABLE') {
        missingCapabilities.push(capId);
        blockReasons.push(`Capability "${capId}" unavailable: ${status.reason}`);
      } else if (status.feasibility === 'RESTRICTED') {
        restrictedCapabilities.push(capId);
        blockReasons.push(`Capability "${capId}" restricted: ${status.reason}`);
      } else if (status.feasibility === 'DEGRADED') {
        availableCapabilities.push(capId); // usable but degraded
      } else {
        missingCapabilities.push(capId);
        blockReasons.push(`Capability "${capId}" status unknown.`);
      }
    }

    let status: PlanFeasibilityStatus = 'PLAN_POSSIBLE';
    if (missingCapabilities.length > 0) {
      status = 'PLAN_BLOCKED';
    } else if (restrictedCapabilities.length > 0) {
      status = 'PLAN_CONDITIONALLY_POSSIBLE';
    } else if (requiredCapabilityIds.length === 0) {
      status = 'PLAN_POSSIBLE';
    }

    return {
      planId,
      status,
      requiredCapabilities: requiredCapabilityIds,
      availableCapabilities,
      missingCapabilities,
      restrictedCapabilities,
      blockReasons,
      timestamp: Date.now(),
    };
  }
}

export const globalCapabilityDiscoveryBridge = new CapabilityDiscoveryBridge();
