// src/core/synchronization/syncService.ts
// BOWCON V4.0 — MILESTONE 1.3.18: BRAIN SYNCHRONIZATION SERVICE
//
// EN:
// Authoritative central synchronization subsystem for BOWCON Brain.
// Coordinates event publishing, monotonic sequencing, surface observation tracking,
// acknowledgement recording, synchronization checkpoints, and state reconciliation.
// Invariant: BRAIN IS THE ONLY AUTHORITATIVE COGNITIVE ENTITY.
//
// VI:
// Phân hệ đồng bộ hóa trung tâm có thẩm quyền cho Não bộ BOWCON.
// Điều phối công bố sự kiện, chuỗi đơn điệu, theo dõi quan sát của bề mặt,
// ghi nhận xác nhận (ACK), checkpoint đồng bộ hóa và hòa giải trạng thái.
// Bất biến: NÃO BỘ LÀ THỰC THỂ NHẬN THỨC CÓ THẨM QUYỀN DUY NHẤT.
import { validateSyncScope, validateEventIdentifier, assertEventRiskPreservation, } from './eventValidator.js';
import { createBrainEventEnvelope } from './eventEnvelope.js';
import { computeObservationFingerprint, computeAcknowledgementFingerprint, } from './eventFingerprint.js';
import { ScopedSynchronizationState } from './syncState.js';
import { createSyncCheckpoint } from './syncCheckpoint.js';
import { reconcileSynchronizationState } from './syncReconciliation.js';
import { createSyncRecord, createSyncFailureDescriptor, } from './syncResult.js';
import { deepFreeze } from './eventEnvelope.js';
export class SynchronizationService {
    scopes = new Map();
    auditRecords = [];
    /**
     * EN: Computes authoritative composite key: ${userId}::${sessionId}::${brainId}.
     * VI: Tính toán khóa phức hợp có thẩm quyền: ${userId}::${sessionId}::${brainId}.
     */
    buildScopeKey(userId, sessionId, brainId) {
        const scope = validateSyncScope(userId, sessionId, brainId);
        return `${scope.userId}::${scope.sessionId}::${scope.brainId}`;
    }
    /**
     * EN: Gets or creates the scoped synchronization state.
     * VI: Lấy hoặc khởi tạo trạng thái đồng bộ hóa theo phạm vi.
     */
    getOrCreateScope(userId, sessionId, brainId) {
        const scopeKey = this.buildScopeKey(userId, sessionId, brainId);
        let state = this.scopes.get(scopeKey);
        if (!state) {
            const scope = validateSyncScope(userId, sessionId, brainId);
            state = new ScopedSynchronizationState(scope.brainId, scope.userId, scope.sessionId);
            this.scopes.set(scopeKey, state);
        }
        return state;
    }
    /**
     * EN: Publishes an authoritative event onto the Brain sequence timeline.
     * VI: Công bố một sự kiện có thẩm quyền lên dòng thời gian chuỗi của Não bộ.
     */
    publishEvent(params) {
        const scope = validateSyncScope(params.userId, params.sessionId, params.brainId);
        const state = this.getOrCreateScope(scope.userId, scope.sessionId, scope.brainId);
        // 1. Monotonic risk preservation check against last event
        const lastEvent = state.eventRegistry.getLastEvent();
        if (lastEvent && lastEvent.riskLevel && params.riskLevel) {
            try {
                assertEventRiskPreservation(lastEvent.riskLevel, params.riskLevel);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                const failure = createSyncFailureDescriptor({
                    code: 'RISK_DOWNGRADE',
                    message,
                    brainId: scope.brainId,
                    userId: scope.userId,
                    sessionId: scope.sessionId,
                    sequence: params.sequence,
                });
                state.setLastError({ code: 'RISK_DOWNGRADE', reason: message, timestamp: Date.now() });
                return { success: false, failure };
            }
        }
        // 2. Create validated BrainEvent envelope
        let event;
        try {
            event = createBrainEventEnvelope(params);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const failure = createSyncFailureDescriptor({
                code: 'INVALID_EVENT',
                message,
                brainId: scope.brainId,
                userId: scope.userId,
                sessionId: scope.sessionId,
                sequence: params.sequence,
            });
            state.setLastError({ code: 'INVALID_EVENT', reason: message, timestamp: Date.now() });
            return { success: false, failure };
        }
        // 3. Append to authoritative registry
        const regResult = state.eventRegistry.appendEvent(event);
        if (!regResult.accepted) {
            if (regResult.duplicate) {
                return {
                    success: false,
                    duplicate: true,
                    event: regResult.event,
                };
            }
            const code = regResult.failureCode ?? 'EVENT_CONFLICT';
            const reason = regResult.reason ?? 'Event rejected by registry';
            if (code === 'STALE_EVENT') {
                state.setHealth('STALE');
            }
            else if (code === 'SEQUENCE_GAP') {
                state.setHealth('GAP_DETECTED');
            }
            else {
                state.setHealth('CONFLICTED');
            }
            const failure = createSyncFailureDescriptor({
                code,
                message: reason,
                brainId: scope.brainId,
                userId: scope.userId,
                sessionId: scope.sessionId,
                sequence: event.sequence,
                eventId: event.eventId,
            });
            state.setLastError({ code, reason, timestamp: Date.now() });
            return { success: false, failure };
        }
        // 4. Record audit entry
        const record = createSyncRecord({
            brainId: scope.brainId,
            userId: scope.userId,
            sessionId: scope.sessionId,
            sequence: event.sequence,
            action: `PUBLISH_${event.eventType}`,
            eventId: event.eventId,
        });
        this.auditRecords.push(record);
        return {
            success: true,
            event,
        };
    }
    /**
     * EN: Retrieves synchronization state snapshot for a scope.
     * VI: Lấy ảnh chụp trạng thái đồng bộ hóa cho một phạm vi.
     */
    getSynchronizationState(userId, sessionId, brainId) {
        const scope = validateSyncScope(userId, sessionId, brainId);
        const state = this.getOrCreateScope(scope.userId, scope.sessionId, scope.brainId);
        return state.toSnapshot();
    }
    /**
     * EN: Retrieves events chronologically, optionally starting after a given sequence.
     * VI: Truy xuất các sự kiện theo trình tự thời gian, tùy chọn bắt đầu sau một số thứ tự nhất định.
     */
    getEvents(userId, sessionId, brainId, sinceSequence = 0) {
        const scope = validateSyncScope(userId, sessionId, brainId);
        const state = this.getOrCreateScope(scope.userId, scope.sessionId, scope.brainId);
        return state.eventRegistry.getEventsSince(sinceSequence);
    }
    /**
     * EN: Retrieves a single event by sequence or event ID.
     * VI: Truy xuất một sự kiện đơn lẻ theo số thứ tự hoặc event ID.
     */
    getEvent(userId, sessionId, brainId, sequenceOrId) {
        const scope = validateSyncScope(userId, sessionId, brainId);
        const state = this.getOrCreateScope(scope.userId, scope.sessionId, scope.brainId);
        if (typeof sequenceOrId === 'number') {
            return state.eventRegistry.getEventBySequence(sequenceOrId);
        }
        return state.eventRegistry.getEventById(sequenceOrId);
    }
    /**
     * EN: Registers an active surface for observation.
     * VI: Đăng ký một bề mặt hoạt động để theo dõi quan sát.
     */
    registerActiveSurface(userId, sessionId, brainId, surfaceId) {
        const scope = validateSyncScope(userId, sessionId, brainId);
        const validSurfaceId = validateEventIdentifier('surfaceId', surfaceId);
        const state = this.getOrCreateScope(scope.userId, scope.sessionId, scope.brainId);
        state.registerActiveSurface(validSurfaceId);
    }
    /**
     * EN: Removes an active surface (e.g., surface disconnects or goes idle).
     * Note: Disconnection does NOT destroy Brain state or session.
     * VI: Xóa một bề mặt hoạt động (ví dụ: bề mặt ngắt kết nối hoặc chuyển sang nghỉ).
     * Lưu ý: Việc ngắt kết nối KHÔNG hủy hoại trạng thái Não bộ hay phiên làm việc.
     */
    removeActiveSurface(userId, sessionId, brainId, surfaceId) {
        const scope = validateSyncScope(userId, sessionId, brainId);
        const validSurfaceId = validateEventIdentifier('surfaceId', surfaceId);
        const state = this.getOrCreateScope(scope.userId, scope.sessionId, scope.brainId);
        state.removeActiveSurface(validSurfaceId);
    }
    /**
     * EN: Records that a surface observed a Brain event.
     * Invariant: EVENT OBSERVED != EVENT EXECUTED.
     * VI: Ghi nhận một bề mặt đã quan sát một sự kiện Não bộ.
     * Bất biến: SỰ KIỆN ĐƯỢC QUAN SÁT != SỰ KIỆN ĐƯỢC THỰC THI.
     */
    recordSurfaceObservation(params) {
        const scope = validateSyncScope(params.userId, params.sessionId, params.brainId);
        const surfaceId = validateEventIdentifier('surfaceId', params.surfaceId);
        const eventId = validateEventIdentifier('eventId', params.eventId);
        const state = this.getOrCreateScope(scope.userId, scope.sessionId, scope.brainId);
        // Verify event exists in Brain history
        const existing = state.eventRegistry.getEventBySequence(params.sequence);
        if (!existing || existing.eventId !== eventId) {
            const failure = createSyncFailureDescriptor({
                code: 'INVALID_EVENT',
                message: `Cannot record observation for non-existent or mismatched event "${eventId}" at sequence ${params.sequence}.`,
                brainId: scope.brainId,
                userId: scope.userId,
                sessionId: scope.sessionId,
                sequence: params.sequence,
                surfaceId,
                eventId,
            });
            return { success: false, failure };
        }
        const fingerprint = computeObservationFingerprint({
            surfaceId,
            eventId,
            sequence: params.sequence,
        });
        const observation = deepFreeze({
            surfaceId,
            eventId,
            sequence: params.sequence,
            observedAt: params.timestamp ?? 0,
            fingerprint,
        });
        state.recordObservation(observation);
        return {
            success: true,
            observation,
        };
    }
    /**
     * EN: Records that a surface acknowledged processing of a Brain event.
     * Invariant: EVENT ACKNOWLEDGED != TASK SUCCESS, and DOES NOT imply tool execution.
     * VI: Ghi nhận một bề mặt đã xác nhận đã xử lý sự kiện Não bộ.
     * Bất biến: SỰ KIỆN ĐÃ ĐƯỢC XÁC NHẬN != TÁC VỤ THÀNH CÔNG, và KHÔNG hàm ý thực thi công cụ.
     */
    recordSurfaceAcknowledgement(params) {
        const scope = validateSyncScope(params.userId, params.sessionId, params.brainId);
        const surfaceId = validateEventIdentifier('surfaceId', params.surfaceId);
        const eventId = validateEventIdentifier('eventId', params.eventId);
        const state = this.getOrCreateScope(scope.userId, scope.sessionId, scope.brainId);
        // Verify event exists in Brain history
        const existing = state.eventRegistry.getEventBySequence(params.sequence);
        if (!existing || existing.eventId !== eventId) {
            const failure = createSyncFailureDescriptor({
                code: 'INVALID_EVENT',
                message: `Cannot record acknowledgement for non-existent or mismatched event "${eventId}" at sequence ${params.sequence}.`,
                brainId: scope.brainId,
                userId: scope.userId,
                sessionId: scope.sessionId,
                sequence: params.sequence,
                surfaceId,
                eventId,
            });
            return { success: false, failure };
        }
        const fingerprint = computeAcknowledgementFingerprint({
            surfaceId,
            eventId,
            sequence: params.sequence,
        });
        const acknowledgement = deepFreeze({
            surfaceId,
            eventId,
            sequence: params.sequence,
            acknowledgedAt: params.timestamp ?? 0,
            fingerprint,
        });
        state.recordAcknowledgement(acknowledgement);
        return {
            success: true,
            acknowledgement,
        };
    }
    /**
     * EN: Creates an immutable synchronization checkpoint representing the state at sequence N.
     * VI: Tạo một checkpoint đồng bộ hóa bất biến biểu diễn trạng thái tại số thứ tự N.
     */
    createCheckpoint(params) {
        const scope = validateSyncScope(params.userId, params.sessionId, params.brainId);
        const state = this.getOrCreateScope(scope.userId, scope.sessionId, scope.brainId);
        const lastSeq = state.eventRegistry.getLastSequence();
        const lastEvent = state.eventRegistry.getLastEvent();
        const latestEventId = lastEvent ? lastEvent.eventId : 'evt_initial';
        const latestEventFingerprint = lastEvent ? lastEvent.fingerprint : 'fnv1a_00000000';
        // Collect all acknowledged surfaces
        const ackedSurfacesSet = new Set();
        for (const surfaceId of state.getActiveSurfaces()) {
            const acks = state.getAcknowledgementsForSurface(surfaceId);
            if (acks.some(a => a.sequence === lastSeq)) {
                ackedSurfacesSet.add(surfaceId);
            }
        }
        const checkpoint = createSyncCheckpoint({
            brainId: scope.brainId,
            userId: scope.userId,
            sessionId: scope.sessionId,
            sequence: lastSeq,
            latestEventId,
            latestEventFingerprint,
            continuityId: params.continuityId,
            activeSurfaces: state.getActiveSurfaces(),
            acknowledgedSurfaces: Array.from(ackedSurfacesSet).sort(),
            metadata: params.metadata,
            timestamp: params.timestamp,
        });
        state.setLatestCheckpoint(checkpoint);
        return checkpoint;
    }
    /**
     * EN: Reconciles an incoming surface synchronization state against authoritative Brain state.
     * VI: Hòa giải trạng thái đồng bộ hóa bề mặt gửi đến so với trạng thái Não bộ có thẩm quyền.
     */
    reconcile(params) {
        const scope = validateSyncScope(params.userId, params.sessionId, params.brainId);
        const state = this.getOrCreateScope(scope.userId, scope.sessionId, scope.brainId);
        const brainState = {
            brainId: scope.brainId,
            userId: scope.userId,
            sessionId: scope.sessionId,
            sequence: state.eventRegistry.getLastSequence(),
            latestEventId: state.eventRegistry.getLastEvent()?.eventId,
            latestEventFingerprint: state.eventRegistry.getLastEvent()?.fingerprint,
            getEventBySequence: (seq) => {
                const ev = state.eventRegistry.getEventBySequence(seq);
                return ev ? { eventId: ev.eventId, fingerprint: ev.fingerprint } : undefined;
            },
        };
        const incoming = {
            brainId: scope.brainId,
            userId: scope.userId,
            sessionId: scope.sessionId,
            sequence: params.incomingState.sequence,
            latestEventId: params.incomingState.latestEventId,
            latestEventFingerprint: params.incomingState.latestEventFingerprint,
        };
        return reconcileSynchronizationState(brainState, incoming);
    }
    /**
     * EN: Returns immutable audit records.
     * VI: Trả về các bản ghi kiểm toán bất biến.
     */
    getAuditRecords() {
        return Object.freeze([...this.auditRecords]);
    }
}
