// src/core/observability/driftDetectionEngine.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Deterministic runtime and configuration drift detection engine.
// Động cơ phát hiện sai lệch cấu hình và thời gian chạy xác định.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - DRIFT_DETECTION != AUTHORIZATION (Never autonomously repairs production).
// - DRIFT WORKFLOW: OBSERVE -> CLASSIFY -> RECORD -> REPORT -> ESCALATE.
// - All raw evidence preserved alongside classification.
// - Preserves deterministic SHA-256 evidence hashes.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { createDriftDetectionId, createDriftEventId, } from './observabilityTypes.js';
export class DriftDetectionEngine {
    events = new Map();
    /**
     * Classifies drift based on severity, type, and whether mutation was pre-declared.
     * Phân loại sai lệch dựa trên mức độ nghiêm trọng, loại và liệu đột biến đã được khai báo trước hay chưa.
     */
    classifyDrift(driftType, expectedState, observedState, isExpectedMutation) {
        if (expectedState === observedState) {
            return 'NO_DRIFT';
        }
        if (isExpectedMutation) {
            return 'EXPECTED_DRIFT';
        }
        switch (driftType) {
            case 'UNAUTHORIZED_MUTATION':
            case 'PROVENANCE_MISMATCH':
            case 'HASH_MISMATCH':
                return 'CRITICAL_DRIFT';
            case 'DEPLOYMENT_VERSION':
            case 'CONFIGURATION':
            case 'MANIFEST':
            case 'FILESYSTEM':
            default:
                return 'UNKNOWN_DRIFT';
        }
    }
    /**
     * Detects and records drift between expected and observed state.
     * Phát hiện và ghi lại sai lệch giữa trạng thái mong đợi và quan sát được.
     */
    detectDrift(input) {
        const classification = this.classifyDrift(input.driftType, input.expectedState, input.observedState, input.isExpectedMutation);
        const detectedAt = Date.now();
        const detectionId = input.detectionId ?? createDriftDetectionId(`detect_${detectedAt}_${crypto.randomBytes(3).toString('hex')}`);
        const eventId = createDriftEventId(`driftevt_${detectedAt}_${crypto.randomBytes(4).toString('hex')}`);
        let diffSummary;
        if (classification === 'NO_DRIFT') {
            diffSummary = `Identical state for ${input.driftType}: no divergence detected`;
        }
        else {
            diffSummary = `Divergence detected in ${input.driftType}: expected '${input.expectedState}', observed '${input.observedState}' (Classified: ${classification})`;
        }
        const evidencePayload = {
            eventId,
            detectionId,
            sessionId: input.sessionId,
            targetId: input.targetId,
            driftType: input.driftType,
            classification,
            expectedState: input.expectedState,
            observedState: input.observedState,
            diffSummary,
            detectedAt,
            contextDetails: input.contextDetails,
        };
        const evidenceHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(evidencePayload, Object.keys(evidencePayload).sort()))
            .digest('hex');
        const driftEvent = {
            eventId,
            detectionId,
            sessionId: input.sessionId,
            targetId: input.targetId,
            driftType: input.driftType,
            classification,
            expectedState: input.expectedState,
            observedState: input.observedState,
            diffSummary,
            detectedAt,
            evidenceHash,
        };
        const sessionEvents = this.events.get(input.sessionId) ?? [];
        sessionEvents.push(driftEvent);
        this.events.set(input.sessionId, sessionEvents);
        return driftEvent;
    }
    /**
     * Analyzes filesystem manifest drift by comparing expected entries against observed entries.
     * Phân tích sai lệch tệp kê khai hệ thống tệp bằng cách so sánh các mục mong đợi với các mục quan sát được.
     */
    detectFilesystemManifestDrift(sessionId, targetId, expectedManifest, observedManifest) {
        const results = [];
        const expectedMap = new Map(expectedManifest.map(e => [e.relativePath, e.sha256]));
        const observedMap = new Map(observedManifest.map(e => [e.relativePath, e.sha256]));
        // Check for modified and missing files
        // Kiểm tra các tệp bị sửa đổi và thiếu
        for (const [path, expectedHash] of expectedMap.entries()) {
            const observedHash = observedMap.get(path);
            if (!observedHash) {
                results.push(this.detectDrift({
                    sessionId,
                    targetId,
                    driftType: 'FILESYSTEM',
                    expectedState: `FILE_PRESENT:${expectedHash}`,
                    observedState: 'FILE_DELETED',
                    contextDetails: { path },
                }));
            }
            else if (observedHash !== expectedHash) {
                results.push(this.detectDrift({
                    sessionId,
                    targetId,
                    driftType: 'HASH_MISMATCH',
                    expectedState: expectedHash,
                    observedState: observedHash,
                    contextDetails: { path },
                }));
            }
        }
        // Check for unexpected newly created files
        // Kiểm tra các tệp mới tạo bất ngờ
        for (const [path, observedHash] of observedMap.entries()) {
            if (!expectedMap.has(path)) {
                results.push(this.detectDrift({
                    sessionId,
                    targetId,
                    driftType: 'UNAUTHORIZED_MUTATION',
                    expectedState: 'FILE_ABSENT',
                    observedState: `FILE_CREATED:${observedHash}`,
                    contextDetails: { path },
                }));
            }
        }
        return results;
    }
    /**
     * Retrieves all drift events recorded for a session.
     * Lấy tất cả các sự kiện sai lệch được ghi nhận cho một phiên.
     */
    getEvents(sessionId) {
        return this.events.get(sessionId) ?? [];
    }
    /**
     * Clears in-memory drift events.
     * Xóa các sự kiện sai lệch trong bộ nhớ.
     */
    clear(sessionId) {
        if (sessionId) {
            this.events.delete(sessionId);
        }
        else {
            this.events.clear();
        }
    }
}
