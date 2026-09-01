// src/core/planner.ts
// BOW AGENT V3.3 — TASK PLANNER & STEP-BY-STEP EXECUTION
export class TaskPlanner {
    createPlan(goal, steps) {
        const planId = 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        return {
            planId,
            goal,
            steps: steps.map((s) => ({ ...s, status: 'PENDING' })),
            status: 'PLANNED',
            createdAt: Date.now(),
        };
    }
    async executePlan(plan, toolExecutor) {
        plan.status = 'EXECUTING';
        for (const step of plan.steps) {
            step.status = 'RUNNING';
            try {
                const res = await toolExecutor(step.toolName, step.parameters);
                step.status = 'COMPLETED';
                step.result = res;
            }
            catch (err) {
                step.status = 'FAILED';
                step.error = err?.message || String(err);
                plan.status = 'FAILED';
                return plan;
            }
        }
        plan.status = 'COMPLETED';
        return plan;
    }
}
export const taskPlanner = new TaskPlanner();
