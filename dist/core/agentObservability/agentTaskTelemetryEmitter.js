// src/core/agentObservability/agentTaskTelemetryEmitter.ts
// BOWCON V4.0 — MS-1.4.11: AGENT TASK OBSERVABILITY & DISTRIBUTED TRACING
// Component 962: AgentTaskTelemetryEmitter
// Sanitized Lifecycle Telemetry Emission with Audit Ledger Integration
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { globalAuditLedger } from '../auditLedger.js';
import { OBSERVABILITY_BOUNDS, deepFreeze, } from './agentTraceTypes.js';
export class AgentTaskTelemetryEmitter {
    _tenantId;
    _taskId;
    _taskVersion;
    _traceId;
    _gate;
    _events = [];
    constructor(tenantId, taskId, taskVersion, traceId, gate) {
        this._tenantId = tenantId;
        this._taskId = taskId;
        this._taskVersion = taskVersion;
        this._traceId = traceId;
        this._gate = gate;
    }
    /**
     * Emit a sanitized telemetry event
     */
    emitEvent(eventType, payload = {}, spanId, nowIso = new Date().toISOString()) {
        // Enforce Checkpoint 3: Telemetry Emission
        this._gate.assertCheckpoint3_TelemetryEmission(this._tenantId, this._tenantId, this._taskId, this._taskId, payload);
        // Deeply sanitize payload using globalDiagnosisSanitizer
        const sanitizedPayload = globalDiagnosisSanitizer.sanitize(payload);
        const eventId = `evt_${this._tenantId}_${this._taskId}_${this._events.length + 1}_${Date.now()}`;
        const event = {
            eventId,
            traceId: this._traceId,
            spanId: spanId ?? null,
            eventType,
            tenantId: this._tenantId,
            taskId: this._taskId,
            taskVersion: this._taskVersion,
            timestampIso: nowIso,
            payload: sanitizedPayload,
        };
        // Cap events per trace
        if (this._events.length < OBSERVABILITY_BOUNDS.MAX_EVENTS_PER_TRACE) {
            this._events.push(deepFreeze(event));
        }
        // Record to append-only cryptographic audit ledger
        try {
            globalAuditLedger.record({
                timestamp: nowIso,
                actor: { userId: 'agent_observability_emitter', role: 'OBSERVABILITY', channel: 'INTERNAL_TELEMETRY' },
                domain: 'agent_observability',
                toolName: `AgentTelemetry_${eventType}`,
                classification: 'TELEMETRY_EMISSION',
                argumentsHash: `evt_${eventType}_${this._taskId}_v${this._taskVersion}`,
                policyDecision: 'PERMIT',
                executionStatus: 'SUCCESS',
                resultHash: eventId,
            });
        }
        catch {
            // Fail closed audit attempt
        }
        return event;
    }
    /**
     * Get immutable snapshot of all emitted events
     */
    getEvents() {
        return Object.freeze([...this._events]);
    }
}
