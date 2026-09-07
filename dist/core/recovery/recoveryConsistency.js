// src/core/recovery/recoveryConsistency.ts
// BOWCON V4.0 — MILESTONE 1.3.16: CRASH CONSISTENCY EVALUATOR
//
// EN:
// Authoritative crash consistency evaluator for the recovery subsystem.
// Analyzes lifecycle checkpoints, execution/verification evidence, and commit records
// to determine the exact crash condition without guesswork or side effects.
//
// VI:
// Bộ đánh giá tính nhất quán sự cố có thẩm quyền cho phân hệ phục hồi.
// Phân tích các checkpoint vòng đời, bằng chứng thực thi/xác minh và bản ghi commit
// để xác định chính xác điều kiện sự cố mà không đoán mò hoặc tạo tác dụng phụ.
/**
 * EN: Evaluates crash consistency from available durable and in-flight evidence.
 * VI: Đánh giá tính nhất quán sự cố từ các bằng chứng bền vững và đang diễn ra có sẵn.
 */
export function evaluateCrashConsistency(activeLifecycleState, checkpoints, verificationRecord, commitRecord) {
    const issues = [];
    // Check for conflicting durable records: e.g., commit reported COMMITTED but verification was FAILED
    if (commitRecord &&
        (commitRecord.status === 'COMMITTED' || commitRecord.status === 'ALREADY_COMMITTED') &&
        verificationRecord &&
        (verificationRecord.status === 'FAILED' || !verificationRecord.taskSucceeded)) {
        issues.push('CONFLICT: Commit marked successful but verification recorded task failure');
        return {
            condition: 'CONFLICTING_DURABLE_STATE',
            isConsistent: false,
            issues: Object.freeze(issues),
            details: Object.freeze({ commitRecord, verificationRecord }),
        };
    }
    // Check if commit is confirmed durable before crash
    if (commitRecord &&
        (commitRecord.status === 'COMMITTED' || commitRecord.status === 'ALREADY_COMMITTED') &&
        !commitRecord.isPartial) {
        return {
            condition: 'COMMIT_CONFIRMED_BEFORE_CRASH',
            isConsistent: true,
            issues: Object.freeze(issues),
            details: Object.freeze({ commitRecord, verificationRecord }),
        };
    }
    // Check if interrupted during commit
    if (activeLifecycleState === 'COMMITTING' ||
        (commitRecord && (commitRecord.isPartial || commitRecord.status === 'FAILED' || commitRecord.status === 'ROLLBACK_REQUIRED' || commitRecord.status === 'INCONSISTENT'))) {
        issues.push('INTERRUPTED: System crashed during or immediately following commit execution');
        return {
            condition: 'INTERRUPTED_DURING_COMMIT',
            isConsistent: false,
            issues: Object.freeze(issues),
            details: Object.freeze({ commitRecord, activeLifecycleState }),
        };
    }
    // Check if interrupted during verification
    if (activeLifecycleState === 'VERIFYING' ||
        (verificationRecord && (verificationRecord.status === 'UNKNOWN' || verificationRecord.status === 'INCONCLUSIVE'))) {
        issues.push('INTERRUPTED: System crashed during execution verification phase');
        return {
            condition: 'INTERRUPTED_DURING_VERIFICATION',
            isConsistent: false,
            issues: Object.freeze(issues),
            details: Object.freeze({ verificationRecord, activeLifecycleState }),
        };
    }
    // Check if interrupted during execution
    if (activeLifecycleState === 'EXECUTING') {
        issues.push('INTERRUPTED: System crashed during active tool execution');
        return {
            condition: 'INTERRUPTED_DURING_EXECUTION',
            isConsistent: false,
            issues: Object.freeze(issues),
            details: Object.freeze({ activeLifecycleState }),
        };
    }
    // Check if interrupted before execution (in planning, understanding, or awaiting approval)
    if (activeLifecycleState &&
        [
            'RECEIVING',
            'CONTEXT_LOADING',
            'UNDERSTANDING',
            'PLANNING',
            'DECIDING',
            'ORCHESTRATING',
            'AWAITING_APPROVAL',
        ].includes(activeLifecycleState)) {
        return {
            condition: 'INTERRUPTED_BEFORE_EXECUTION',
            isConsistent: true,
            issues: Object.freeze(issues),
            details: Object.freeze({ activeLifecycleState }),
        };
    }
    // Check for terminal states recovered cleanly
    if (activeLifecycleState &&
        ['COMPLETED', 'NO_ACTION', 'REJECTED', 'CANCELLED', 'BLOCKED'].includes(activeLifecycleState)) {
        return {
            condition: 'NO_ACTIVE_OPERATION',
            isConsistent: true,
            issues: Object.freeze(issues),
            details: Object.freeze({ activeLifecycleState }),
        };
    }
    // Check if system was clean and idle at READY
    if (!activeLifecycleState || activeLifecycleState === 'READY') {
        return {
            condition: 'NO_ACTIVE_OPERATION',
            isConsistent: true,
            issues: Object.freeze(issues),
            details: Object.freeze({ activeLifecycleState: activeLifecycleState || 'READY' }),
        };
    }
    // If unclassified or inconsistent evidence
    issues.push(`UNKNOWN: Active state "${activeLifecycleState}" cannot be authoritatively classified`);
    return {
        condition: 'UNKNOWN_DURABLE_STATE',
        isConsistent: false,
        issues: Object.freeze(issues),
        details: Object.freeze({ activeLifecycleState, checkpointsCount: checkpoints?.length ?? 0 }),
    };
}
