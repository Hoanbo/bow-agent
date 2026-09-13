// src/core/agentObservability/agentObservabilityRuntime.ts
// BOWCON V4.0 — MS-1.4.11: AGENT TASK OBSERVABILITY & DISTRIBUTED TRACING
// Component 965: AgentObservabilityRuntime
// Master Public Façade for Governed Agent Observability & Distributed Tracing
import { AgentObservabilityValidationError, deepFreeze, } from './agentTraceTypes.js';
import { AgentExecutionSpanGate } from './agentExecutionSpanGate.js';
import { AgentTraceCollector } from './agentTraceCollector.js';
import { AgentTaskTelemetryEmitter } from './agentTaskTelemetryEmitter.js';
import { AgentSLOBudgetTracker } from './agentSLOBudgetTracker.js';
import { globalAuditLedger } from '../auditLedger.js';
export class AgentObservabilityRuntime {
    _tenantId;
    _taskId;
    _taskVersion;
    _traceId;
    _rootSpanId;
    _startTimeIso;
    _gate;
    _collector;
    _emitter;
    _sloTracker;
    _status = 'ACTIVE';
    _endTimeIso = null;
    _durationMs = null;
    _sealedEnvelope = null;
    constructor(input, gateOptions) {
        this._gate = new AgentExecutionSpanGate(gateOptions);
        // Enforce Checkpoint 1: Trace Creation
        this._gate.assertCheckpoint1_TraceCreation(input.tenantId, input.taskId, input.taskVersion);
        this._tenantId = input.tenantId;
        this._taskId = input.taskId;
        this._taskVersion = input.taskVersion;
        this._traceId = input.customTraceId || `trc_${input.tenantId}_${input.taskId}_${Date.now()}`;
        this._gate.validateIdentifier(this._traceId, 'traceId');
        this._startTimeIso = input.startTimeIso || new Date().toISOString();
        this._collector = new AgentTraceCollector(this._tenantId, this._taskId, this._taskVersion, this._traceId, this._gate);
        this._emitter = new AgentTaskTelemetryEmitter(this._tenantId, this._taskId, this._taskVersion, this._traceId, this._gate);
        this._sloTracker = new AgentSLOBudgetTracker(this._tenantId, this._taskId, this._taskVersion, Date.parse(this._startTimeIso) || Date.now());
        // Create Root Task Span
        this._rootSpanId = `spn_${this._tenantId}_${this._taskId}_ROOT`;
        this._collector.startSpan({
            stage: 'TASK_INTAKE',
            customSpanId: this._rootSpanId,
            provenanceReferences: input.initialProvenance,
            startTimeIso: this._startTimeIso,
        });
        // Record Audit
        try {
            globalAuditLedger.record({
                timestamp: this._startTimeIso,
                actor: { userId: 'agent_observability_runtime', role: 'OBSERVABILITY', channel: 'INTERNAL_ORCHESTRATION' },
                domain: 'agent_observability',
                toolName: 'AgentObservabilityRuntime',
                classification: 'TRACE_START',
                argumentsHash: `trace_start_${this._traceId}_v${this._taskVersion}`,
                policyDecision: 'PERMIT',
                executionStatus: 'SUCCESS',
                resultHash: this._traceId,
            });
        }
        catch {
            // Fail closed audit attempt
        }
    }
    /**
     * Static factory method to start a new trace
     */
    static startTrace(input, gateOptions) {
        return new AgentObservabilityRuntime(input, gateOptions);
    }
    get traceId() {
        return this._traceId;
    }
    get tenantId() {
        return this._tenantId;
    }
    get taskId() {
        return this._taskId;
    }
    get taskVersion() {
        return this._taskVersion;
    }
    get rootSpanId() {
        return this._rootSpanId;
    }
    get status() {
        return this._status;
    }
    /**
     * Start a new child execution span
     */
    startSpan(input) {
        if (this._status !== 'ACTIVE') {
            throw new AgentObservabilityValidationError(`Cannot start span in trace [${this._traceId}]: trace is already ${this._status}`);
        }
        const parent = input.parentSpanId === undefined ? this._rootSpanId : input.parentSpanId;
        return this._collector.startSpan({
            ...input,
            parentSpanId: parent,
        });
    }
    /**
     * End and seal an execution span
     */
    endSpan(input) {
        return this._collector.endSpan(input);
    }
    /**
     * Record a lifecycle telemetry event
     */
    recordTelemetry(eventType, payload = {}, spanId) {
        if (this._status !== 'ACTIVE') {
            throw new AgentObservabilityValidationError(`Cannot emit telemetry in trace [${this._traceId}]: trace is already ${this._status}`);
        }
        return this._emitter.emitEvent(eventType, payload, spanId);
    }
    /**
     * Record SLO latency or counter increments
     */
    recordCognitionLatency(durationMs) {
        this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
        this._sloTracker.recordCognitionLatency(durationMs);
    }
    recordToolLatency(durationMs) {
        this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
        this._sloTracker.recordToolLatency(durationMs);
    }
    recordVerificationLatency(durationMs) {
        this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
        this._sloTracker.recordVerificationLatency(durationMs);
    }
    recordCommitLatency(durationMs) {
        this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
        this._sloTracker.recordCommitLatency(durationMs);
    }
    recordMemoryLatency(durationMs) {
        this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
        this._sloTracker.recordMemoryLatency(durationMs);
    }
    incrementIteration() {
        this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
        this._sloTracker.incrementIteration();
    }
    incrementStep() {
        this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
        this._sloTracker.incrementStep();
    }
    incrementRetry() {
        this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
        this._sloTracker.incrementRetry();
    }
    incrementDenial() {
        this._gate.assertCheckpoint4_SLOMeasurement(this._tenantId, this._taskId);
        this._sloTracker.incrementDenial();
    }
    /**
     * Seal the trace and build the immutable AgentTraceEnvelope
     */
    sealTrace(finalStatus = 'COMPLETED', finalProvenance, nowIso = new Date().toISOString()) {
        if (this._sealedEnvelope) {
            return this._sealedEnvelope;
        }
        const mergedProv = {
            ...this._collector.getAggregatedProvenance(),
            ...(finalProvenance || {}),
        };
        // Assert Checkpoint 6: Trace Sealing
        this._gate.assertCheckpoint6_TraceSealing(this._tenantId, this._taskId, mergedProv);
        // End root span if still active
        const rootSpan = this._collector.getSpan(this._rootSpanId);
        if (rootSpan && rootSpan.status === 'ACTIVE') {
            const rootSpanStatus = finalStatus === 'COMPLETED' ? 'COMPLETED' : finalStatus === 'ABORTED' ? 'ABORTED' : 'FAILED';
            this._collector.endSpan({
                spanId: this._rootSpanId,
                status: rootSpanStatus,
                endTimeIso: nowIso,
                provenanceReferences: mergedProv,
            });
        }
        this._status = finalStatus === 'ABORTED' ? 'ABORTED' : 'SEALED';
        this._endTimeIso = nowIso;
        const startMs = Date.parse(this._startTimeIso);
        const endMs = Date.parse(nowIso);
        this._durationMs = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
            ? endMs - startMs
            : 0;
        const sloSummary = this._sloTracker.getSummary(endMs);
        const envelope = {
            traceId: this._traceId,
            rootSpanId: this._rootSpanId,
            tenantId: this._tenantId,
            taskId: this._taskId,
            taskVersion: this._taskVersion,
            startTimeIso: this._startTimeIso,
            endTimeIso: this._endTimeIso,
            durationMs: this._durationMs,
            status: this._status,
            spans: this._collector.getAllSpans(),
            events: this._emitter.getEvents(),
            sloSummary,
            provenanceReferences: Object.freeze(mergedProv),
            sealedAtIso: nowIso,
        };
        this._sealedEnvelope = deepFreeze(envelope);
        try {
            globalAuditLedger.record({
                timestamp: nowIso,
                actor: { userId: 'agent_observability_runtime', role: 'OBSERVABILITY', channel: 'INTERNAL_ORCHESTRATION' },
                domain: 'agent_observability',
                toolName: 'AgentObservabilityRuntime',
                classification: 'TRACE_SEALED',
                argumentsHash: `trace_sealed_${this._traceId}_${finalStatus}`,
                policyDecision: 'PERMIT',
                executionStatus: finalStatus === 'COMPLETED' ? 'SUCCESS' : 'BLOCKED',
                resultHash: this._traceId,
            });
        }
        catch {
            // Fail closed audit attempt
        }
        return this._sealedEnvelope;
    }
    /**
     * Export the immutable sealed envelope as an AgentObservabilityResult
     */
    exportResult() {
        // Assert Checkpoint 7: Export
        this._gate.assertCheckpoint7_Export(this._tenantId, this._taskId);
        const env = this._sealedEnvelope || this.sealTrace();
        const result = {
            success: env.status === 'SEALED',
            traceId: this._traceId,
            envelope: env,
            error: env.status === 'ABORTED' ? { code: 'TRACE_ABORTED', message: 'Trace was aborted by user or security gate' } : null,
        };
        return deepFreeze(result);
    }
}
