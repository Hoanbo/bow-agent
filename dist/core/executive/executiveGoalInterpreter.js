// src/core/executive/executiveGoalInterpreter.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Goal Interpretation Engine.
// Interprets raw objectives, evaluates constraints, risk levels, and success criteria.
// Invariant: LLM_PROPOSE != EXECUTE; Cognitive proposals are non-authoritative.
export class ExecutiveGoalInterpreter {
    _forbiddenPatterns = [
        /C:\\BOW\\shopofbow/i,
        /shopofbow/i,
        /rm\s+-rf\s+\//i,
        /format\s+[a-z]:/i,
        /del\s+\/f\s+\/s\s+\/q\s+C:\\/i,
        /drop\s+database/i,
    ];
    async interpret(goalOrPrompt) {
        const rawText = typeof goalOrPrompt === 'string' ? goalOrPrompt : goalOrPrompt.objective;
        const goalId = typeof goalOrPrompt === 'string' ? 'goal_adhoc' : goalOrPrompt.goalId;
        const priority = typeof goalOrPrompt === 'string' ? 'NORMAL' : goalOrPrompt.priority;
        const constraints = typeof goalOrPrompt === 'string' ? [] : goalOrPrompt.constraints;
        const text = rawText.toLowerCase();
        const forbiddenReasons = [];
        // Check forbidden patterns
        for (const pattern of this._forbiddenPatterns) {
            if (pattern.test(rawText)) {
                forbiddenReasons.push(`Objective matches forbidden security pattern: ${pattern.source}`);
            }
        }
        // Determine priority
        let suggestedPriority = priority;
        if (text.includes('urgent') || text.includes('critical') || text.includes('emergency')) {
            suggestedPriority = 'CRITICAL';
        }
        else if (text.includes('high') || text.includes('important')) {
            suggestedPriority = 'HIGH';
        }
        // Identify constraints
        const identifiedConstraints = [...constraints];
        if (text.includes('read only') || text.includes('dry run') || text.includes('preview')) {
            identifiedConstraints.push('DRY_RUN_REQUIRED');
        }
        if (text.includes('no delete') || text.includes('keep existing')) {
            identifiedConstraints.push('PRESERVE_EXISTING_FILES');
        }
        // Intent, risk level, suggested capabilities
        let intent = 'GENERAL_TASK';
        let riskLevel = 'LOW';
        let suggestedCapabilities = [];
        let estimatedSteps = 1;
        if (text.includes('clean') || text.includes('cache')) {
            intent = 'CLEAN_WORKSPACE';
            riskLevel = 'REVERSIBLE';
            suggestedCapabilities = ['workspace.clean'];
            estimatedSteps = 2;
        }
        else if (text.includes('status') || text.includes('process') || text.includes('system')) {
            intent = 'SYSTEM_STATUS';
            riskLevel = 'OBSERVE';
            suggestedCapabilities = ['system.observe'];
            estimatedSteps = 1;
        }
        else if (text.includes('deploy') || text.includes('build')) {
            intent = 'DEPLOY_SERVICE';
            riskLevel = 'HIGH';
            suggestedCapabilities = ['system.observe', 'build.bundle', 'fs.verify'];
            estimatedSteps = 3;
        }
        const estimatedTaskCount = estimatedSteps;
        return {
            goalId,
            interpretedObjective: rawText,
            suggestedPriority,
            identifiedConstraints,
            successCriteriaSummary: 'Automatic verification via capability runtime',
            estimatedTaskCount,
            containsForbiddenPatterns: forbiddenReasons.length > 0,
            forbiddenReasons,
            intent,
            riskLevel,
            suggestedCapabilities,
            estimatedSteps,
        };
    }
}
export const globalExecutiveGoalInterpreter = new ExecutiveGoalInterpreter();
