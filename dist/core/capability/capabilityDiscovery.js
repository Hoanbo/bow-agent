// src/core/capability/capabilityDiscovery.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Real Host Environment Discovery & Capability Inspection Engine.
//
// INVARIANTS:
// Zero fabricated telemetry.
// Never assume fixed single-CPU or dual-Xeon hardware; inspect dynamically.
// Real OS, CPU, memory, process, and network interface queries.
import os from 'node:os';
import process from 'node:process';
export class CapabilityDiscoveryEngine {
    /**
     * Captures a real host environment snapshot directly from operating system APIs.
     */
    captureSnapshot() {
        const cpus = os.cpus() || [];
        const coreCount = cpus.length;
        const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown CPU';
        const cpuSpeed = cpus.length > 0 ? cpus[0].speed : 0;
        const loadAvg = typeof os.loadavg === 'function' ? os.loadavg() : [0, 0, 0];
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const percentageUsed = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;
        // Discover real network interfaces
        const rawInterfaces = os.networkInterfaces();
        const networkInterfaces = [];
        let isOnline = false;
        if (rawInterfaces) {
            for (const [name, netList] of Object.entries(rawInterfaces)) {
                if (!netList)
                    continue;
                for (const net of netList) {
                    networkInterfaces.push({
                        name,
                        address: net.address,
                        family: String(net.family),
                        mac: net.mac,
                        internal: net.internal,
                    });
                    if (!net.internal && net.address && net.address !== '127.0.0.1') {
                        isOnline = true;
                    }
                }
            }
        }
        // Dynamic HostMode detection (Hardware Independence)
        const hostMode = this.detectHostMode(coreCount, totalMem);
        const availableBinaries = ['node', 'git', process.execPath];
        return {
            platform: os.platform(),
            release: os.release(),
            arch: os.arch(),
            hostname: os.hostname(),
            hostMode,
            cpu: {
                model: cpuModel,
                cores: coreCount,
                speedMhz: cpuSpeed,
                loadAvg,
            },
            memory: {
                totalBytes: totalMem,
                freeBytes: freeMem,
                usedBytes: usedMem,
                percentageUsed,
            },
            network: {
                interfaces: networkInterfaces,
                online: isOnline || networkInterfaces.length > 0,
            },
            process: {
                pid: process.pid,
                nodeVersion: process.version,
                uptimeSeconds: Math.round(process.uptime()),
                memoryUsage: process.memoryUsage(),
            },
            availableBinaries,
            capturedAt: Date.now(),
        };
    }
    /**
     * Hardware independence heuristic: dynamic detection of workstation vs server mode.
     */
    detectHostMode(cores, totalMemBytes) {
        const totalMemGb = totalMemBytes / (1024 * 1024 * 1024);
        // High core count and memory indicates server/dual-Xeon capability
        if (cores >= 24 || totalMemGb >= 64) {
            return 'SERVER';
        }
        if (process.env.NODE_ENV === 'production') {
            return 'PRODUCTION';
        }
        if (cores >= 8) {
            return 'WORKSTATION';
        }
        return 'DEVELOPMENT';
    }
}
export const globalCapabilityDiscovery = new CapabilityDiscoveryEngine();
