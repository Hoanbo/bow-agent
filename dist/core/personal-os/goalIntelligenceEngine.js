// src/core/personal-os/goalIntelligenceEngine.ts
// BOWCON V4.0 — MS-1.3.40: MASTER OWNER PERSONAL OPERATING SYSTEM & PROACTIVE COGNITIVE AGENCY RUNTIME
//
// Section 12: Long-Horizon Personal Goal Intelligence
// Analyzes long-horizon goals: health, progress, risk, blocked states, and priority conflicts.
// Integrates with ExecutiveRuntime without duplicating goal engines.
//
// Invariants:
// - Goal cancellation or strategic replacement remains an Owner decision.
// - GOAL_INTELLIGENCE != GOAL_AUTHORITY
// - MASTER_OWNER_AUTHORITY > BOWCON_INTELLIGENCE > BOWCON_AUTONOMY
export class GoalIntelligenceEngine {
    reports = new Map();
    /**
     * Evaluate a long-term goal and generate an intelligence report.
     */
    evaluateGoal(input) {
        const risks = [];
        const blockers = [...(input.blockers ?? [])];
        // Check unmet dependencies
        if (input.unmetDependencies && input.unmetDependencies.length > 0) {
            blockers.push(`Unmet dependencies: ${input.unmetDependencies.join(', ')}`);
            risks.push('Dependency bottleneck preventing task progression');
        }
        // Check staleness (stalled if no progress for > 7 days or explicitly flagged)
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const isStalled = input.lastProgressTimestamp
            ? now - input.lastProgressTimestamp > SEVEN_DAYS_MS
            : false;
        if (isStalled) {
            risks.push('No verifiable progress observed in the past 7 days (stalled)');
        }
        // Check priority conflicts
        const hasPriorityConflict = !!(input.competingPriorityGoals && input.competingPriorityGoals.length > 0);
        if (hasPriorityConflict) {
            risks.push(`Priority contention with: ${input.competingPriorityGoals.join(', ')}`);
        }
        // Compute health score (1.0 = optimal, deductions for blockers and risks)
        let healthScore = 1.0;
        if (blockers.length > 0)
            healthScore -= 0.35;
        if (isStalled)
            healthScore -= 0.25;
        if (hasPriorityConflict)
            healthScore -= 0.15;
        if (input.constraints && input.constraints.length > 3)
            healthScore -= 0.1;
        healthScore = Math.max(0.1, Math.min(1.0, Number(healthScore.toFixed(2))));
        // Determine recommended action
        let recommendedAction = 'Continue governed execution plan.';
        if (blockers.length > 0) {
            recommendedAction = 'Prioritize resolving dependency blockers before dispatching downstream tasks.';
        }
        else if (isStalled) {
            recommendedAction = 'Conduct pre-flight re-evaluation to determine if goal requires decomposition or priority adjustment.';
        }
        else if (hasPriorityConflict) {
            recommendedAction = 'Request Master Owner clarification on competing strategic priorities.';
        }
        const report = {
            goalId: input.goalId,
            title: input.title,
            why: input.why || 'Strategic objective established by Master Owner',
            successCriteria: input.successCriteria || ['All DAG tasks verified complete'],
            constraints: input.constraints || ['Operate within sandbox policy'],
            priority: input.priority || 'NORMAL',
            deadlines: input.deadlines,
            dependencies: input.dependencies || [],
            currentState: input.currentState || 'ACTIVE',
            risks,
            blockers,
            healthScore,
            isStalled,
            hasPriorityConflict,
            recommendedAction,
            analyzedAt: now,
        };
        this.reports.set(input.goalId, report);
        return report;
    }
    /**
     * Retrieve report by goal ID.
     */
    getReport(goalId) {
        return this.reports.get(goalId);
    }
    /**
     * Retrieve all goal intelligence reports.
     */
    getAllReports() {
        return Array.from(this.reports.values());
    }
    /**
     * Format intelligence report for display.
     */
    formatReportText(report) {
        return [
            '==============================================================================',
            'GOAL INTELLIGENCE REPORT',
            '==============================================================================',
            `Goal ID:      ${report.goalId}`,
            `Title:        ${report.title}`,
            `Health Score: ${(report.healthScore * 100).toFixed(0)}%`,
            `State:        ${report.currentState}`,
            `Stalled:      ${report.isStalled ? 'YES' : 'NO'}`,
            `Blockers:     ${report.blockers.length > 0 ? report.blockers.join('; ') : 'None'}`,
            `Risks:        ${report.risks.length > 0 ? report.risks.join('; ') : 'None'}`,
            `Action:       ${report.recommendedAction}`,
            '==============================================================================',
        ].join('\n');
    }
    /**
     * Clear reports.
     */
    clear() {
        this.reports.clear();
    }
}
