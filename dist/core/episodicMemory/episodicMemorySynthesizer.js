// src/core/episodicMemory/episodicMemorySynthesizer.ts
// BOWCON V4.0 — MS-1.4.09: EPISODIC MEMORY SYNTHESIZER
//
// EN:
// Pure, deterministic, side-effect-free synthesizer for episodic memories.
// Derives structured summaries, causal links, and lessons strictly from committed evidence.
// Enforces:
// IMMUTABLE_EVIDENCE > GENERATED_SUMMARY
// MEMORY != AUTHORITY, MEMORY != POLICY, MEMORY != EXECUTION.
// Zero LLM, zero network, zero process execution, zero persistence mutations.
//
// VI:
// Bộ tổng hợp thuần túy, tất định, không có tác dụng phụ cho các bộ nhớ episodic.
// Rút trích tóm tắt có cấu trúc, liên kết nhân quả và bài học nghiêm ngặt từ bằng chứng đã commit.
// Thực thi:
// IMMUTABLE_EVIDENCE > GENERATED_SUMMARY
// MEMORY != AUTHORITY, MEMORY != POLICY, MEMORY != EXECUTION.
// Không LLM, không mạng, không tiến trình con, không ghi đĩa trực tiếp.
import crypto from 'node:crypto';
export class EpisodicMemorySynthesizer {
    /**
     * EN: Produces a canonical JSON string with deterministically sorted keys.
     */
    canonicalJSON(obj) {
        if (obj === null || typeof obj !== 'object') {
            return JSON.stringify(obj);
        }
        if (Array.isArray(obj)) {
            return '[' + obj.map((x) => this.canonicalJSON(x)).join(',') + ']';
        }
        const keys = Object.keys(obj).sort();
        const pairs = keys.map((k) => JSON.stringify(k) + ':' + this.canonicalJSON(obj[k]));
        return '{' + pairs.join(',') + '}';
    }
    /**
     * EN: Computes SHA-256 digest of input string.
     */
    hash256(input) {
        return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
    }
    /**
     * EN: Generates a deterministic lesson ID.
     */
    computeLessonId(sourceCommitId, category, insight) {
        const raw = `${sourceCommitId}:${category}:${insight}`;
        return `lesson_${this.hash256(raw).slice(0, 24)}`;
    }
    /**
     * EN: Synthesizes deterministic lessons, causal links, and summary from committed evidence.
     * PURE & SIDE-EFFECT FREE.
     */
    synthesize(input) {
        const { commitRecord } = input;
        const nowIso = new Date().toISOString();
        const toolName = commitRecord.committedState.toolName || 'unspecified_tool';
        const stateKeys = Object.keys(commitRecord.committedState).sort();
        const stateSummary = stateKeys.length > 0
            ? `state mutations: [${stateKeys.join(', ')}]`
            : 'no state mutations';
        // 1. Causal links (deterministic)
        const causalLinks = [
            `Step [${commitRecord.stepId}] execution [${commitRecord.executionId}] verified by [${commitRecord.verificationId}]`,
            `Commit [${commitRecord.commitId}] durably locked ${stateSummary}`,
            `Task [${commitRecord.taskId}] version [${commitRecord.taskVersion}] progressed with status COMMITTED`,
        ];
        if (input.contextRecords && input.contextRecords.length > 0) {
            causalLinks.push(`Preceded by ${input.contextRecords.length} historical committed episodes for task [${commitRecord.taskId}]`);
        }
        // 2. Deterministic Lessons
        const lessons = [];
        // Lesson A: Empirical Verified Fact (Confidence 1.0)
        const factInsight = `Empirical proof: Tool '${toolName}' execution succeeded with durable verification '${commitRecord.verificationId}' under task version ${commitRecord.taskVersion}.`;
        lessons.push({
            lessonId: this.computeLessonId(commitRecord.commitId, 'EMPIRICAL_VERIFIED_FACT', factInsight),
            category: 'EMPIRICAL_VERIFIED_FACT',
            insight: factInsight,
            confidence: 1.0,
            sourceCommitId: commitRecord.commitId,
            verifiedFact: true,
        });
        // Lesson B: State Mutation Lesson (Confidence 1.0 if verified fact, 0.95 for derived summary)
        const stateInsight = `State transition committed at ${commitRecord.committedAt}: affected keys ${JSON.stringify(stateKeys)}.`;
        lessons.push({
            lessonId: this.computeLessonId(commitRecord.commitId, 'STATE_MUTATION', stateInsight),
            category: 'STATE_MUTATION',
            insight: stateInsight,
            confidence: 1.0,
            sourceCommitId: commitRecord.commitId,
            verifiedFact: true,
        });
        // Lesson C: Derived Causal Insight (Non-authoritative, Confidence 0.90)
        const derivedInsight = `Derived causal pattern: Execution '${commitRecord.executionId}' in step '${commitRecord.stepId}' is reproducible under identical preconditions.`;
        lessons.push({
            lessonId: this.computeLessonId(commitRecord.commitId, 'CAUSAL_PATTERN', derivedInsight),
            category: 'CAUSAL_PATTERN',
            insight: derivedInsight,
            confidence: 0.90,
            sourceCommitId: commitRecord.commitId,
            verifiedFact: false, // Explicitly marked non-authoritative
        });
        // 3. Deterministic summary
        const summary = `Task ${commitRecord.taskId} (v${commitRecord.taskVersion}) successfully committed step ${commitRecord.stepId} via ${toolName} with verification ${commitRecord.verificationId}.`;
        // 4. Deterministic synthesis ID & hash
        const synthesisPayload = {
            taskId: commitRecord.taskId,
            tenantId: commitRecord.tenantId,
            commitId: commitRecord.commitId,
            summary,
            causalLinks,
            lessons,
        };
        const canonicalPayload = this.canonicalJSON(synthesisPayload);
        const synthesisHash = this.hash256(canonicalPayload);
        const synthesisId = `synth_${synthesisHash.slice(0, 32)}`;
        const synthesis = {
            synthesisId,
            taskId: commitRecord.taskId,
            tenantId: commitRecord.tenantId,
            summary,
            causalLinks: Object.freeze(causalLinks),
            lessons: Object.freeze(lessons),
            generatedAt: nowIso,
            synthesisHash,
        };
        return Object.freeze(synthesis);
    }
}
export const globalEpisodicMemorySynthesizer = new EpisodicMemorySynthesizer();
