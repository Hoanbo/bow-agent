// src/core/supervisor/supervisorAnomalyDetector.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Deterministic Anomaly Detector with explicit bounded thresholds.
//
// INVARIANTS:
// DETECTION != DIAGNOSIS
// CONFIDENCE != AUTHORIZATION
// No arbitrary random thresholds.
import crypto from 'node:crypto';
import { globalCapabilityRegistry } from '../capability/capabilityRegistry.js';
export class SupervisorAnomalyDetector {
    detectAnomalies(snapshot, context) {
        const anomalies = [];
        const sessionId = context?.sessionId || 'default_session';
        const deviceId = context?.deviceId || 'default_device';
        // 1. Include explicit anomalies if injected or reported externally
        if (context?.explicitAnomalies && context.explicitAnomalies.length > 0) {
            anomalies.push(...context.explicitAnomalies);
        }
        // 2. Capability Degradation Detection
        if (snapshot.capabilities.degraded > 0) {
            const degradedCaps = globalCapabilityRegistry.getAllCapabilities().filter(c => c.state === 'DEGRADED');
            if (degradedCaps.length > 0) {
                for (const cap of degradedCaps) {
                    anomalies.push({
                        anomalyId: `anom_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                        sessionId,
                        deviceId,
                        timestamp: Date.now(),
                        source: `CapabilityRegistry:${cap.capabilityId}`,
                        type: 'CAPABILITY_DEGRADED',
                        severity: 'MEDIUM',
                        observedState: { capabilityId: cap.capabilityId, degradedCount: snapshot.capabilities.degraded },
                        expectedState: { capabilityId: cap.capabilityId, state: 'AVAILABLE' },
                        evidence: `Capability "${cap.capabilityId}" is currently reporting DEGRADED state.`,
                        confidence: 0.98,
                    });
                }
            }
            else {
                anomalies.push({
                    anomalyId: `anom_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                    sessionId,
                    deviceId,
                    timestamp: Date.now(),
                    source: 'CapabilityRegistry',
                    type: 'CAPABILITY_DEGRADED',
                    severity: 'MEDIUM',
                    observedState: { degradedCount: snapshot.capabilities.degraded },
                    expectedState: { degradedCount: 0 },
                    evidence: `${snapshot.capabilities.degraded} capabilities are currently reporting DEGRADED state.`,
                    confidence: 0.98,
                });
            }
        }
        // 3. Capability Unavailable Detection
        if (snapshot.capabilities.unavailable > 0) {
            anomalies.push({
                anomalyId: `anom_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                sessionId,
                deviceId,
                timestamp: Date.now(),
                source: 'CapabilityRegistry',
                type: 'CAPABILITY_UNAVAILABLE',
                severity: 'HIGH',
                observedState: { unavailableCount: snapshot.capabilities.unavailable },
                expectedState: { unavailableCount: 0 },
                evidence: `${snapshot.capabilities.unavailable} capabilities are currently UNAVAILABLE.`,
                confidence: 0.99,
            });
        }
        // 4. Memory Exhaustion Detection (Explicit threshold: < 256 MB free)
        if (snapshot.host.freeMemMb < 256 && snapshot.host.freeMemMb > 0) {
            anomalies.push({
                anomalyId: `anom_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                sessionId,
                deviceId,
                timestamp: Date.now(),
                source: 'HostMemory',
                type: 'HOST_RESOURCE_EXHAUSTION',
                severity: 'CRITICAL',
                observedState: { freeMemMb: snapshot.host.freeMemMb },
                expectedState: { minFreeMemMb: 256 },
                evidence: `Host free memory (${snapshot.host.freeMemMb} MB) fell below critical threshold of 256 MB.`,
                confidence: 0.99,
            });
        }
        // 5. Cognitive Provider Unavailability Detection
        if (!snapshot.cognitive.isAvailable) {
            anomalies.push({
                anomalyId: `anom_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                sessionId,
                deviceId,
                timestamp: Date.now(),
                source: 'CognitiveRegistry',
                type: 'COGNITIVE_PROVIDER_UNAVAILABLE',
                severity: 'HIGH',
                observedState: { isAvailable: false, providerType: snapshot.cognitive.providerType },
                expectedState: { isAvailable: true },
                evidence: `Active cognitive provider (${snapshot.cognitive.providerType}) is currently unavailable.`,
                confidence: 0.95,
            });
        }
        return anomalies;
    }
}
export const globalSupervisorAnomalyDetector = new SupervisorAnomalyDetector();
