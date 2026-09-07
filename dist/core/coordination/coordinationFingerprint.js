// src/core/coordination/coordinationFingerprint.ts
// BOWCON V4.0 — MILESTONE 1.3.17: DETERMINISTIC COORDINATION FINGERPRINTING
//
// EN:
// Computes deterministic FNV-1a 32-bit hashes for Brain identities, surface identities,
// continuity contexts, handoffs, records, checkpoints, and failures.
// Guarantees 100% deterministic identity without random numbers or timestamps.
//
// VI:
// Tính toán mã băm FNV-1a 32-bit tất định cho định danh Não bộ, định danh bề mặt,
// ngữ cảnh liên tục, bàn giao, bản ghi, checkpoint và lỗi.
// Bảo đảm định danh tất định 100% không dùng số ngẫu nhiên hoặc timestamp.
/**
 * EN: Computes a 32-bit FNV-1a hash over an array of normalized string tokens.
 * VI: Tính toán mã băm FNV-1a 32-bit trên một mảng các token chuỗi chuẩn hóa.
 */
function fnv1a32(tokens) {
    const payload = tokens.join('::');
    let hash = 2166136261;
    for (let i = 0; i < payload.length; i++) {
        hash = Math.imul(hash ^ payload.charCodeAt(i), 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
/**
 * EN: Computes deterministic Brain identity and fingerprint.
 * VI: Tính toán định danh và fingerprint Não bộ tất định.
 */
export function computeBrainIdentity(ownerUserId, seed = 'BOWCON_V4_BRAIN') {
    const hash = fnv1a32([ownerUserId, seed]);
    const brainId = `brain_${hash}`;
    const fingerprint = `brainfp_${hash}`;
    return { brainId, fingerprint };
}
/**
 * EN: Computes deterministic Surface identity and fingerprint.
 * VI: Tính toán định danh và fingerprint Bề mặt tất định.
 */
export function computeSurfaceIdentity(surfaceType, name, capabilities) {
    const capsStr = [
        capabilities.canTextInput ? '1' : '0',
        capabilities.canVoiceInput ? '1' : '0',
        capabilities.canTextOutput ? '1' : '0',
        capabilities.canVoiceOutput ? '1' : '0',
        capabilities.canDisplayScreen ? '1' : '0',
        capabilities.canCaptureCamera ? '1' : '0',
        capabilities.canPhysicalMotion ? '1' : '0',
        capabilities.canNotify ? '1' : '0',
        (capabilities.customCapabilities || []).join(','),
    ].join(':');
    const hash = fnv1a32([surfaceType, name, capsStr]);
    const surfaceId = `surface_${surfaceType.toLowerCase()}_${hash}`;
    const fingerprint = `surffp_${hash}`;
    return { surfaceId, fingerprint };
}
/**
 * EN: Computes deterministic fingerprint for a continuity context.
 * VI: Tính toán fingerprint tất định cho ngữ cảnh liên tục.
 */
export function computeContinuityFingerprint(brainId, userId, sessionId, sequence, risk, activeSurfaceIds) {
    return `contfp_${fnv1a32([
        brainId,
        userId,
        sessionId,
        sequence.toString(),
        risk,
        activeSurfaceIds.slice().sort().join(','),
    ])}`;
}
/**
 * EN: Computes deterministic fingerprint for a surface handoff.
 * VI: Tính toán fingerprint tất định cho một lượt bàn giao bề mặt.
 */
export function computeHandoffFingerprint(handoffId, brainId, sourceSurfaceId, targetSurfaceId, sequence) {
    return `handoff_${fnv1a32([
        handoffId,
        brainId,
        sourceSurfaceId,
        targetSurfaceId,
        sequence.toString(),
    ])}`;
}
/**
 * EN: Computes deterministic fingerprint for a coordination record.
 * VI: Tính toán fingerprint tất định cho bản ghi điều phối.
 */
export function computeCoordinationRecordFingerprint(recordId, brainId, sequence, action) {
    return `coordrec_${fnv1a32([
        recordId,
        brainId,
        sequence.toString(),
        action,
    ])}`;
}
/**
 * EN: Computes deterministic fingerprint for a coordination checkpoint.
 * VI: Tính toán fingerprint tất định cho checkpoint điều phối.
 */
export function computeCoordinationCheckpointFingerprint(checkpointId, brainId, sequence) {
    return `coordchk_${fnv1a32([
        checkpointId,
        brainId,
        sequence.toString(),
    ])}`;
}
/**
 * EN: Computes deterministic fingerprint for a coordination failure descriptor.
 * VI: Tính toán fingerprint tất định cho bộ mô tả lỗi điều phối.
 */
export function computeCoordinationFailureFingerprint(category, message, brainId, userId) {
    return `coordfail_${fnv1a32([
        category,
        message,
        brainId,
        userId,
    ])}`;
}
