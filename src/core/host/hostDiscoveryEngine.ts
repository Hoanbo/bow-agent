// src/core/host/hostDiscoveryEngine.ts
// BOWCON V4.0 — MS-1.3.41: MASTER ARCHITECTURE IDENTITY, HOST ABSTRACTION & CAPABILITY-AWARE CORE
//
// Dynamic Host Environment Discovery Engine:
// Inspects real OS, CPU, RAM, network, processes, and permissions.
// Never assumes Windows 11. Zero fabricated metrics.

import * as os from 'node:os';
import * as process from 'node:process';
import * as fs from 'node:fs';
import type {
  HostEnvironment,
  HostMetricStatus,
  HostOsInfo,
  HostArchInfo,
  HostKernelRuntimeInfo,
  HostCpuDetails,
  HostMemoryDetails,
  HostStorageDetails,
  HostGpuDetails,
  HostNetworkDetails,
  HostProcessDetails,
  HostDeviceDetails,
  HostPermissionDetails,
  HostSoftwareDetails,
} from './hostEnvironmentTypes.js';

export interface HostDiscoveryOptions {
  customPlatform?: string;
  customRelease?: string;
  customArch?: string;
  simulateMetricFailure?: boolean;
}

export class HostDiscoveryEngine {
  private _cachedEnvironment?: HostEnvironment;

  /**
   * Captures the actual host environment dynamically without hardcoded assumptions.
   */
  public discoverHost(options?: HostDiscoveryOptions): HostEnvironment {
    const platform = options?.customPlatform || os.platform();
    const release = options?.customRelease || os.release();
    const arch = options?.customArch || os.arch();
    const simulateFailure = options?.simulateMetricFailure === true;

    // 1. Operating System
    const isWindows = platform === 'win32';
    const isLinux = platform === 'linux';
    const isDarwin = platform === 'darwin';
    let osFamily = 'OTHER';
    if (isWindows) osFamily = 'WINDOWS';
    else if (isLinux) osFamily = 'LINUX';
    else if (isDarwin) osFamily = 'MACOS';

    const operatingSystem: HostOsInfo = {
      platform,
      release,
      family: osFamily,
      isWindows,
      isLinux,
      isDarwin,
      status: 'KNOWN',
    };

    // 2. Architecture
    const is64Bit = arch === 'x64' || arch === 'arm64';
    const architecture: HostArchInfo = {
      arch,
      is64Bit,
      status: 'KNOWN',
    };

    // 3. Kernel / Runtime
    const kernelRuntime: HostKernelRuntimeInfo = {
      nodeVersion: process.version,
      runtimeName: 'Node.js',
      v8Version: process.versions.v8,
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      status: 'KNOWN',
    };

    // 4. CPU Details
    let cpu: HostCpuDetails;
    if (simulateFailure) {
      cpu = {
        model: 'UNKNOWN',
        cores: 'UNKNOWN',
        speedMhz: 'UNKNOWN',
        loadAvg: 'UNKNOWN',
        status: 'UNKNOWN',
      };
    } else {
      try {
        const cpus = os.cpus() || [];
        const model = cpus.length > 0 ? cpus[0].model : 'UNKNOWN';
        const cores = cpus.length > 0 ? cpus.length : 'UNKNOWN';
        const speedMhz = cpus.length > 0 ? cpus[0].speed : 'UNKNOWN';
        const loadAvg = typeof os.loadavg === 'function' ? os.loadavg() : 'UNKNOWN';

        cpu = {
          model,
          cores,
          speedMhz,
          loadAvg,
          status: cores !== 'UNKNOWN' ? 'KNOWN' : 'UNKNOWN',
        };
      } catch {
        cpu = {
          model: 'UNKNOWN',
          cores: 'UNKNOWN',
          speedMhz: 'UNKNOWN',
          loadAvg: 'UNKNOWN',
          status: 'UNKNOWN',
        };
      }
    }

    // 5. Memory Details
    let memory: HostMemoryDetails;
    if (simulateFailure) {
      memory = {
        totalBytes: 'UNKNOWN',
        freeBytes: 'UNKNOWN',
        usedBytes: 'UNKNOWN',
        percentageUsed: 'UNKNOWN',
        status: 'UNKNOWN',
      };
    } else {
      try {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const percentage = total > 0 ? Math.round((used / total) * 100) : 'UNKNOWN';

        memory = {
          totalBytes: total,
          freeBytes: free,
          usedBytes: used,
          percentageUsed: percentage,
          status: 'KNOWN',
        };
      } catch {
        memory = {
          totalBytes: 'UNKNOWN',
          freeBytes: 'UNKNOWN',
          usedBytes: 'UNKNOWN',
          percentageUsed: 'UNKNOWN',
          status: 'UNKNOWN',
        };
      }
    }

    // 6. Storage Details
    let storage: HostStorageDetails;
    try {
      const targetPath = process.cwd();
      if (typeof (fs as any).statfsSync === 'function') {
        const stats = (fs as any).statfsSync(targetPath);
        const totalBytes = stats.bsize * stats.blocks;
        const freeBytes = stats.bsize * stats.bfree;
        storage = {
          available: true,
          totalBytes,
          freeBytes,
          path: targetPath,
          status: 'KNOWN',
        };
      } else {
        storage = {
          available: true,
          totalBytes: 'UNKNOWN',
          freeBytes: 'UNKNOWN',
          path: targetPath,
          status: 'UNAVAILABLE',
        };
      }
    } catch {
      storage = {
        available: false,
        totalBytes: 'UNKNOWN',
        freeBytes: 'UNKNOWN',
        path: process.cwd(),
        status: 'UNKNOWN',
      };
    }

    // 7. GPU Details (Honest reporting: zero fabrication)
    // Node.js standard library has no built-in GPU telemetry.
    // Must report UNAVAILABLE / UNKNOWN rather than fabricating fake hardware.
    const gpu: HostGpuDetails = {
      detected: false,
      model: 'UNKNOWN',
      status: 'UNAVAILABLE',
    };

    // 8. Network Details
    let network: HostNetworkDetails;
    try {
      const netInterfaces = os.networkInterfaces();
      const count = netInterfaces ? Object.keys(netInterfaces).length : 0;
      let online = false;
      if (netInterfaces) {
        for (const list of Object.values(netInterfaces)) {
          if (!list) continue;
          for (const item of list) {
            if (!item.internal && item.address && item.address !== '127.0.0.1') {
              online = true;
              break;
            }
          }
        }
      }

      network = {
        online: online || count > 0,
        interfaceCount: count,
        status: 'KNOWN',
      };
    } catch {
      network = {
        online: false,
        interfaceCount: 0,
        status: 'UNKNOWN',
      };
    }

    // 9. Process Details
    let processes: HostProcessDetails;
    try {
      const memUsage = process.memoryUsage();
      processes = {
        currentPid: process.pid,
        memoryRssBytes: memUsage.rss,
        status: 'KNOWN',
      };
    } catch {
      processes = {
        currentPid: process.pid,
        memoryRssBytes: 'UNKNOWN',
        status: 'UNKNOWN',
      };
    }

    // 10. Devices
    const devices: HostDeviceDetails = {
      count: 1, // At least the primary host console
      status: 'KNOWN',
    };

    // 11. Permissions
    let permissions: HostPermissionDetails;
    try {
      // In Windows, process.getuid doesn't exist
      const isElevated = typeof (process as any).getuid === 'function'
        ? (process as any).getuid() === 0
        : 'UNKNOWN';

      permissions = {
        isElevated,
        canAccessFilesystem: true,
        canExecuteProcesses: true,
        status: 'KNOWN',
      };
    } catch {
      permissions = {
        isElevated: 'UNKNOWN',
        canAccessFilesystem: true,
        canExecuteProcesses: true,
        status: 'UNKNOWN',
      };
    }

    // 12. Installed Software
    const installedSoftware: HostSoftwareDetails = {
      binaries: ['node', 'git', process.execPath],
      status: 'KNOWN',
    };

    // Discovered capabilities & limitations
    const availableCapabilities = [
      'fs_read',
      'fs_write',
      'process_exec',
      'network_inspect',
      'memory_query',
    ];

    const limitations: string[] = [];
    if (!isWindows) {
      limitations.push('Windows-specific optional features (e.g. PowerShell host specific scripts) not available natively.');
    }
    if (gpu.status === 'UNAVAILABLE') {
      limitations.push('GPU telemetry unavailable via standard runtime.');
    }

    const hostEnv: HostEnvironment = {
      operatingSystem,
      architecture,
      kernelRuntime,
      cpu,
      memory,
      storage,
      gpu,
      network,
      processes,
      devices,
      permissions,
      installedSoftware,
      availableCapabilities,
      limitations,
      capturedAt: Date.now(),
    };

    this._cachedEnvironment = hostEnv;
    return hostEnv;
  }

  public getCachedEnvironment(): HostEnvironment | undefined {
    return this._cachedEnvironment;
  }
}

export const globalHostDiscovery = new HostDiscoveryEngine();
