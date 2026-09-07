// src/core/coordination/coordinationSurface.ts
// BOWCON V4.0 — MILESTONE 1.3.17: SURFACE ABSTRACTION & FACTORY
//
// EN:
// Pure data models and factories for presentation and embodiment surfaces.
// Environment-neutral: Does NOT import mobile, robot, or browser runtimes.
//
// VI:
// Các mô hình dữ liệu thuần túy và factory cho các bề mặt trình bày và hiện thân.
// Trung lập về môi trường: KHÔNG import các runtime mobile, robot hoặc trình duyệt.

import type {
  SurfaceType,
  SurfaceCapabilities,
  SurfaceIdentity,
  ActiveSurface,
  SurfaceStatus,
} from './coordinationTypes.js';
import { computeSurfaceIdentity } from './coordinationFingerprint.js';

/**
 * EN: Deep freezes an object recursively.
 * VI: Đóng băng sâu một đối tượng một cách đệ quy.
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

/**
 * EN: Creates an immutable SurfaceIdentity record.
 * VI: Tạo một bản ghi SurfaceIdentity bất biến.
 */
export function createSurface(
  surfaceType: SurfaceType,
  name: string,
  capabilities?: Partial<SurfaceCapabilities>,
): SurfaceIdentity {
  const resolvedCaps: SurfaceCapabilities = deepFreeze({
    canTextInput: capabilities?.canTextInput ?? true,
    canVoiceInput: capabilities?.canVoiceInput ?? false,
    canTextOutput: capabilities?.canTextOutput ?? true,
    canVoiceOutput: capabilities?.canVoiceOutput ?? false,
    canDisplayScreen: capabilities?.canDisplayScreen ?? true,
    canCaptureCamera: capabilities?.canCaptureCamera ?? false,
    canPhysicalMotion: capabilities?.canPhysicalMotion ?? false,
    canNotify: capabilities?.canNotify ?? true,
    customCapabilities: capabilities?.customCapabilities
      ? Object.freeze([...capabilities.customCapabilities])
      : Object.freeze([]),
  });

  const { surfaceId, fingerprint } = computeSurfaceIdentity(surfaceType, name, resolvedCaps);

  return deepFreeze({
    surfaceId,
    surfaceType,
    name,
    capabilities: resolvedCaps,
    registeredAt: Date.now(),
    fingerprint,
  });
}

/**
 * EN: Creates an immutable ActiveSurface record.
 * VI: Tạo một bản ghi ActiveSurface bất biến.
 */
export function createActiveSurface(
  surface: SurfaceIdentity,
  status: SurfaceStatus,
  sessionId: string,
  sequence: number,
): ActiveSurface {
  return deepFreeze({
    surface: deepFreeze({ ...surface }),
    status,
    lastHeartbeat: Date.now(),
    sessionId,
    sequence,
  });
}
