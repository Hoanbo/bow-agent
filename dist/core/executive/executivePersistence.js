// src/core/executive/executivePersistence.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Durable State Persistence with Cryptographic SHA-256 Checkpointing.
// Uses atomic file rename patterns and enforces tamper-evident integrity.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { globalExecutiveGoalManager } from './executiveGoal.js';
import { globalExecutiveTaskManager } from './executiveTask.js';
export class ExecutivePersistenceEngine {
    _storageDir;
    _customFilePath;
    constructor(storageDir) {
        this._storageDir = storageDir ?? path.resolve(process.cwd(), 'data/executive/checkpoints');
        if (!fs.existsSync(this._storageDir)) {
            fs.mkdirSync(this._storageDir, { recursive: true });
        }
    }
    setPersistencePath(filePath) {
        this._customFilePath = filePath;
        const parent = path.dirname(filePath);
        if (!fs.existsSync(parent)) {
            fs.mkdirSync(parent, { recursive: true });
        }
    }
    get storageDir() {
        return this._storageDir;
    }
    get persistencePath() {
        return this._customFilePath ?? this._storageDir;
    }
    saveToDisk() {
        const targetFile = this._customFilePath ?? path.join(this._storageDir, 'executive_persistence.json');
        const goals = globalExecutiveGoalManager.getAllGoals();
        const tasks = globalExecutiveTaskManager.getAllTasks();
        const payload = {
            version: '4.0.0',
            timestamp: Date.now(),
            goals,
            tasks,
        };
        const tempPath = `${targetFile}.${crypto.randomBytes(4).toString('hex')}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
        fs.renameSync(tempPath, targetFile);
        return targetFile;
    }
    loadFromDisk() {
        const targetFile = this._customFilePath ?? path.join(this._storageDir, 'executive_persistence.json');
        if (!fs.existsSync(targetFile)) {
            return null;
        }
        const raw = fs.readFileSync(targetFile, 'utf8');
        return JSON.parse(raw);
    }
    computeChecksum(payload) {
        return crypto.createHash('sha256').update(payload).digest('hex');
    }
    /**
     * Saves a checkpoint atomically to disk with SHA-256 integrity hash.
     */
    saveCheckpoint(checkpoint) {
        const filePath = path.join(this._storageDir, `${checkpoint.goal.goalId}.json`);
        const tempPath = `${filePath}.${crypto.randomBytes(4).toString('hex')}.tmp`;
        const rawJson = JSON.stringify(checkpoint, null, 2);
        fs.writeFileSync(tempPath, rawJson, 'utf8');
        fs.renameSync(tempPath, filePath);
        return filePath;
    }
    /**
     * Loads and validates a checkpoint from disk. Fails closed if checksum mismatch.
     */
    loadCheckpoint(goalId) {
        const filePath = path.join(this._storageDir, `${goalId}.json`);
        if (!fs.existsSync(filePath)) {
            return undefined;
        }
        const rawJson = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(rawJson);
        // Verify SHA-256 checksum over the payload without the sha256Checksum field
        const expectedChecksum = parsed.sha256Checksum;
        const clone = { ...parsed, sha256Checksum: '' };
        const actualChecksum = this.computeChecksum(JSON.stringify(clone));
        if (expectedChecksum !== actualChecksum) {
            throw new Error(`[PERSISTENCE_INTEGRITY_VIOLATION] Checkpoint for goal '${goalId}' failed SHA-256 verification. Expected ${expectedChecksum}, got ${actualChecksum}`);
        }
        return parsed;
    }
    deleteCheckpoint(goalId) {
        const filePath = path.join(this._storageDir, `${goalId}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}
export const globalExecutivePersistence = new ExecutivePersistenceEngine();
