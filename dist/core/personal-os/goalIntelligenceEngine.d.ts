import { GoalIntelligenceReport } from './personalOsTypes';
export interface GoalEvaluationInput {
    goalId: string;
    title: string;
    why?: string;
    successCriteria?: string[];
    constraints?: string[];
    priority?: string;
    deadlines?: string;
    dependencies?: string[];
    unmetDependencies?: string[];
    currentState?: string;
    blockers?: string[];
    lastProgressTimestamp?: number;
    competingPriorityGoals?: string[];
}
export declare class GoalIntelligenceEngine {
    private readonly reports;
    /**
     * Evaluate a long-term goal and generate an intelligence report.
     */
    evaluateGoal(input: GoalEvaluationInput): GoalIntelligenceReport;
    /**
     * Retrieve report by goal ID.
     */
    getReport(goalId: string): GoalIntelligenceReport | undefined;
    /**
     * Retrieve all goal intelligence reports.
     */
    getAllReports(): GoalIntelligenceReport[];
    /**
     * Format intelligence report for display.
     */
    formatReportText(report: GoalIntelligenceReport): string;
    /**
     * Clear reports.
     */
    clear(): void;
}
