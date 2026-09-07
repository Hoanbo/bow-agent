import type { SurfaceType, SurfaceCapabilities, CoordinationFailureCategory } from './coordinationTypes.js';
/**
 * EN: Computes deterministic Brain identity and fingerprint.
 * VI: Tính toán định danh và fingerprint Não bộ tất định.
 */
export declare function computeBrainIdentity(ownerUserId: string, seed?: string): {
    brainId: string;
    fingerprint: string;
};
/**
 * EN: Computes deterministic Surface identity and fingerprint.
 * VI: Tính toán định danh và fingerprint Bề mặt tất định.
 */
export declare function computeSurfaceIdentity(surfaceType: SurfaceType, name: string, capabilities: SurfaceCapabilities): {
    surfaceId: string;
    fingerprint: string;
};
/**
 * EN: Computes deterministic fingerprint for a continuity context.
 * VI: Tính toán fingerprint tất định cho ngữ cảnh liên tục.
 */
export declare function computeContinuityFingerprint(brainId: string, userId: string, sessionId: string, sequence: number, risk: string, activeSurfaceIds: readonly string[]): string;
/**
 * EN: Computes deterministic fingerprint for a surface handoff.
 * VI: Tính toán fingerprint tất định cho một lượt bàn giao bề mặt.
 */
export declare function computeHandoffFingerprint(handoffId: string, brainId: string, sourceSurfaceId: string, targetSurfaceId: string, sequence: number): string;
/**
 * EN: Computes deterministic fingerprint for a coordination record.
 * VI: Tính toán fingerprint tất định cho bản ghi điều phối.
 */
export declare function computeCoordinationRecordFingerprint(recordId: string, brainId: string, sequence: number, action: string): string;
/**
 * EN: Computes deterministic fingerprint for a coordination checkpoint.
 * VI: Tính toán fingerprint tất định cho checkpoint điều phối.
 */
export declare function computeCoordinationCheckpointFingerprint(checkpointId: string, brainId: string, sequence: number): string;
/**
 * EN: Computes deterministic fingerprint for a coordination failure descriptor.
 * VI: Tính toán fingerprint tất định cho bộ mô tả lỗi điều phối.
 */
export declare function computeCoordinationFailureFingerprint(category: CoordinationFailureCategory, message: string, brainId: string, userId: string): string;
