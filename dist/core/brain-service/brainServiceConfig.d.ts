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
export declare function resolveBrainServiceConfig(overrides?: BrainServiceConfig): ResolvedBrainServiceConfig;
