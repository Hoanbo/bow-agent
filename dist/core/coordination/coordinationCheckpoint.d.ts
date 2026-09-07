import type { CoordinationCheckpoint, ActiveSurface } from './coordinationTypes.js';
/**
 * EN: Creates an immutable coordination checkpoint snapshot.
 * VI: Tạo một snapshot checkpoint điều phối bất biến.
 */
export declare function createCoordinationCheckpoint(brainId: string, userId: string, sessionId: string, sequence: number, activeSurfaces: readonly ActiveSurface[], metadata?: Readonly<Record<string, unknown>>): CoordinationCheckpoint;
