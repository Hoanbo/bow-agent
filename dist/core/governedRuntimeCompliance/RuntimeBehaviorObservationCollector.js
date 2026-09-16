// src/core/governedRuntimeCompliance/RuntimeBehaviorObservationCollector.ts
// Component 1189: RuntimeBehaviorObservationCollector (REAL)
//
// Ingests, validates, sanitizes, and buffers live execution telemetry profiles.
// Strictly OBSERVATION_ONLY: zero tool dispatch, zero execution authority, zero policy mutation.
// Thu thập, thẩm định, làm sạch và đệm các hồ sơ đo lường thực thi trực tiếp.
// Hoàn toàn CHỈ QUAN SÁT: không điều phối công cụ, không có thẩm quyền thực thi, không thay đổi chính sách.
import { ObservationSanitizationError, TemporalClockSkewError, ObservationReplayError, TenantAccessForbiddenError, EmergencyStopActiveError, MAX_CLOCK_SKEW_TOLERANCE_MS, } from './GovernedRuntimeComplianceTypes.js';
const FORBIDDEN_SECRET_KEYS = new Set([
    'apikey',
    'password',
    'token',
    'secret',
    'signature',
    'hmac',
    'privatekey',
    'credential',
    'authorization',
    'auth',
    'bearer',
]);
const WINDOWS_RESERVED_DEVICE_NAMES = new Set([
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);
const TENANT_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
export class RuntimeBehaviorObservationCollector {
    stopProvider;
    seenObservationIds = new Map(); // observationId -> receivedTimestamp
    sessionSequenceMap = new Map(); // sessionId -> highestSequence
    maxReplayCacheSize = 10_000;
    observationBuffer = [];
    maxBufferSize = 5_000;
    constructor(stopProvider) {
        this.stopProvider = stopProvider;
    }
    // Check emergency stop dominance fail-closed.
    // Kiểm tra tính tối thượng của công tắc khẩn cấp theo cơ chế đóng an toàn.
    assertEmergencyStopInactive() {
        if (!this.stopProvider)
            return;
        let active = true;
        try {
            const result = this.stopProvider.isEmergencyStopActive();
            if (typeof result !== 'boolean') {
                active = true;
            }
            else {
                active = result;
            }
        }
        catch (_err) {
            active = true;
        }
        if (active) {
            throw new EmergencyStopActiveError('Observation collection halted: EMERGENCY_STOP is currently active.');
        }
    }
    // Validate tenant identity and enforce strict isolation.
    // Thẩm định danh tính tenant và thực thi cô lập tuyệt đối.
    assertValidTenantId(tenantId) {
        if (!tenantId || typeof tenantId !== 'string') {
            throw new TenantAccessForbiddenError('Tenant ID must be a non-empty string.');
        }
        const trimmed = tenantId.trim();
        if (!TENANT_ID_REGEX.test(trimmed)) {
            throw new TenantAccessForbiddenError(`Invalid tenant ID format '${tenantId}'. Must match ^[a-zA-Z0-9_-]{1,64}$.`);
        }
        if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('\0')) {
            throw new TenantAccessForbiddenError(`Path traversal detected in tenant ID '${tenantId}'.`);
        }
        if (WINDOWS_RESERVED_DEVICE_NAMES.has(trimmed.toUpperCase())) {
            throw new TenantAccessForbiddenError(`Tenant ID matches reserved Windows device name '${tenantId}'.`);
        }
    }
    // Deep sanitize telemetry parameters, permanently redacting secrets.
    // Làm sạch sâu các tham số đo lường, loại bỏ vĩnh viễn các thông tin nhạy cảm.
    sanitizeParameters(params) {
        const sanitized = {};
        for (const [key, value] of Object.entries(params)) {
            const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
            const isSecret = Array.from(FORBIDDEN_SECRET_KEYS).some((sec) => lowerKey.includes(sec));
            if (isSecret) {
                sanitized[key] = '[REDACTED_SECRET]';
            }
            else if (value && typeof value === 'object' && !Array.isArray(value)) {
                sanitized[key] = this.sanitizeParameters(value);
            }
            else if (Array.isArray(value)) {
                sanitized[key] = value.map((item) => item && typeof item === 'object'
                    ? this.sanitizeParameters(item)
                    : item);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    // Ingest raw telemetry into an immutable RuntimeBehavioralProfile.
    // Tiếp nhận dữ liệu đo lường thô thành một RuntimeBehavioralProfile bất biến.
    ingestObservation(raw) {
        this.assertEmergencyStopInactive();
        this.assertValidTenantId(raw.tenantId);
        if (!raw.observationId || typeof raw.observationId !== 'string') {
            throw new ObservationSanitizationError('observationId must be a valid non-empty string.');
        }
        // Replay defense: verify uniqueness of observationId
        // Phòng thủ phát lại: xác minh tính duy nhất của observationId
        const replayKey = `${raw.tenantId}:${raw.observationId}`;
        if (this.seenObservationIds.has(replayKey)) {
            throw new ObservationReplayError(`Replay attack detected: observationId '${raw.observationId}' has already been ingested.`);
        }
        // Temporal integrity: verify clock skew within tolerance
        // Tính toàn vẹn thời gian: xác minh độ lệch đồng hồ trong giới hạn cho phép
        const obsTime = new Date(raw.timestamp).getTime();
        if (isNaN(obsTime)) {
            throw new TemporalClockSkewError(`Invalid observation timestamp '${raw.timestamp}'.`);
        }
        const now = Date.now();
        if (Math.abs(obsTime - now) > MAX_CLOCK_SKEW_TOLERANCE_MS) {
            throw new TemporalClockSkewError(`Clock skew exceeded tolerance: observation timestamp '${raw.timestamp}' differs by ${Math.abs(obsTime - now)}ms (limit ${MAX_CLOCK_SKEW_TOLERANCE_MS}ms).`);
        }
        // Monotonic sequence verification per session
        // Xác minh tính đơn điệu của chuỗi tuần tự theo từng phiên
        if (raw.sessionId) {
            const sessionKey = `${raw.tenantId}:${raw.sessionId}`;
            const lastSeq = this.sessionSequenceMap.get(sessionKey) ?? -1;
            if (raw.sequenceNumber <= lastSeq) {
                throw new ObservationSanitizationError(`Sequence regression detected for session '${raw.sessionId}': received ${raw.sequenceNumber}, expected > ${lastSeq}.`);
            }
            this.sessionSequenceMap.set(sessionKey, raw.sequenceNumber);
        }
        // Cache seen observation
        if (this.seenObservationIds.size >= this.maxReplayCacheSize) {
            const oldestKey = this.seenObservationIds.keys().next().value;
            if (oldestKey)
                this.seenObservationIds.delete(oldestKey);
        }
        this.seenObservationIds.set(replayKey, now);
        // Sanitize parameters
        const sanitizedParams = this.sanitizeParameters(raw.parameters ?? {});
        const profile = Object.freeze({
            observationId: raw.observationId,
            tenantId: raw.tenantId,
            policyDomain: raw.policyDomain,
            timestamp: raw.timestamp,
            actionName: raw.actionName,
            actionClassification: raw.actionClassification,
            parameters: Object.freeze(sanitizedParams),
            executionOutcome: raw.executionOutcome,
            sessionId: raw.sessionId,
            agentId: raw.agentId,
            sequenceNumber: raw.sequenceNumber,
        });
        if (this.observationBuffer.length >= this.maxBufferSize) {
            this.observationBuffer.shift(); // Drop oldest telemetry on buffer overflow
        }
        this.observationBuffer.push(profile);
        return profile;
    }
    getBufferedObservations() {
        return Object.freeze([...this.observationBuffer]);
    }
    clearBuffer() {
        this.observationBuffer.length = 0;
    }
}
