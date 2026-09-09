import type { HostEnvironment } from './hostEnvironmentTypes.js';
export interface HostDiscoveryOptions {
    customPlatform?: string;
    customRelease?: string;
    customArch?: string;
    simulateMetricFailure?: boolean;
}
export declare class HostDiscoveryEngine {
    private _cachedEnvironment?;
    /**
     * Captures the actual host environment dynamically without hardcoded assumptions.
     */
    discoverHost(options?: HostDiscoveryOptions): HostEnvironment;
    getCachedEnvironment(): HostEnvironment | undefined;
}
export declare const globalHostDiscovery: HostDiscoveryEngine;
