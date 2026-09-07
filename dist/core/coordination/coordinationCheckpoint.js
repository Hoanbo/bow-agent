// src/core/coordination/coordinationCheckpoint.ts
// BOWCON V4.0 — MILESTONE 1.3.17: COORDINATION CHECKPOINTS
//
// EN:
// Authoritative creation and validation of point-in-time Brain Coordination checkpoints.
// Captures active surface topologies, sequences, and cryptographic fingerprints.
//
// VI:
// Khởi tạo và xác thực có thẩm quyền các checkpoint Điều phối Não bộ tại một thời điểm.
// Lưu lại cấu trúc bề mặt tích cực, sequence và các mã băm mật mã.
import { computeCoordinationCheckpointFingerprint } from './coordinationFingerprint.js';
/**
 * EN: Deep freezes an object recursively.
 * VI: Đóng băng sâu một đối tượng một cách đệ quy.
 */
function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value);
        }
    }
    return obj;
}
/**
 * EN: Creates an immutable coordination checkpoint snapshot.
 * VI: Tạo một snapshot checkpoint điều phối bất biến.
 */
export function createCoordinationCheckpoint(brainId, userId, sessionId, sequence, activeSurfaces, metadata) {
    const checkpointId = `coord_chk_${brainId}_${sequence}`;
    const fingerprint = computeCoordinationCheckpointFingerprint(checkpointId, brainId, sequence);
    const activeSurfaceIds = activeSurfaces.map(s => s.surface.surfaceId);
    return deepFreeze({
        checkpointId,
        brainId,
        userId,
        sessionId,
        sequence,
        activeSurfaceIds: Object.freeze([...activeSurfaceIds]),
        fingerprint,
        timestamp: Date.now(),
        metadata: metadata ? deepFreeze({ ...metadata }) : undefined,
    });
}
