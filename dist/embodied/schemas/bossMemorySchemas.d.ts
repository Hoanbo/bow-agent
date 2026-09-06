import { ValidationResult } from '../../core/persistence/durableJsonStore.js';
import type { BossProfile, BossProject, BossHabits } from '../bossMemoryHub.js';
import type { BossRule } from '../bossFeedbackLearner.js';
/**
 * Validate a single BossProject object.
 */
export declare function validateBossProject(val: unknown, pathPrefix?: string): {
    success: boolean;
    data?: BossProject;
    errors: string[];
};
/**
 * Validate BossHabits object.
 */
export declare function validateBossHabits(val: unknown): {
    success: boolean;
    data?: BossHabits;
    errors: string[];
};
/**
 * Validate full BossProfile schema at runtime.
 */
export declare function validateBossProfile(data: unknown): ValidationResult<BossProfile>;
/**
 * Validate a single BossRule object.
 */
export declare function validateBossRule(val: unknown, pathPrefix?: string): {
    success: boolean;
    data?: BossRule;
    errors: string[];
};
/**
 * Validate full BossRule array schema at runtime.
 */
export declare function validateBossRules(data: unknown): ValidationResult<BossRule[]>;
