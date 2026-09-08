// src/core/capability/capabilityRegistry.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Master Capability Registry: registers, verifies, self-checks, and manages capability lifecycle.

import type { CapabilityDescriptor, CapabilityCategory, CapabilityState } from './capabilityTypes.js';
import { defineCapability } from './capabilityDescriptor.js';
import { assertValidCapabilityTransition } from './capabilityTransitions.js';
import { CapabilityError } from './capabilityFailure.js';

export class GovernedCapabilityRegistry {
  private capabilities = new Map<string, CapabilityDescriptor>();

  constructor() {
    this.registerBuiltinCapabilities();
  }

  public register(descriptor: CapabilityDescriptor): void {
    const defined = defineCapability(descriptor);
    this.capabilities.set(defined.capabilityId, defined);
  }

  public getCapability(capabilityId: string): CapabilityDescriptor | undefined {
    return this.capabilities.get(capabilityId);
  }

  public hasCapability(capabilityId: string): boolean {
    return this.capabilities.has(capabilityId);
  }

  public getAllCapabilities(): CapabilityDescriptor[] {
    return Array.from(this.capabilities.values());
  }

  public getCapabilitiesByCategory(category: CapabilityCategory): CapabilityDescriptor[] {
    return this.getAllCapabilities().filter(c => c.category === category);
  }

  public setCapabilityState(capabilityId: string, newState: CapabilityState): void {
    const cap = this.capabilities.get(capabilityId);
    if (!cap) {
      throw new CapabilityError('UNAVAILABLE', `Capability "${capabilityId}" not found in registry.`);
    }

    const currentState = cap.state || 'AVAILABLE';
    assertValidCapabilityTransition(currentState, newState, capabilityId);

    // Update state immutably in registry
    this.capabilities.set(capabilityId, {
      ...cap,
      state: newState,
    });
  }

  public runSelfChecks(): { total: number; available: number; degraded: number; unavailable: number } {
    let available = 0;
    let degraded = 0;
    let unavailable = 0;

    for (const cap of this.capabilities.values()) {
      if (cap.state === 'AVAILABLE') available++;
      else if (cap.state === 'DEGRADED') degraded++;
      else unavailable++;
    }

    return {
      total: this.capabilities.size,
      available,
      degraded,
      unavailable,
    };
  }

  private registerBuiltinCapabilities(): void {
    // -----------------------------------------------------------------------
    // 1. OBSERVATION CATEGORY
    // -----------------------------------------------------------------------
    this.register({
      capabilityId: 'cap_obs_fs',
      name: 'Inspect Filesystem',
      version: '4.0.0',
      description: 'Observes filesystem state, files, and directories inside workspace.',
      category: 'OBSERVATION',
      riskLevel: 'OBSERVE',
      permissionLevel: 'OBSERVE',
      inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      outputSchema: { type: 'object', properties: { exists: { type: 'boolean' } } },
      reversible: false,
      requiresHumanApproval: false,
      requiresExplicitAuthorization: false,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: false,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 5000,
    });

    this.register({
      capabilityId: 'cap_obs_process',
      name: 'Inspect Processes',
      version: '4.0.0',
      description: 'Observes host processes, active PIDs, and memory utilization.',
      category: 'OBSERVATION',
      riskLevel: 'OBSERVE',
      permissionLevel: 'OBSERVE',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: { count: { type: 'number' } } },
      reversible: false,
      requiresHumanApproval: false,
      requiresExplicitAuthorization: false,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: false,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 5000,
    });

    this.register({
      capabilityId: 'cap_obs_system',
      name: 'Inspect System Information',
      version: '4.0.0',
      description: 'Inspects host OS, architecture, CPU specifications, and memory.',
      category: 'OBSERVATION',
      riskLevel: 'OBSERVE',
      permissionLevel: 'OBSERVE',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: { platform: { type: 'string' } } },
      reversible: false,
      requiresHumanApproval: false,
      requiresExplicitAuthorization: false,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: false,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 5000,
    });

    this.register({
      capabilityId: 'cap_obs_network',
      name: 'Inspect Network Interfaces',
      version: '4.0.0',
      description: 'Discovers active network interfaces, IP addresses, and online status.',
      category: 'OBSERVATION',
      riskLevel: 'OBSERVE',
      permissionLevel: 'OBSERVE',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: { interfaces: { type: 'array' } } },
      reversible: false,
      requiresHumanApproval: false,
      requiresExplicitAuthorization: false,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: false,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 5000,
    });

    // -----------------------------------------------------------------------
    // 2. FILESYSTEM CATEGORY
    // -----------------------------------------------------------------------
    this.register({
      capabilityId: 'cap_fs_write',
      name: 'Create / Write File',
      version: '4.0.0',
      description: 'Creates or updates a file inside the execution workspace.',
      category: 'FILESYSTEM',
      riskLevel: 'REVERSIBLE',
      permissionLevel: 'REVERSIBLE',
      inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
      outputSchema: { type: 'object', properties: { bytesWritten: { type: 'number' } } },
      reversible: true,
      requiresHumanApproval: false,
      requiresExplicitAuthorization: true,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: true,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 5000,
    });

    this.register({
      capabilityId: 'cap_fs_read',
      name: 'Read File',
      version: '4.0.0',
      description: 'Reads content from a file inside the execution workspace.',
      category: 'FILESYSTEM',
      riskLevel: 'OBSERVE',
      permissionLevel: 'OBSERVE',
      inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      outputSchema: { type: 'object', properties: { content: { type: 'string' } } },
      reversible: false,
      requiresHumanApproval: false,
      requiresExplicitAuthorization: false,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: false,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 5000,
    });

    this.register({
      capabilityId: 'cap_fs_append',
      name: 'Append File',
      version: '4.0.0',
      description: 'Appends content to an existing file in the execution workspace.',
      category: 'FILESYSTEM',
      riskLevel: 'REVERSIBLE',
      permissionLevel: 'REVERSIBLE',
      inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
      outputSchema: { type: 'object', properties: { newSize: { type: 'number' } } },
      reversible: true,
      requiresHumanApproval: false,
      requiresExplicitAuthorization: true,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: true,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 5000,
    });

    this.register({
      capabilityId: 'cap_fs_mkdir',
      name: 'Create Directory',
      version: '4.0.0',
      description: 'Creates a directory inside the execution workspace.',
      category: 'FILESYSTEM',
      riskLevel: 'LOW',
      permissionLevel: 'LOW_RISK',
      inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      outputSchema: { type: 'object', properties: { exists: { type: 'boolean' } } },
      reversible: true,
      requiresHumanApproval: false,
      requiresExplicitAuthorization: false,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: true,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 5000,
    });

    this.register({
      capabilityId: 'cap_fs_rename',
      name: 'Rename File',
      version: '4.0.0',
      description: 'Renames a file inside the execution workspace.',
      category: 'FILESYSTEM',
      riskLevel: 'REVERSIBLE',
      permissionLevel: 'REVERSIBLE',
      inputSchema: { type: 'object', properties: { path: { type: 'string' }, newPath: { type: 'string' } }, required: ['path', 'newPath'] },
      outputSchema: { type: 'object', properties: { destination: { type: 'string' } } },
      reversible: true,
      requiresHumanApproval: false,
      requiresExplicitAuthorization: true,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: true,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 5000,
    });

    this.register({
      capabilityId: 'cap_fs_delete',
      name: 'Controlled Delete',
      version: '4.0.0',
      description: 'Deletes a specified file inside the execution workspace.',
      category: 'FILESYSTEM',
      riskLevel: 'ELEVATED',
      permissionLevel: 'ELEVATED',
      inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      outputSchema: { type: 'object', properties: { deleted: { type: 'boolean' } } },
      reversible: false,
      requiresHumanApproval: true,
      requiresExplicitAuthorization: true,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: false,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 5000,
    });

    // -----------------------------------------------------------------------
    // 3. PROCESS CATEGORY
    // -----------------------------------------------------------------------
    this.register({
      capabilityId: 'cap_proc_start',
      name: 'Start Approved Process',
      version: '4.0.0',
      description: 'Spawns an approved background node process under governance.',
      category: 'PROCESS',
      riskLevel: 'ELEVATED',
      permissionLevel: 'ELEVATED',
      inputSchema: { type: 'object', properties: { command: { type: 'string' }, args: { type: 'array' } } },
      outputSchema: { type: 'object', properties: { pid: { type: 'number' } } },
      reversible: true,
      requiresHumanApproval: true,
      requiresExplicitAuthorization: true,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: true,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 10000,
    });

    this.register({
      capabilityId: 'cap_proc_stop',
      name: 'Stop Governed Process',
      version: '4.0.0',
      description: 'Terminates a governed child process by PID.',
      category: 'PROCESS',
      riskLevel: 'ELEVATED',
      permissionLevel: 'ELEVATED',
      inputSchema: { type: 'object', properties: { pid: { type: 'number' } }, required: ['pid'] },
      outputSchema: { type: 'object', properties: { stopped: { type: 'boolean' } } },
      reversible: false,
      requiresHumanApproval: true,
      requiresExplicitAuthorization: true,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: false,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 10000,
    });

    // -----------------------------------------------------------------------
    // 4. SYSTEM & NETWORK CATEGORIES
    // -----------------------------------------------------------------------
    this.register({
      capabilityId: 'cap_sys_snapshot',
      name: 'Capture System Snapshot',
      version: '4.0.0',
      description: 'Captures full OS, CPU, memory, and environment snapshot.',
      category: 'SYSTEM',
      riskLevel: 'OBSERVE',
      permissionLevel: 'OBSERVE',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: { platform: { type: 'string' }, hostMode: { type: 'string' } } },
      reversible: false,
      requiresHumanApproval: false,
      requiresExplicitAuthorization: false,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: false,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 5000,
    });

    this.register({
      capabilityId: 'cap_net_interfaces',
      name: 'Discover Network Interfaces',
      version: '4.0.0',
      description: 'Discovers active network adapters and IP connectivity.',
      category: 'NETWORK',
      riskLevel: 'OBSERVE',
      permissionLevel: 'OBSERVE',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: { count: { type: 'number' } } },
      reversible: false,
      requiresHumanApproval: false,
      requiresExplicitAuthorization: false,
      supportsDryRun: true,
      supportsVerification: true,
      supportsRollback: false,
      supportedHostModes: ['WORKSTATION', 'SERVER', 'HEADLESS_SERVER', 'DEVELOPMENT', 'PRODUCTION'],
      supportedOperatingSystems: ['win32', 'linux', 'darwin'],
      dependencies: [],
      timeoutMs: 5000,
    });
  }
}

export const globalCapabilityRegistry = new GovernedCapabilityRegistry();
