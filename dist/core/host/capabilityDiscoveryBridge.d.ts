import type { HostEnvironment, CapabilityFeasibility, PlanFeasibilityReport } from './hostEnvironmentTypes.js';
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
export declare class CapabilityDiscoveryBridge {
    /**
     * Discovers the feasibility of a specific capability in the current host environment.
     */
    discoverCapability(query: CapabilityDiscoveryQuery, customHost?: HostEnvironment): DiscoveredCapabilityStatus;
    /**
     * Discovers the feasibility of all registered capabilities in the host environment.
     */
    discoverAllCapabilities(customHost?: HostEnvironment): DiscoveredCapabilityStatus[];
    /**
     * Assesses an executive or proactive plan against host capabilities before proposing it.
     */
    assessPlanFeasibility(planId: string, requiredCapabilityIds: string[], customHost?: HostEnvironment): PlanFeasibilityReport;
}
export declare const globalCapabilityDiscoveryBridge: CapabilityDiscoveryBridge;
