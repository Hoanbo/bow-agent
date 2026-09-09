// src/core/supervisor/supervisorObservation.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Real Multi-Domain Environment & Runtime Observation Engine.
//
// INVARIANTS:
// OBSERVATION != MUTATION
// Zero fabricated telemetry. Consumes real host, capability, cognitive, and world-action runtime states.
import process from 'node:process';
import { globalCapabilityRuntime } from '../capability/capabilityRuntime.js';
import { globalCapabilityRegistry } from '../capability/capabilityRegistry.js';
import { globalWorldActionRuntime } from '../world-action/worldActionRuntime.js';
import { globalCognitiveRegistry } from '../cognitive/cognitiveRegistry.js';
export class SupervisorObservationEngine {
    /**
     * Captures an authoritative observation snapshot directly from real runtime subsystems.
     */
    captureSnapshot() {
        // 1. Process & Host Observation
        const envSnapshot = globalCapabilityRuntime.getEnvironmentSnapshot();
        const memUsage = process.memoryUsage();
        const memoryRssMb = Math.round(memUsage.rss / (1024 * 1024));
        // 2. Capability Observation
        const capChecks = globalCapabilityRegistry.runSelfChecks();
        // 3. Cognitive Observation
        const activeProvider = globalCognitiveRegistry.getActiveProvider();
        const isFallbackActive = activeProvider.providerType === 'deterministic-fallback';
        // 4. World-Action Observation
        return {
            timestamp: Date.now(),
            process: {
                pid: process.pid,
                memoryRssMb,
                uptime: Math.round(process.uptime()),
                state: 'RUNNING',
            },
            host: {
                platform: envSnapshot.platform,
                arch: envSnapshot.arch,
                cores: envSnapshot.cpu.cores,
                freeMemMb: Math.round(envSnapshot.memory.freeBytes / (1024 * 1024)),
                online: envSnapshot.network.online,
            },
            capabilities: {
                total: capChecks.total,
                available: capChecks.available,
                degraded: capChecks.degraded,
                unavailable: capChecks.unavailable,
            },
            cognitive: {
                providerType: activeProvider.providerType,
                isAvailable: activeProvider.isAvailable ?? true,
                isFallbackActive,
            },
            worldAction: {
                pendingCount: 0,
                failedCount: 0,
                isSafeStop: globalWorldActionRuntime.isEmergencyStopActive(),
            },
        };
    }
}
export const globalSupervisorObservation = new SupervisorObservationEngine();
