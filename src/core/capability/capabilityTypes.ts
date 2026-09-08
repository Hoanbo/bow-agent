// src/core/capability/capabilityTypes.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Canonical type contracts, interfaces, and environment snapshots.
//
// INVARIANTS:
// CAPABILITY != AUTHORIZATION
// DISCOVERY != EXECUTION
// OBSERVATION != MUTATION
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// VERIFICATION != COMMIT
// FAILURE != BRAIN_DEATH

import type { ActionRiskLevel, AuthorizationToken } from '../world-action/worldActionTypes.js';

export type CapabilityCategory =
  | 'OBSERVATION'
  | 'FILESYSTEM'
  | 'PROCESS'
  | 'SYSTEM'
  | 'NETWORK';

export type CapabilityState =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'DEGRADED'
  | 'REQUIRES_AUTHORIZATION'
  | 'REQUIRES_APPROVAL'
  | 'UNSUPPORTED'
  | 'DISABLED'
  | 'FAILED';

export type PermissionLevel =
  | 'OBSERVE'
  | 'LOW_RISK'
  | 'REVERSIBLE'
  | 'ELEVATED'
  | 'HIGH_IMPACT'
  | 'CRITICAL';

export type HostMode =
  | 'WORKSTATION'
  | 'SERVER'
  | 'HEADLESS_SERVER'
  | 'DEVELOPMENT'
  | 'PRODUCTION'
  | 'UNKNOWN';

export interface CapabilityDescriptor {
  readonly capabilityId: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly category: CapabilityCategory;
  readonly inputSchema: Record<string, any>;
  readonly outputSchema: Record<string, any>;
  readonly riskLevel: ActionRiskLevel;
  readonly permissionLevel: PermissionLevel;
  readonly reversible: boolean;
  readonly requiresHumanApproval: boolean;
  readonly requiresExplicitAuthorization: boolean;
  readonly supportsDryRun: boolean;
  readonly supportsVerification: boolean;
  readonly supportsRollback: boolean;
  readonly supportedHostModes: HostMode[];
  readonly supportedOperatingSystems: string[];
  readonly dependencies: string[];
  readonly timeoutMs: number;
  readonly resourceRequirements?: {
    minMemoryMb?: number;
    minCores?: number;
  };
  state?: CapabilityState;
}

export interface HostCpuInfo {
  readonly model: string;
  readonly cores: number;
  readonly speedMhz: number;
  readonly loadAvg: number[];
}

export interface HostMemoryInfo {
  readonly totalBytes: number;
  readonly freeBytes: number;
  readonly usedBytes: number;
  readonly percentageUsed: number;
}

export interface HostNetworkInterface {
  readonly name: string;
  readonly address: string;
  readonly family: string;
  readonly mac: string;
  readonly internal: boolean;
}

export interface HostNetworkInfo {
  readonly interfaces: HostNetworkInterface[];
  readonly online: boolean;
}

export interface HostProcessInfo {
  readonly pid: number;
  readonly nodeVersion: string;
  readonly uptimeSeconds: number;
  readonly memoryUsage: NodeJS.MemoryUsage;
}

export interface HostEnvironmentSnapshot {
  readonly platform: string;
  readonly release: string;
  readonly arch: string;
  readonly hostname: string;
  readonly hostMode: HostMode;
  readonly cpu: HostCpuInfo;
  readonly memory: HostMemoryInfo;
  readonly network: HostNetworkInfo;
  readonly process: HostProcessInfo;
  readonly availableBinaries: string[];
  readonly capturedAt: number;
}

export interface CapabilityExecutionRequest {
  readonly requestId: string;
  readonly capabilityId: string;
  readonly parameters: Record<string, any>;
  readonly target?: string;
  readonly userId?: string;
  readonly deviceId?: string;
  readonly sessionId?: string;
  readonly authorizationToken?: AuthorizationToken;
  readonly isDryRun?: boolean;
}

export interface CapabilityExecutionResult {
  readonly success: boolean;
  readonly capabilityId: string;
  readonly executionId: string;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly output?: any;
  readonly actualEffect: string;
  readonly verificationPassed?: boolean;
  readonly errorMessage?: string;
  readonly failureCode?: string;
  readonly metadata: Record<string, any>;
}
