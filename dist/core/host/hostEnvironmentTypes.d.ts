export type HostMetricStatus = 'KNOWN' | 'UNAVAILABLE' | 'UNKNOWN' | 'NOT_SUPPORTED' | 'NOT_MEASURED';
export interface HostOsInfo {
    readonly platform: string;
    readonly release: string;
    readonly family: string;
    readonly isWindows: boolean;
    readonly isLinux: boolean;
    readonly isDarwin: boolean;
    readonly status: HostMetricStatus;
}
export interface HostArchInfo {
    readonly arch: string;
    readonly is64Bit: boolean;
    readonly status: HostMetricStatus;
}
export interface HostKernelRuntimeInfo {
    readonly nodeVersion: string;
    readonly runtimeName: string;
    readonly v8Version?: string;
    readonly pid: number;
    readonly uptimeSeconds: number;
    readonly status: HostMetricStatus;
}
export interface HostCpuDetails {
    readonly model: string | 'UNKNOWN';
    readonly cores: number | 'UNKNOWN';
    readonly speedMhz: number | 'UNKNOWN';
    readonly loadAvg: number[] | 'UNKNOWN';
    readonly status: HostMetricStatus;
}
export interface HostMemoryDetails {
    readonly totalBytes: number | 'UNKNOWN';
    readonly freeBytes: number | 'UNKNOWN';
    readonly usedBytes: number | 'UNKNOWN';
    readonly percentageUsed: number | 'UNKNOWN';
    readonly status: HostMetricStatus;
}
export interface HostStorageDetails {
    readonly available: boolean;
    readonly totalBytes: number | 'UNKNOWN';
    readonly freeBytes: number | 'UNKNOWN';
    readonly path: string;
    readonly status: HostMetricStatus;
}
export interface HostGpuDetails {
    readonly detected: boolean;
    readonly model: string | 'UNKNOWN';
    readonly status: HostMetricStatus;
}
export interface HostNetworkDetails {
    readonly online: boolean;
    readonly interfaceCount: number;
    readonly status: HostMetricStatus;
}
export interface HostProcessDetails {
    readonly currentPid: number;
    readonly memoryRssBytes: number | 'UNKNOWN';
    readonly status: HostMetricStatus;
}
export interface HostDeviceDetails {
    readonly count: number;
    readonly status: HostMetricStatus;
}
export interface HostPermissionDetails {
    readonly isElevated: boolean | 'UNKNOWN';
    readonly canAccessFilesystem: boolean;
    readonly canExecuteProcesses: boolean;
    readonly status: HostMetricStatus;
}
export interface HostSoftwareDetails {
    readonly binaries: string[];
    readonly status: HostMetricStatus;
}
export interface HostEnvironment {
    readonly operatingSystem: HostOsInfo;
    readonly architecture: HostArchInfo;
    readonly kernelRuntime: HostKernelRuntimeInfo;
    readonly cpu: HostCpuDetails;
    readonly memory: HostMemoryDetails;
    readonly storage: HostStorageDetails;
    readonly gpu: HostGpuDetails;
    readonly network: HostNetworkDetails;
    readonly processes: HostProcessDetails;
    readonly devices: HostDeviceDetails;
    readonly permissions: HostPermissionDetails;
    readonly installedSoftware: HostSoftwareDetails;
    readonly availableCapabilities: string[];
    readonly limitations: string[];
    readonly capturedAt: number;
}
export type CapabilityFeasibility = 'AVAILABLE' | 'UNAVAILABLE' | 'DEGRADED' | 'RESTRICTED' | 'UNKNOWN';
export type PlanFeasibilityStatus = 'PLAN_POSSIBLE' | 'PLAN_CONDITIONALLY_POSSIBLE' | 'PLAN_BLOCKED' | 'PLAN_UNKNOWN';
export interface PlanFeasibilityReport {
    readonly planId: string;
    readonly status: PlanFeasibilityStatus;
    readonly requiredCapabilities: string[];
    readonly availableCapabilities: string[];
    readonly missingCapabilities: string[];
    readonly restrictedCapabilities: string[];
    readonly blockReasons: string[];
    readonly timestamp: number;
}
