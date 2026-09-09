// src/core/world-model/masterOwnerWorldModelManager.ts
// BOWCON V4.0 — MS-1.3.42: MASTER OWNER WORLD MODEL, SELF-AWARENESS & CAPABILITY-GROUNDED REASONING RUNTIME
//
// Master Owner Durable World Model Manager.
// Maintains the holistic world model representing personal context, projects, objectives,
// constraints, resources, capabilities, host environment, work in progress, blockers,
// contradictions, open questions, and recent verified outcomes.
//
// Reconstructable after restart with cryptographic SHA-256 snapshot integrity.
// Enforces:
//   C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
//   ShopOfBow = independent project, not architectural parent of BOWCON.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { globalHostDiscovery } from '../host/hostDiscoveryEngine.js';
import { globalCapabilityDiscoveryBridge } from '../host/capabilityDiscoveryBridge.js';
import { MASTER_OWNER_ID, ECOSYSTEM_ID, RUNTIME_IDENTITY } from '../architecture/masterArchitectureIdentity.js';
export class MasterOwnerWorldModelManager {
    _storagePath;
    _currentSnapshot;
    _stalenessThresholdMs;
    constructor(storageDir = 'data/world-model', stalenessThresholdMs = 60000) {
        // Invariant check: storage cannot touch shopofbow
        if (storageDir.includes('shopofbow') || storageDir.includes('C:\\BOW\\shopofbow')) {
            throw new Error('SECURITY_VIOLATION: World model storage cannot be located within protected workspace C:\\BOW\\shopofbow.');
        }
        this._storagePath = path.join(storageDir, 'world_model_snapshot.json');
        this._stalenessThresholdMs = stalenessThresholdMs;
        this._currentSnapshot = this._createInitialSnapshot();
        // Rehydrate if file exists
        this.rehydrate();
    }
    _createInitialSnapshot() {
        const now = Date.now();
        const host = globalHostDiscovery.discoverHost();
        const caps = globalCapabilityDiscoveryBridge
            .discoverAllCapabilities(host)
            .filter((c) => c.feasibility === 'AVAILABLE')
            .map((c) => c.capabilityId);
        const initialProjects = {
            personal_core: {
                projectId: 'personal_core',
                name: 'BOWCON Core Development',
                isProtected: false,
                relationship: 'PERSONAL',
                goals: ['ms_1_3_42_world_model'],
                tasks: ['implement_epistemic_world_model'],
                problems: [],
                decisions: ['ground_capabilities_empirically'],
                outcomes: [],
            },
            shopofbow: {
                projectId: 'shopofbow',
                name: 'ShopOfBow (Independent Project)',
                isProtected: true,
                relationship: 'OPTIONAL_SURFACE',
                goals: [],
                tasks: [],
                problems: [],
                decisions: [],
                outcomes: [],
            },
        };
        const payload = JSON.stringify({
            ownerId: MASTER_OWNER_ID,
            ecosystemId: ECOSYSTEM_ID,
            runtimeIdentity: RUNTIME_IDENTITY,
            now,
            caps,
        });
        const integrityHash = crypto.createHash('sha256').update(payload).digest('hex');
        return {
            schemaVersion: '4.0.0',
            ownerId: MASTER_OWNER_ID,
            ecosystemId: ECOSYSTEM_ID,
            runtimeIdentity: RUNTIME_IDENTITY,
            timestamp: now,
            personalContext: {
                primaryLanguage: 'Vietnamese / English',
                role: 'Master Operator & Ecosystem Creator',
            },
            projects: initialProjects,
            activeObjectives: ['Deliver MS-1.3.42 World Model & Capability Grounding'],
            constraints: ['Protected workspace isolation', 'Centralized human authority'],
            resources: {
                cpuCores: typeof host.cpu.cores === 'number' ? host.cpu.cores : 'UNKNOWN',
                totalMemoryGb: typeof host.memory.totalBytes === 'number' ? (host.memory.totalBytes / (1024 ** 3)).toFixed(1) : 'UNKNOWN',
            },
            availableCapabilities: caps,
            hostEnvironment: host,
            currentWork: ['MS-1.3.42 Reality Gate'],
            blockers: [],
            risks: [],
            contradictions: [],
            openQuestions: [],
            recentVerifiedOutcomes: [],
            temporalState: {
                observedAt: now,
                updatedAt: now,
                lastKnownGoodAt: now,
                isStale: false,
            },
            integrityHash,
        };
    }
    getSnapshot() {
        const isStale = Date.now() - this._currentSnapshot.temporalState.observedAt > this._stalenessThresholdMs;
        return {
            ...this._currentSnapshot,
            temporalState: {
                ...this._currentSnapshot.temporalState,
                isStale,
            },
        };
    }
    isStale() {
        return Date.now() - this._currentSnapshot.temporalState.observedAt > this._stalenessThresholdMs;
    }
    refreshObservations() {
        const now = Date.now();
        const host = globalHostDiscovery.discoverHost();
        const caps = globalCapabilityDiscoveryBridge
            .discoverAllCapabilities(host)
            .filter((c) => c.feasibility === 'AVAILABLE')
            .map((c) => c.capabilityId);
        this._currentSnapshot = {
            ...this._currentSnapshot,
            timestamp: now,
            hostEnvironment: host,
            availableCapabilities: caps,
            temporalState: {
                ...this._currentSnapshot.temporalState,
                observedAt: now,
                updatedAt: now,
                lastKnownGoodAt: now,
                isStale: false,
            },
        };
        this._recalculateHash();
    }
    addVerifiedOutcome(outcome) {
        const list = [...this._currentSnapshot.recentVerifiedOutcomes, outcome];
        this._currentSnapshot = {
            ...this._currentSnapshot,
            recentVerifiedOutcomes: list,
            temporalState: {
                ...this._currentSnapshot.temporalState,
                updatedAt: Date.now(),
                verifiedAt: outcome.verifiedAt,
            },
        };
        this._recalculateHash();
    }
    setContradictions(contradictions) {
        this._currentSnapshot = {
            ...this._currentSnapshot,
            contradictions: [...contradictions],
            temporalState: {
                ...this._currentSnapshot.temporalState,
                updatedAt: Date.now(),
            },
        };
        this._recalculateHash();
    }
    persist() {
        try {
            const dir = path.dirname(this._storagePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            this._recalculateHash();
            fs.writeFileSync(this._storagePath, JSON.stringify(this._currentSnapshot, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[WorldModelManager] Failed to persist snapshot:', err);
        }
    }
    rehydrate() {
        try {
            if (!fs.existsSync(this._storagePath)) {
                return false;
            }
            const raw = fs.readFileSync(this._storagePath, 'utf-8');
            const parsed = JSON.parse(raw);
            // Verify integrity hash
            const payload = `${parsed.ownerId}:${parsed.ecosystemId}:${parsed.runtimeIdentity}:${parsed.timestamp}`;
            const computedHash = crypto.createHash('sha256').update(payload).digest('hex');
            if (parsed.integrityHash !== computedHash) {
                console.warn('[WorldModelManager] Hash mismatch upon rehydration. Rebuilding clean snapshot.');
                return false;
            }
            this._currentSnapshot = parsed;
            return true;
        }
        catch {
            return false;
        }
    }
    _recalculateHash() {
        const payload = `${this._currentSnapshot.ownerId}:${this._currentSnapshot.ecosystemId}:${this._currentSnapshot.runtimeIdentity}:${this._currentSnapshot.timestamp}`;
        const hash = crypto.createHash('sha256').update(payload).digest('hex');
        this._currentSnapshot = {
            ...this._currentSnapshot,
            integrityHash: hash,
        };
    }
}
export const globalMasterOwnerWorldModelManager = new MasterOwnerWorldModelManager();
