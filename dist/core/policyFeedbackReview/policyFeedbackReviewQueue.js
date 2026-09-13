// src/core/policyFeedbackReview/policyFeedbackReviewQueue.ts
// BOWCON V4.0 — MS-1.3.67: GOVERNED FEEDBACK REVIEW, POLICY EVOLUTION INTAKE & HUMAN REVIEW QUEUE LAYER
//
// Governed Policy Feedback Review Queue (Component 758).
// Provides a tenant-isolated, durable review queue for human operator triage.
// Guarantees:
// 1. Strict tenant partition isolation via resolveUserPartition
// 2. Deterministic queue ordering (by severity CRITICAL > HIGH > MEDIUM > LOW > NONE, then timestamp)
// 3. Bounded pagination (max 50 entries per page)
// 4. Anti-duplicate and anti-replay defense (single review per proposalId)
// 5. Zero secrets, credentials, or bearer tokens persisted
// 6. Durable partition storage with fail-closed recovery
// 7. USER_STOP supremacy over all queue operations
//
// Authority Invariants:
// - QUEUE_IS_NOT_AUTHORITY: Queued status grants zero autonomous authority
// - LEVEL_1_STAGING: Human review queue only; zero policy mutation
// - USER_STOP > ALL_QUEUE_OPERATIONS
import fs from 'node:fs';
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
const SEVERITY_RANK = {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    NONE: 1,
};
export class PolicyFeedbackReviewQueue {
    baseDir;
    isUserStopActiveFn;
    // In-memory tenant partition cache: tenantPartition -> Map<reviewId, FeedbackReviewQueueEntry>
    tenantEntries = new Map();
    // Proposal lookup for anti-duplicate: tenantPartition -> Map<proposalId, reviewId>
    proposalLookup = new Map();
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Review queue operations suspended by USER_STOP supremacy');
        }
    }
    getTenantStorageDir(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('QUEUE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        const resolved = resolveUserPartition(tenantPartition.trim(), this.baseDir);
        const queueDir = path.join(resolved.baseDir, resolved.partitionKey, 'policy_feedback_queue');
        if (!fs.existsSync(queueDir)) {
            fs.mkdirSync(queueDir, { recursive: true });
        }
        return queueDir;
    }
    loadTenantStateIfEmpty(tenantPartition) {
        if (this.tenantEntries.has(tenantPartition)) {
            return;
        }
        const map = new Map();
        const propMap = new Map();
        this.tenantEntries.set(tenantPartition, map);
        this.proposalLookup.set(tenantPartition, propMap);
        const queueDir = this.getTenantStorageDir(tenantPartition);
        const queueFile = path.join(queueDir, 'queue_entries.json');
        if (fs.existsSync(queueFile)) {
            try {
                const raw = fs.readFileSync(queueFile, 'utf8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    for (const entry of parsed) {
                        if (entry && entry.reviewId && entry.tenantPartition === tenantPartition) {
                            map.set(entry.reviewId, Object.freeze(entry));
                            propMap.set(entry.proposalId, entry.reviewId);
                        }
                    }
                }
            }
            catch (err) {
                // Fail closed on corrupt storage file
                throw new Error(`QUEUE_STORAGE_CORRUPTION: Failed to parse review queue for tenant '${tenantPartition}': ${err.message}`);
            }
        }
    }
    persistTenantState(tenantPartition) {
        const queueDir = this.getTenantStorageDir(tenantPartition);
        const queueFile = path.join(queueDir, 'queue_entries.json');
        const tempFile = path.join(queueDir, `queue_entries_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);
        const entries = Array.from(this.tenantEntries.get(tenantPartition)?.values() ?? []);
        fs.writeFileSync(tempFile, JSON.stringify(entries, null, 2), 'utf8');
        fs.renameSync(tempFile, queueFile);
    }
    /**
     * Enqueues a feedback proposal for human review.
     * Enforces single-entry anti-duplicate defense per proposalId.
     */
    enqueue(entry) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(entry.tenantPartition);
        const map = this.tenantEntries.get(entry.tenantPartition);
        const propMap = this.proposalLookup.get(entry.tenantPartition);
        // Check duplicate proposal
        if (propMap.has(entry.proposalId)) {
            const existingReviewId = propMap.get(entry.proposalId);
            throw new Error(`DUPLICATE_PROPOSAL_ENQUEUE: Proposal '${entry.proposalId}' already queued under reviewId '${existingReviewId}'`);
        }
        // Check duplicate reviewId
        if (map.has(entry.reviewId)) {
            throw new Error(`DUPLICATE_REVIEW_ID: Review '${entry.reviewId}' already exists in tenant queue`);
        }
        const frozen = Object.freeze({ ...entry });
        map.set(entry.reviewId, frozen);
        propMap.set(entry.proposalId, entry.reviewId);
        this.persistTenantState(entry.tenantPartition);
        return frozen;
    }
    /**
     * Retrieves a single entry by reviewId.
     */
    getEntry(tenantPartition, reviewId) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return this.tenantEntries.get(tenantPartition)?.get(reviewId);
    }
    /**
     * Retrieves entry by proposalId.
     */
    getEntryByProposalId(tenantPartition, proposalId) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        const reviewId = this.proposalLookup.get(tenantPartition)?.get(proposalId);
        if (!reviewId)
            return undefined;
        return this.tenantEntries.get(tenantPartition)?.get(reviewId);
    }
    /**
     * Lists review entries for a tenant with deterministic ordering and bounded pagination.
     */
    listEntries(tenantPartition, options) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        let all = Array.from(this.tenantEntries.get(tenantPartition)?.values() ?? []);
        // Filter by state if requested
        if (options?.state) {
            all = all.filter(e => e.state === options.state);
        }
        // Deterministic sort: Severity (CRITICAL > HIGH > MEDIUM > LOW > NONE) then createdAt descending
        all.sort((a, b) => {
            const rankA = SEVERITY_RANK[a.severity] ?? 0;
            const rankB = SEVERITY_RANK[b.severity] ?? 0;
            if (rankA !== rankB) {
                return rankB - rankA;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        const page = Math.max(1, options?.page ?? 1);
        const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 20)); // Bounded pagination, max 50
        const startIndex = (page - 1) * pageSize;
        const paginated = all.slice(startIndex, startIndex + pageSize);
        return {
            entries: Object.freeze(paginated),
            total: all.length,
            page,
            pageSize,
        };
    }
    /**
     * Updates state of an existing queue entry with terminal state immutability.
     */
    updateEntryState(tenantPartition, reviewId, newState) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        const map = this.tenantEntries.get(tenantPartition);
        const existing = map.get(reviewId);
        if (!existing) {
            throw new Error(`ENTRY_NOT_FOUND: ReviewId '${reviewId}' not found in tenant queue`);
        }
        // Terminal state protection: Cannot transition out of terminal states
        const terminalStates = [
            'ACCEPTED',
            'REJECTED',
            'CANCELLED',
            'EXPIRED',
            'SUPERSEDED',
            'INVALID',
            'BLOCKED',
        ];
        if (terminalStates.includes(existing.state) && existing.state !== newState) {
            throw new Error(`ILLEGAL_STATE_TRANSITION: Cannot transition review '${reviewId}' from terminal state '${existing.state}' to '${newState}'`);
        }
        const updated = Object.freeze({
            ...existing,
            state: newState,
            updatedAt: new Date().toISOString(),
        });
        map.set(reviewId, updated);
        this.persistTenantState(tenantPartition);
        return updated;
    }
}
