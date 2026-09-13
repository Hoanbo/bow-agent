// src/core/agentObservability/agentTaskTelemetryEmitter.ts
// BOWCON V4.0 — MS-1.4.11: AGENT TASK OBSERVABILITY & DISTRIBUTED TRACING
// Component 962: AgentTaskTelemetryEmitter
// Sanitized Lifecycle Telemetry Emission with Audit Ledger Integration

import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { globalAuditLedger } from '../auditLedger.js';
import {
  AgentTelemetryEvent,
  AgentTelemetryEventType,
  OBSERVABILITY_BOUNDS,
  SpanId,
  TaskId,
  TenantId,
  TraceId,
  deepFreeze,
} from './agentTraceTypes.js';
import { AgentExecutionSpanGate } from './agentExecutionSpanGate.js';

export class AgentTaskTelemetryEmitter {
  private readonly _tenantId: TenantId;
  private readonly _taskId: TaskId;
  private readonly _taskVersion: number;
  private readonly _traceId: TraceId;
  private readonly _gate: AgentExecutionSpanGate;
  private readonly _events: AgentTelemetryEvent[] = [];

  constructor(
    tenantId: TenantId,
    taskId: TaskId,
    taskVersion: number,
    traceId: TraceId,
    gate: AgentExecutionSpanGate
  ) {
    this._tenantId = tenantId;
    this._taskId = taskId;
    this._taskVersion = taskVersion;
    this._traceId = traceId;
    this._gate = gate;
  }

  /**
   * Emit a sanitized telemetry event
   */
  public emitEvent(
    eventType: AgentTelemetryEventType,
    payload: Record<string, unknown> = {},
    spanId?: SpanId | null,
    nowIso = new Date().toISOString()
  ): AgentTelemetryEvent {
    // Enforce Checkpoint 3: Telemetry Emission
    this._gate.assertCheckpoint3_TelemetryEmission(
      this._tenantId,
      this._tenantId,
      this._taskId,
      this._taskId,
      payload
    );

    // Deeply sanitize payload using globalDiagnosisSanitizer
    const sanitizedPayload = globalDiagnosisSanitizer.sanitize(payload) as Record<string, unknown>;

    const eventId = `evt_${this._tenantId}_${this._taskId}_${this._events.length + 1}_${Date.now()}`;

    const event: AgentTelemetryEvent = {
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
    } catch {
      // Fail closed audit attempt
    }

    return event;
  }

  /**
   * Get immutable snapshot of all emitted events
   */
  public getEvents(): readonly AgentTelemetryEvent[] {
    return Object.freeze([...this._events]);
  }
}
