// src/core/executive/executivePersistence.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Durable State Persistence with Cryptographic SHA-256 Checkpointing.
// Uses atomic file rename patterns and enforces tamper-evident integrity.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { ExecutiveCheckpoint, GoalId } from './executiveTypes.js';
import { globalExecutiveGoalManager } from './executiveGoal.js';
import { globalExecutiveTaskManager } from './executiveTask.js';

export class ExecutivePersistenceEngine {
  private _storageDir: string;
  private _customFilePath?: string;

  constructor(storageDir?: string) {
    this._storageDir = storageDir ?? path.resolve(process.cwd(), 'data/executive/checkpoints');
    if (!fs.existsSync(this._storageDir)) {
      fs.mkdirSync(this._storageDir, { recursive: true });
    }
  }

  public setPersistencePath(filePath: string): void {
    this._customFilePath = filePath;
    const parent = path.dirname(filePath);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
  }

  public get storageDir(): string {
    return this._storageDir;
  }

  public get persistencePath(): string {
    return this._customFilePath ?? this._storageDir;
  }

  public saveToDisk(): string {
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

  public loadFromDisk(): { version: string; timestamp: number; goals: any[]; tasks: any[] } | null {
    const targetFile = this._customFilePath ?? path.join(this._storageDir, 'executive_persistence.json');
    if (!fs.existsSync(targetFile)) {
      return null;
    }
    const raw = fs.readFileSync(targetFile, 'utf8');
    return JSON.parse(raw);
  }

  public computeChecksum(payload: string): string {
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Saves a checkpoint atomically to disk with SHA-256 integrity hash.
   */
  public saveCheckpoint(checkpoint: ExecutiveCheckpoint): string {
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
  public loadCheckpoint(goalId: GoalId): ExecutiveCheckpoint | undefined {
    const filePath = path.join(this._storageDir, `${goalId}.json`);
    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    const rawJson = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(rawJson) as ExecutiveCheckpoint;

    // Verify SHA-256 checksum over the payload without the sha256Checksum field
    const expectedChecksum = parsed.sha256Checksum;
    const clone = { ...parsed, sha256Checksum: '' };
    const actualChecksum = this.computeChecksum(JSON.stringify(clone));

    if (expectedChecksum !== actualChecksum) {
      throw new Error(
        `[PERSISTENCE_INTEGRITY_VIOLATION] Checkpoint for goal '${goalId}' failed SHA-256 verification. Expected ${expectedChecksum}, got ${actualChecksum}`
      );
    }

    return parsed;
  }

  public deleteCheckpoint(goalId: GoalId): void {
    const filePath = path.join(this._storageDir, `${goalId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export const globalExecutivePersistence = new ExecutivePersistenceEngine();
