// src/core/synchronization/syncState.ts
// BOWCON V4.0 — MILESTONE 1.3.18: SCOPED SYNCHRONIZATION STATE MODEL
//
// EN:
// Authoritative in-memory state tracking for scoped Brain synchronization.
// Manages the relationship between Brain events, active surfaces, observations, and ACKs.
//
// VI:
// Mô hình trạng thái trong bộ nhớ có thẩm quyền cho đồng bộ hóa Não bộ theo phạm vi.
// Quản lý mối quan hệ giữa các sự kiện Não bộ, các bề mặt hoạt động, các lượt quan sát và xác nhận (ACK).
import { EventRegistry } from './eventRegistry.js';
import { deepFreeze } from './eventEnvelope.js';
export class ScopedSynchronizationState {
    brainId;
    userId;
    sessionId;
    eventRegistry;
    activeSurfaces = new Set();
    observationsBySurface = new Map();
    acknowledgementsBySurface = new Map();
    latestCheckpoint;
    health = 'HEALTHY';
    lastError;
    constructor(brainId, userId, sessionId) {
        this.brainId = brainId;
        this.userId = userId;
        this.sessionId = sessionId;
        this.eventRegistry = new EventRegistry(brainId, userId, sessionId);
    }
    registerActiveSurface(surfaceId) {
        this.activeSurfaces.add(surfaceId);
    }
    removeActiveSurface(surfaceId) {
        this.activeSurfaces.delete(surfaceId);
    }
    isSurfaceActive(surfaceId) {
        return this.activeSurfaces.has(surfaceId);
    }
    getActiveSurfaces() {
        return Object.freeze(Array.from(this.activeSurfaces).sort());
    }
    recordObservation(observation) {
        const list = this.observationsBySurface.get(observation.surfaceId) ?? [];
        list.push(observation);
        this.observationsBySurface.set(observation.surfaceId, list);
    }
    recordAcknowledgement(ack) {
        const list = this.acknowledgementsBySurface.get(ack.surfaceId) ?? [];
        list.push(ack);
        this.acknowledgementsBySurface.set(ack.surfaceId, list);
    }
    setLatestCheckpoint(checkpoint) {
        this.latestCheckpoint = checkpoint;
    }
    getLatestCheckpoint() {
        return this.latestCheckpoint;
    }
    setHealth(health) {
        this.health = health;
    }
    getHealth() {
        return this.health;
    }
    setLastError(error) {
        this.lastError = error;
    }
    getLastError() {
        return this.lastError;
    }
    getObservationsForSurface(surfaceId) {
        return Object.freeze([...(this.observationsBySurface.get(surfaceId) ?? [])]);
    }
    getAcknowledgementsForSurface(surfaceId) {
        return Object.freeze([...(this.acknowledgementsBySurface.get(surfaceId) ?? [])]);
    }
    /**
     * EN: Creates a deeply frozen snapshot of the current synchronization state.
     * VI: Tạo một ảnh chụp bất biến sâu về trạng thái đồng bộ hóa hiện tại.
     */
    toSnapshot() {
        const obsRecord = {};
        for (const [sId, obsList] of this.observationsBySurface.entries()) {
            obsRecord[sId] = Object.freeze([...obsList]);
        }
        const ackRecord = {};
        for (const [sId, ackList] of this.acknowledgementsBySurface.entries()) {
            ackRecord[sId] = Object.freeze([...ackList]);
        }
        const snapshot = {
            brainId: this.brainId,
            userId: this.userId,
            sessionId: this.sessionId,
            lastSequence: this.eventRegistry.getLastSequence(),
            latestEvent: this.eventRegistry.getLastEvent(),
            activeSurfaces: this.getActiveSurfaces(),
            surfaceObservations: obsRecord,
            surfaceAcknowledgements: ackRecord,
            latestCheckpoint: this.latestCheckpoint,
            health: this.health,
            lastError: this.lastError,
        };
        return deepFreeze(snapshot);
    }
}
