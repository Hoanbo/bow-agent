// src/core/agentObservability/agentTraceCollector.ts
// BOWCON V4.0 — MS-1.4.11: AGENT TASK OBSERVABILITY & DISTRIBUTED TRACING
// Component 961: AgentTraceCollector
// Deterministic Execution Span Collection & Parent-Child Hierarchy Enforcement
import { AgentObservabilityValidationError, OBSERVABILITY_BOUNDS, deepFreeze, } from './agentTraceTypes.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class AgentTraceCollector {
    _tenantId;
    _taskId;
    _taskVersion;
    _traceId;
    _gate;
    _spans = new Map();
    _spanOrder = [];
    _aggregatedProvenance = {};
    constructor(tenantId, taskId, taskVersion, traceId, gate) {
        this._tenantId = tenantId;
        this._taskId = taskId;
        this._taskVersion = taskVersion;
        this._traceId = traceId;
        this._gate = gate;
    }
    /**
     * Deterministic Span ID derivation
     */
    deriveSpanId(stage, stepId, executionId, sequence) {
        const cleanStep = stepId ? `_${stepId}` : '';
        const cleanExec = executionId ? `_${executionId}` : '';
        const seqPart = typeof sequence === 'number' ? `_sq${sequence}` : `_${this._spanOrder.length + 1}`;
        return `spn_${this._tenantId}_${this._taskId}_${stage}${cleanStep}${cleanExec}${seqPart}`;
    }
    /**
     * Start and register a new span
     */
    startSpan(input) {
        // Assert Gate Checkpoint 2: Span Collection
        this._gate.assertCheckpoint2_SpanCollection(this._tenantId, this._tenantId, this._taskId, this._taskId, this._taskVersion, this._taskVersion);
        const spanId = input.customSpanId || this.deriveSpanId(input.stage, input.stepId, input.executionId);
        this._gate.validateIdentifier(spanId, 'spanId');
        // Duplicate span ID rejection
        if (this._spans.has(spanId)) {
            throw new AgentObservabilityValidationError(`Duplicate spanId rejected: ${spanId}`);
        }
        // Verify parent span if provided
        if (input.parentSpanId) {
            if (!this._spans.has(input.parentSpanId)) {
                throw new AgentObservabilityValidationError(`Parent span [${input.parentSpanId}] not found in trace [${this._traceId}]`);
            }
        }
        // Capacity bound check
        if (this._spans.size >= OBSERVABILITY_BOUNDS.MAX_SPANS_PER_TRACE) {
            throw new AgentObservabilityValidationError(`Span limit reached: maximum ${OBSERVABILITY_BOUNDS.MAX_SPANS_PER_TRACE} spans per trace`);
        }
        // Sanitize attributes
        const rawAttrs = input.attributes || {};
        this._gate.validatePayload(rawAttrs);
        const sanitizedAttrs = globalDiagnosisSanitizer.sanitize(rawAttrs);
        const nowIso = input.startTimeIso || new Date().toISOString();
        const prov = {
            ...(input.provenanceReferences || {}),
        };
        this.mergeProvenance(prov);
        const span = {
            spanId,
            traceId: this._traceId,
            parentSpanId: input.parentSpanId ?? null,
            stage: input.stage,
            status: 'ACTIVE',
            tenantId: this._tenantId,
            taskId: this._taskId,
            taskVersion: this._taskVersion,
            stepId: input.stepId ?? null,
            executionId: input.executionId ?? null,
            startTimeIso: nowIso,
            endTimeIso: null,
            durationMs: null,
            attributes: sanitizedAttrs,
            provenanceReferences: Object.freeze(prov),
            error: null,
        };
        const frozen = deepFreeze(span);
        this._spans.set(spanId, frozen);
        this._spanOrder.push(spanId);
        return frozen;
    }
    /**
     * Complete and seal an active span
     */
    endSpan(input) {
        this._gate.assertCheckpoint5_SpanSealing(this._tenantId, this._taskId, input.spanId);
        const existing = this._spans.get(input.spanId);
        if (!existing) {
            throw new AgentObservabilityValidationError(`Span [${input.spanId}] not found for ending`);
        }
        if (existing.status !== 'ACTIVE') {
            throw new AgentObservabilityValidationError(`Span [${input.spanId}] has already been finalized with status ${existing.status}`);
        }
        const endIso = input.endTimeIso || new Date().toISOString();
        const startMs = Date.parse(existing.startTimeIso);
        const endMs = Date.parse(endIso);
        const durationMs = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
            ? endMs - startMs
            : 0;
        // Merge and sanitize additional attributes
        const additionalAttrs = input.attributes ? globalDiagnosisSanitizer.sanitize(input.attributes) : {};
        const mergedAttrs = {
            ...existing.attributes,
            ...additionalAttrs,
        };
        // Merge provenance
        const updatedProv = {
            ...existing.provenanceReferences,
            ...(input.provenanceReferences || {}),
        };
        this.mergeProvenance(updatedProv);
        const completedSpan = {
            ...existing,
            status: input.status,
            endTimeIso: endIso,
            durationMs,
            attributes: mergedAttrs,
            provenanceReferences: Object.freeze(updatedProv),
            error: input.error ?? null,
        };
        const frozen = deepFreeze(completedSpan);
        this._spans.set(input.spanId, frozen);
        return frozen;
    }
    mergeProvenance(prov) {
        this._aggregatedProvenance = {
            verificationProvenanceHash: prov.verificationProvenanceHash || this._aggregatedProvenance.verificationProvenanceHash || null,
            commitProvenanceHash: prov.commitProvenanceHash || this._aggregatedProvenance.commitProvenanceHash || null,
            memoryProvenanceHash: prov.memoryProvenanceHash || this._aggregatedProvenance.memoryProvenanceHash || null,
            cycleProvenanceHash: prov.cycleProvenanceHash || this._aggregatedProvenance.cycleProvenanceHash || null,
        };
    }
    getSpan(spanId) {
        return this._spans.get(spanId);
    }
    getAllSpans() {
        const list = [];
        for (const id of this._spanOrder) {
            const s = this._spans.get(id);
            if (s)
                list.push(s);
        }
        return Object.freeze(list);
    }
    getAggregatedProvenance() {
        return Object.freeze({ ...this._aggregatedProvenance });
    }
}
