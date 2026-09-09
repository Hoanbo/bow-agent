// src/core/agent-loop/agentLoopPersistence.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Checkpoint Persistence & Crash Recovery Engine.
//
// Invariants:
// ZERO SECRETS IN PLAINTEXT
// ZERO REUSABLE CONSUMED TOKENS
// NEVER BLINDLY RESUME PHYSICAL MUTATION FROM STALE CHECKPOINT

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AgentLoopCheckpoint,
  AgentLoopObjective,
  AgentLoopObservation,
  AgentLoopDecision,
  AgentLoopPlan,
  AgentLoopState,
  AuthorizationState,
} from './agentLoopTypes.js';

export class AgentLoopPersistenceManager {
  private readonly checkpointDir: string;
  private readonly checkpointFile: string;

  constructor(baseDir?: string) {
    this.checkpointDir = baseDir || path.resolve(process.cwd(), 'data', 'agent-loop');
    this.checkpointFile = path.join(this.checkpointDir, 'loop_checkpoint.json');
    if (!fs.existsSync(this.checkpointDir)) {
      fs.mkdirSync(this.checkpointDir, { recursive: true });
    }
  }

  private redactSecrets(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.redactSecrets(item));

    const scrubbed: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (/key|token|secret|password|auth|credential/i.test(key)) {
        scrubbed[key] = '[REDACTED_SECRET]';
      } else if (typeof val === 'object' && val !== null) {
        scrubbed[key] = this.redactSecrets(val);
      } else {
        scrubbed[key] = val;
      }
    }
    return scrubbed;
  }

  public saveCheckpoint(params: {
    state: AgentLoopState;
    objective?: AgentLoopObjective;
    session: string;
    iteration: number;
    lastObservation?: AgentLoopObservation;
    lastDecision?: AgentLoopDecision;
    lastPlan?: AgentLoopPlan;
    authorizationState: AuthorizationState;
    verificationState?: string;
    recoveryAttempts: number;
  }): AgentLoopCheckpoint {
    const checkpointId = `chk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = Date.now();

    const payload = {
      checkpointId,
      timestamp,
      state: params.state,
      objective: this.redactSecrets(params.objective),
      session: params.session,
      iteration: params.iteration,
      lastObservation: this.redactSecrets(params.lastObservation),
      lastDecision: this.redactSecrets(params.lastDecision),
      lastPlan: this.redactSecrets(params.lastPlan),
      authorizationState: params.authorizationState,
      verificationState: params.verificationState,
      recoveryAttempts: params.recoveryAttempts,
    };

    const checkpointHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const checkpoint: AgentLoopCheckpoint = {
      ...payload,
      checkpointHash,
    };

    fs.writeFileSync(this.checkpointFile, JSON.stringify(checkpoint, null, 2), 'utf8');
    return checkpoint;
  }

  public loadCheckpoint(): AgentLoopCheckpoint | undefined {
    if (!fs.existsSync(this.checkpointFile)) return undefined;

    try {
      const raw = fs.readFileSync(this.checkpointFile, 'utf8');
      const checkpoint = JSON.parse(raw) as AgentLoopCheckpoint;

      // Verify integrity
      const { checkpointHash, ...payload } = checkpoint;
      const expectedHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

      if (checkpointHash !== expectedHash) {
        throw new Error('CORRUPTED_CHECKPOINT: SHA-256 hash mismatch.');
      }

      return checkpoint;
    } catch {
      return undefined;
    }
  }

  public isCheckpointStale(checkpoint: AgentLoopCheckpoint, maxAgeMs = 300000): boolean {
    const age = Date.now() - checkpoint.timestamp;
    return age > maxAgeMs;
  }

  public clear(): void {
    if (fs.existsSync(this.checkpointFile)) {
      try {
        fs.unlinkSync(this.checkpointFile);
      } catch {
        // ignore
      }
    }
  }
}

export const globalAgentLoopPersistence = new AgentLoopPersistenceManager();
