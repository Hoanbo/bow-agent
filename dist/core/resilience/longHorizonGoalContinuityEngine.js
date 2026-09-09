// src/core/resilience/longHorizonGoalContinuityEngine.ts
// BOWCON V4.0 — MS-1.3.44: LONG-HORIZON GOAL CONTINUITY ENGINE
//
// Tracks, monitors, and recovers long-horizon goals across sessions, process restarts,
// interrupted cycles, capability shifts, and host reconfigurations.
//
// INVARIANTS:
// - Inactivity != Abandoned. Inactivity != Failure.
// - Only Master Owner authority may definitively establish owner-semantic states:
//   ABANDONED, REPRIORITIZED, COMPLETED_BY_EXTERNAL_ACTION.
// - BOWCON may recommend status updates, but may not usurp Master Owner intent.
// - Goal continuity survives restart with cryptographic integrity validation.
// - Corrupted goal state is rejected fail-closed and safely rebuilt.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateResilienceId, } from './cognitiveResilienceTypes.js';
import { MASTER_OWNER_ID, isMasterOwner } from '../architecture/masterArchitectureIdentity.js';
export function computeGoalContinuityHash(goals) {
    const payload = JSON.stringify(goals.map((g) => ({
        goalId: g.goalId,
        sessionId: g.sessionId,
        projectId: g.projectId,
        state: g.state,
        progressPercent: g.progressPercent,
        createdAt: g.createdAt,
        lastProgressAt: g.lastProgressAt,
        ownerIntentOverride: g.ownerIntentOverride,
    })));
    return crypto.createHash('sha256').update(payload).digest('hex');
}
export class LongHorizonGoalContinuityEngine {
    _goals = new Map();
    _storagePath;
    _stallThresholdMs;
    constructor(options) {
        const rawDir = options?.storageDir ?? path.join('data', 'goal-continuity');
        if (rawDir.includes('shopofbow') || rawDir.includes('C:\\BOW\\shopofbow')) {
            throw new Error('SECURITY_VIOLATION: Goal continuity storage cannot target protected workspace C:\\BOW\\shopofbow.');
        }
        this._storagePath = path.join(rawDir, 'goals.json');
        this._stallThresholdMs = options?.stallThresholdMs ?? 60000; // 1 minute default threshold for testability
        this._rehydrate();
    }
    /**
     * Registers a new long-horizon goal.
     */
    registerGoal(params) {
        const goalId = params.goalId ?? generateResilienceId('lhg');
        const now = Date.now();
        const record = {
            goalId,
            sessionId: params.sessionId ?? 'session_default',
            projectId: params.projectId,
            title: params.title,
            objective: params.objective,
            state: 'ACTIVE',
            progressPercent: params.initialProgress ?? 0,
            createdAt: now,
            lastProgressAt: now,
            stalledDurationMs: 0,
            blockedDurationMs: 0,
            interruptionHistory: [],
            recoveryHistory: [],
            relatedEpisodeIds: [],
            relatedDecisions: [],
            relatedContradictions: [],
            currentFeasibility: 'FEASIBLE',
            capabilityDependencies: params.capabilityDependencies ?? [],
            isOwnerIntentAffirmed: false,
        };
        this._goals.set(goalId, record);
        this._persist();
        return record;
    }
    /**
     * Updates goal progress with verifiable metrics.
     * Resets stalled duration upon verified progress.
     */
    recordProgress(goalId, progressPercent, outcomeDetails) {
        const goal = this._getGoal(goalId);
        const now = Date.now();
        const newProgress = Math.min(100, Math.max(0, progressPercent));
        const isCompleted = newProgress >= 100;
        const updated = {
            ...goal,
            progressPercent: newProgress,
            state: isCompleted ? 'COMPLETED' : 'PROGRESSING',
            lastProgressAt: now,
            stalledDurationMs: 0, // reset stall upon progress
            latestVerifiedOutcome: outcomeDetails ?? goal.latestVerifiedOutcome,
        };
        this._goals.set(goalId, updated);
        this._persist();
        return updated;
    }
    /**
     * Evaluates stall status based on elapsed time since last meaningful progress.
     * INVARIANT: Inactivity != Abandonment. State transitions to STALLED or AT_RISK, never ABANDONED.
     */
    evaluateStallStatus(goalId, currentTime = Date.now()) {
        const goal = this._getGoal(goalId);
        if (goal.state === 'COMPLETED' || goal.state === 'ABANDONED') {
            return goal;
        }
        const elapsed = currentTime - goal.lastProgressAt;
        let newState = goal.state;
        if (elapsed >= this._stallThresholdMs * 2) {
            newState = 'AT_RISK';
        }
        else if (elapsed >= this._stallThresholdMs) {
            newState = 'STALLED';
        }
        const updated = {
            ...goal,
            state: newState,
            stalledDurationMs: elapsed,
        };
        this._goals.set(goalId, updated);
        this._persist();
        return updated;
    }
    /**
     * Records an interruption (e.g. host shutdown, process restart, or cycle interruption).
     */
    recordInterruption(goalId, reason) {
        const goal = this._getGoal(goalId);
        const now = Date.now();
        const history = [...goal.interruptionHistory, { interruptedAt: now, reason }];
        const updated = {
            ...goal,
            state: 'INTERRUPTED',
            interruptionHistory: history,
        };
        this._goals.set(goalId, updated);
        this._persist();
        return updated;
    }
    /**
     * Resumes an interrupted goal.
     */
    resumeInterruptedGoal(goalId) {
        const goal = this._getGoal(goalId);
        const now = Date.now();
        const history = goal.interruptionHistory.map((entry, idx) => {
            if (idx === goal.interruptionHistory.length - 1 && !entry.resumedAt) {
                return { ...entry, resumedAt: now };
            }
            return entry;
        });
        const updated = {
            ...goal,
            state: 'ACTIVE',
            interruptionHistory: history,
            lastProgressAt: now,
        };
        this._goals.set(goalId, updated);
        this._persist();
        return updated;
    }
    /**
     * Associates an episodic memory ID with the goal.
     */
    linkEpisode(goalId, episodeId) {
        const goal = this._getGoal(goalId);
        if (!goal.relatedEpisodeIds.includes(episodeId)) {
            const updated = {
                ...goal,
                relatedEpisodeIds: [...goal.relatedEpisodeIds, episodeId],
            };
            this._goals.set(goalId, updated);
            this._persist();
        }
    }
    /**
     * Updates capability feasibility for the goal.
     */
    updateFeasibility(goalId, feasibility, missingGap) {
        const goal = this._getGoal(goalId);
        const updated = {
            ...goal,
            currentFeasibility: feasibility,
            state: feasibility === 'PLAN_BLOCKED' ? 'BLOCKED' : goal.state,
            nextInformationGap: missingGap ?? goal.nextInformationGap,
        };
        this._goals.set(goalId, updated);
        this._persist();
        return updated;
    }
    /**
     * MASTER OWNER INTENT AFFIRMATION:
     * Only the Master Owner authority can definitively establish owner-semantic states:
     * ABANDONED, REPRIORITIZED, COMPLETED_BY_EXTERNAL_ACTION.
     * INVARIANT: Throws if caller is not Master Owner.
     */
    setOwnerIntentSemantic(params) {
        if (!isMasterOwner(params.operatorId)) {
            throw new Error(`AUTHORITY_DENIED: Only Master Owner (${MASTER_OWNER_ID}) may affirm owner-semantic goal state (${params.semantic}).`);
        }
        const goal = this._getGoal(params.goalId);
        const now = Date.now();
        let newState = goal.state;
        if (params.semantic === 'ABANDONED')
            newState = 'ABANDONED';
        if (params.semantic === 'COMPLETED_BY_EXTERNAL_ACTION')
            newState = 'COMPLETED';
        if (params.semantic === 'REPRIORITIZED')
            newState = 'ACTIVE';
        const updated = {
            ...goal,
            state: newState,
            isOwnerIntentAffirmed: true,
            ownerIntentOverride: {
                semantic: params.semantic,
                affirmedBy: params.operatorId,
                timestamp: now,
                rationale: params.rationale,
            },
        };
        this._goals.set(params.goalId, updated);
        this._persist();
        return updated;
    }
    getGoal(goalId) {
        return this._goals.get(goalId);
    }
    getAllGoals() {
        return Array.from(this._goals.values());
    }
    getActiveGoals() {
        return Array.from(this._goals.values()).filter((g) => g.state === 'ACTIVE' || g.state === 'PROGRESSING');
    }
    clear() {
        this._goals.clear();
        if (this._storagePath && fs.existsSync(this._storagePath)) {
            try {
                fs.unlinkSync(this._storagePath);
            }
            catch { }
        }
    }
    _getGoal(goalId) {
        const goal = this._goals.get(goalId);
        if (!goal)
            throw new Error(`Goal '${goalId}' not found.`);
        return goal;
    }
    _persist() {
        if (!this._storagePath)
            return;
        try {
            const dir = path.dirname(this._storagePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const goalsList = Array.from(this._goals.values());
            const hash = computeGoalContinuityHash(goalsList);
            const payload = {
                schemaVersion: 1,
                integrityHash: hash,
                goals: goalsList,
            };
            fs.writeFileSync(this._storagePath, JSON.stringify(payload, null, 2), 'utf8');
        }
        catch (err) {
            throw new Error(`GOAL_PERSISTENCE_FAILURE: Cannot persist goals (${err.message}).`);
        }
    }
    _rehydrate() {
        if (!this._storagePath || !fs.existsSync(this._storagePath))
            return;
        try {
            const raw = fs.readFileSync(this._storagePath, 'utf8');
            const parsed = JSON.parse(raw);
            if (!parsed.goals || !Array.isArray(parsed.goals))
                return;
            const expectedHash = computeGoalContinuityHash(parsed.goals);
            if (parsed.integrityHash !== expectedHash) {
                console.error(`[LongHorizonGoalContinuityEngine] Hash mismatch for ${this._storagePath}. Rebuilding safely.`);
                return;
            }
            for (const g of parsed.goals) {
                this._goals.set(g.goalId, g);
            }
        }
        catch (err) {
            console.error(`[LongHorizonGoalContinuityEngine] Corrupted goal file (${err.message}). Rebuilding safe baseline.`);
        }
    }
}
export const globalLongHorizonGoalContinuityEngine = new LongHorizonGoalContinuityEngine();
