// src/core/personal-os/personalResourceMonitor.ts
// BOWCON V4.0 — MS-1.3.40: MASTER OWNER PERSONAL OPERATING SYSTEM & PROACTIVE COGNITIVE AGENCY RUNTIME
//
// Section 13: Personal Resource Awareness
// Collects real host telemetry without fabrication.
// If any metric cannot be measured, marks as UNKNOWN.
//
// Invariants:
// - NO FAKE TELEMETRY
// - If unmeasurable -> UNKNOWN
// - Grounded in real OS and process metrics.
import * as os from 'node:os';
export class PersonalResourceMonitor {
    /**
     * Sample current real-world host telemetry.
     */
    sampleTelemetry(options) {
        let totalRam = 'UNKNOWN';
        let freeRam = 'UNKNOWN';
        let processRss = 'UNKNOWN';
        let cpuPercent = 'UNKNOWN';
        try {
            totalRam = os.totalmem();
            freeRam = os.freemem();
        }
        catch {
            totalRam = 'UNKNOWN';
            freeRam = 'UNKNOWN';
        }
        try {
            const memUsage = process.memoryUsage();
            processRss = memUsage.rss;
        }
        catch {
            processRss = 'UNKNOWN';
        }
        try {
            const load = os.loadavg();
            if (Array.isArray(load) && load.length > 0 && typeof load[0] === 'number') {
                const cpus = os.cpus().length || 1;
                // Normalized load percentage estimate on unix/windows
                cpuPercent = Number(Math.min(100, Math.max(0, (load[0] / cpus) * 100)).toFixed(1));
            }
            else {
                cpuPercent = 'UNKNOWN';
            }
        }
        catch {
            cpuPercent = 'UNKNOWN';
        }
        // Determine runtime health from available data
        let runtimeHealth = 'HEALTHY';
        if (typeof freeRam === 'number' && typeof totalRam === 'number') {
            const freeRatio = freeRam / totalRam;
            if (freeRatio < 0.05) {
                runtimeHealth = 'UNHEALTHY'; // < 5% RAM remaining
            }
            else if (freeRatio < 0.15) {
                runtimeHealth = 'DEGRADED';
            }
        }
        return {
            cpuPercent,
            totalRamBytes: totalRam,
            freeRamBytes: freeRam,
            processRssBytes: processRss,
            activeCapabilities: options?.activeCapabilities ?? ['capability_read', 'capability_verify'],
            activeLocks: options?.activeLocks ?? [],
            runtimeHealth,
            timestamp: Date.now(),
        };
    }
}
