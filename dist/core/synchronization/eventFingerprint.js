// src/core/synchronization/eventFingerprint.ts
// BOWCON V4.0 — MILESTONE 1.3.18: DETERMINISTIC EVENT FINGERPRINTING
//
// EN:
// Deterministic non-cryptographic FNV-1a 32-bit hashing for Brain events, checkpoints,
// observations, acknowledgements, and conflict descriptors. Zero randomness, zero timestamps in identity.
//
// VI:
// Giải thuật băm FNV-1a 32-bit phi mật mã tất định cho các sự kiện Não bộ, checkpoint,
// quan sát, xác nhận và bộ mô tả xung đột. Không ngẫu nhiên, không dùng timestamp trong định danh.
/**
 * EN: Computes standard 32-bit FNV-1a hash formatted as 8-character hex.
 * VI: Tính toán mã băm FNV-1a 32-bit tiêu chuẩn dưới dạng hex 8 ký tự.
 */
export function fnv1aHex(input) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
/**
 * EN: Deterministically stringifies payload with sorted keys to avoid object key order jitter.
 * VI: Chuyển đổi payload thành chuỗi tất định với các key được sắp xếp để tránh rung giật thứ tự key.
 */
export function canonicalStringify(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(canonicalStringify).join(',')}]`;
    }
    const obj = value;
    const sortedKeys = Object.keys(obj).sort();
    const entries = sortedKeys.map(key => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`);
    return `{${entries.join(',')}}`;
}
/**
 * EN: Computes deterministic fingerprint for a BrainEvent.
 * VI: Tính toán fingerprint tất định cho một BrainEvent.
 */
export function computeEventFingerprint(params) {
    const canonical = [
        `brain:${params.brainId}`,
        `user:${params.userId}`,
        `session:${params.sessionId}`,
        `seq:${params.sequence}`,
        `prev:${params.previousSequence}`,
        `type:${params.eventType}`,
        `corr:${params.correlationId}`,
        `caus:${params.causationId}`,
        `src:${params.source}`,
        `target:${params.targetSurfaceId ?? 'none'}`,
        `risk:${params.riskLevel ?? 'none'}`,
        `payload:${canonicalStringify(params.payload ?? {})}`,
    ].join('|');
    return `fnv1a_${fnv1aHex(canonical)}`;
}
/**
 * EN: Derives deterministic event identifier: evt_<fingerprint>.
 * VI: Suy xuất định danh sự kiện tất định: evt_<fingerprint>.
 */
export function computeEventIdentity(params) {
    const fp = computeEventFingerprint(params);
    return `evt_${fp.replace('fnv1a_', '')}`;
}
/**
 * EN: Computes deterministic fingerprint for a synchronization checkpoint.
 * VI: Tính toán fingerprint tất định cho checkpoint đồng bộ hóa.
 */
export function computeSyncCheckpointFingerprint(params) {
    const canonical = [
        `brain:${params.brainId}`,
        `user:${params.userId}`,
        `session:${params.sessionId}`,
        `seq:${params.sequence}`,
        `latestEvt:${params.latestEventId}`,
        `latestFp:${params.latestEventFingerprint}`,
        `active:[${[...params.activeSurfaces].sort().join(',')}]`,
        `acked:[${[...params.acknowledgedSurfaces].sort().join(',')}]`,
    ].join('|');
    return `chk_sync_${fnv1aHex(canonical)}`;
}
/**
 * EN: Computes fingerprint for a surface observation record.
 * VI: Tính toán fingerprint cho bản ghi quan sát của bề mặt.
 */
export function computeObservationFingerprint(params) {
    const canonical = `obs|surface:${params.surfaceId}|evt:${params.eventId}|seq:${params.sequence}`;
    return `obs_${fnv1aHex(canonical)}`;
}
/**
 * EN: Computes fingerprint for a surface acknowledgement record.
 * VI: Tính toán fingerprint cho bản ghi xác nhận của bề mặt.
 */
export function computeAcknowledgementFingerprint(params) {
    const canonical = `ack|surface:${params.surfaceId}|evt:${params.eventId}|seq:${params.sequence}`;
    return `ack_${fnv1aHex(canonical)}`;
}
/**
 * EN: Computes fingerprint for a synchronization conflict descriptor.
 * VI: Tính toán fingerprint cho bộ mô tả xung đột đồng bộ hóa.
 */
export function computeConflictFingerprint(params) {
    const canonical = `conflict|brain:${params.brainId}|seq:${params.sequence}|existing:${params.existingEventId}|incoming:${params.incomingEventId}|reason:${params.reason}`;
    return `conflict_${fnv1aHex(canonical)}`;
}
