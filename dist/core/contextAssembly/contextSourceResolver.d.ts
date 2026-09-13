import { type ContextFragment, type ContextAssemblyRequest } from './contextTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import type { AgentTaskRuntime } from '../taskLifecycle/agentTaskRuntime.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface ContextSourceResolverOptions {
    readonly taskRuntime?: AgentTaskRuntime;
    readonly sanitizer?: DiagnosisSanitizer;
    readonly baseDir?: string;
}
export declare class ContextSourceResolver {
    private readonly taskRuntime?;
    private readonly sanitizer;
    private readonly baseDir;
    private readonly budgetManager;
    constructor(options?: ContextSourceResolverOptions);
    /**
     * Resolves, categorizes, sanitizes, and returns an ordered list of context fragments.
     */
    resolveSources(request: ContextAssemblyRequest): Promise<{
        task?: AgentTask;
        fragments: ContextFragment[];
    }>;
    private validateTenantId;
    private resolveTask;
    private resolveTier1Fragments;
    private resolveTier2Fragments;
    private resolveTier3Fragments;
    private resolveTier4Fragments;
    private createFragment;
}
