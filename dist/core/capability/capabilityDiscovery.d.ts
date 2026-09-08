import type { HostEnvironmentSnapshot, HostMode } from './capabilityTypes.js';
export declare class CapabilityDiscoveryEngine {
    /**
     * Captures a real host environment snapshot directly from operating system APIs.
     */
    captureSnapshot(): HostEnvironmentSnapshot;
    /**
     * Hardware independence heuristic: dynamic detection of workstation vs server mode.
     */
    detectHostMode(cores: number, totalMemBytes: number): HostMode;
}
export declare const globalCapabilityDiscovery: CapabilityDiscoveryEngine;
