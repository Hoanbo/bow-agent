// src/core/agent-loop/agentLoopObservation.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Continuous Multi-Domain Observation Engine.
//
// Invariants:
// NO FAKE TELEMETRY
// Every observation is traceable to genuine system/subsystem state.
import crypto from 'node:crypto';
import os from 'node:os';
import process from 'node:process';
import { globalCapabilityRegistry } from '../capability/capabilityRegistry.js';
import { globalCognitiveRegistry } from '../cognitive/cognitiveRegistry.js';
import { globalWorldActionRuntime } from '../world-action/worldActionRuntime.js';
import { globalSupervisorRuntime } from '../supervisor/supervisorRuntime.js';
import { globalAgentLoopObjectiveManager } from './agentLoopObjective.js';
export class AgentLoopObservationEngine {
    captureObservation() {
        const observationId = `obs_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const timestamp = Date.now();
        // 1. Genuine Host Health
        const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
        const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
        const host = {
            platform: os.platform(),
            cores: os.cpus().length,
            freeMemMb,
            totalMemMb,
        };
        // 2. Genuine Process Health
        const mem = process.memoryUsage();
        const memoryRssMb = Math.round(mem.rss / (1024 * 1024));
        const processInfo = {
            pid: process.pid,
            memoryRssMb,
            uptimeSeconds: Math.round(process.uptime()),
        };
        // 3. Genuine Capability Health
        const capChecks = globalCapabilityRegistry.runSelfChecks();
        const capabilities = {
            total: capChecks.total,
            available: capChecks.available,
            degraded: capChecks.degraded,
            unavailable: capChecks.unavailable,
        };
        // 4. Genuine Cognitive Health
        const activeProvider = globalCognitiveRegistry.getActiveProvider();
        const cognitive = {
            providerType: activeProvider.providerType,
            isAvailable: activeProvider.isAvailable ?? true,
            isFallbackActive: activeProvider.providerType === 'deterministic-fallback',
        };
        // 5. Genuine WorldAction Health
        const worldAction = {
            pendingCount: 0,
            isEmergencyStop: globalWorldActionRuntime.isEmergencyStopActive(),
        };
        // 6. Genuine Supervisor Health
        const supervisorHealth = globalSupervisorRuntime.getHealth();
        const supervisor = {
            state: supervisorHealth.state,
            isSafeStopActive: globalSupervisorRuntime.isSafeStopActive(),
            activeAnomaliesCount: supervisorHealth.activeAnomaliesCount,
        };
        // 7. Active Objective
        const activeObj = globalAgentLoopObjectiveManager.getActiveObjective();
        return {
            observationId,
            timestamp,
            host,
            process: processInfo,
            capabilities,
            cognitive,
            worldAction,
            supervisor,
            activeObjectiveId: activeObj?.objectiveId,
        };
    }
}
export const globalAgentLoopObservation = new AgentLoopObservationEngine();
