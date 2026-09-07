import type { SurfaceType, SurfaceCapabilities, SurfaceIdentity, ActiveSurface, SurfaceStatus } from './coordinationTypes.js';
/**
 * EN: Creates an immutable SurfaceIdentity record.
 * VI: Tạo một bản ghi SurfaceIdentity bất biến.
 */
export declare function createSurface(surfaceType: SurfaceType, name: string, capabilities?: Partial<SurfaceCapabilities>): SurfaceIdentity;
/**
 * EN: Creates an immutable ActiveSurface record.
 * VI: Tạo một bản ghi ActiveSurface bất biến.
 */
export declare function createActiveSurface(surface: SurfaceIdentity, status: SurfaceStatus, sessionId: string, sequence: number): ActiveSurface;
