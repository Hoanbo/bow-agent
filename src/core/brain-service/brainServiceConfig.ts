// src/core/brain-service/brainServiceConfig.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Hardware-Independent Deployment Configuration.
//
// INVARIANT: Hardware determines available resources.
// Hardware must NOT determine Brain identity or cognitive architecture.
// The same Brain Service runs on Dual Xeon Server or 1-Chip Workstation.

import path from 'node:path';
import type { BrainHostMode, BrainServiceMode } from './brainServiceTypes.js';

export interface BrainServiceConfig {
  readonly hostMode?: BrainHostMode;
  readonly serviceMode?: BrainServiceMode;
  readonly dataDir?: string;
  readonly maxQueueSize?: number;
  readonly requestTimeoutMs?: number;
  readonly drainTimeoutMs?: number;
  readonly enablePersistence?: boolean;
  readonly brainSeed?: string;
  readonly allowedRealityBaseDir?: string;
}

export interface ResolvedBrainServiceConfig {
  readonly hostMode: BrainHostMode;
  readonly serviceMode: BrainServiceMode;
  readonly dataDir: string;
  readonly stateFilePath: string;
  readonly maxQueueSize: number;
  readonly requestTimeoutMs: number;
  readonly drainTimeoutMs: number;
  readonly enablePersistence: boolean;
  readonly brainSeed: string;
  readonly allowedRealityBaseDir: string;
}

export function resolveBrainServiceConfig(
  overrides: BrainServiceConfig = {}
): ResolvedBrainServiceConfig {
  const envHostMode = process.env.BRAIN_HOST_MODE as BrainHostMode | undefined;
  const envServiceMode = process.env.BRAIN_SERVICE_MODE as BrainServiceMode | undefined;
  const envDataDir = process.env.BRAIN_DATA_DIR;

  const hostMode: BrainHostMode = overrides.hostMode ?? envHostMode ?? 'workstation';
  const serviceMode: BrainServiceMode = overrides.serviceMode ?? envServiceMode ?? 'standalone';
  const baseDataDir = overrides.dataDir ?? envDataDir ?? path.join('data', 'brain-service');
  const resolvedDataDir = path.resolve(baseDataDir);

  const stateFilePath = path.join(resolvedDataDir, 'brain_service_state.json');

  const maxQueueSize = overrides.maxQueueSize ?? (hostMode === 'server' ? 200 : 50);
  const requestTimeoutMs = overrides.requestTimeoutMs ?? 60000;
  const drainTimeoutMs = overrides.drainTimeoutMs ?? 10000;
  const enablePersistence = overrides.enablePersistence ?? true;
  const brainSeed = overrides.brainSeed ?? 'bowcon_authoritative';

  const defaultRealityDir = path.resolve(path.join('data', 'brain', 'reality'));
  const allowedRealityBaseDir = overrides.allowedRealityBaseDir
    ? path.resolve(overrides.allowedRealityBaseDir)
    : defaultRealityDir;

  return Object.freeze({
    hostMode,
    serviceMode,
    dataDir: resolvedDataDir,
    stateFilePath,
    maxQueueSize,
    requestTimeoutMs,
    drainTimeoutMs,
    enablePersistence,
    brainSeed,
    allowedRealityBaseDir,
  });
}
