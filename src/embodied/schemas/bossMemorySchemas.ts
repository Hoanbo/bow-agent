// src/embodied/schemas/bossMemorySchemas.ts
// BOW CON V4.0 — MILESTONE 1.3.2: RUNTIME SCHEMA VALIDATORS FOR BOSS MEMORY

import { ValidationResult } from '../../core/persistence/durableJsonStore.js';
import type { BossProfile, BossProject, BossHabits } from '../bossMemoryHub.js';
import type { BossRule } from '../bossFeedbackLearner.js';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function hasDangerousKeys(obj: Record<string, unknown>): boolean {
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key)) return true;
  }
  return false;
}

/**
 * Validate a single BossProject object.
 */
export function validateBossProject(val: unknown, pathPrefix = 'project'): { success: boolean; data?: BossProject; errors: string[] } {
  const errors: string[] = [];
  if (!isObject(val)) {
    return { success: false, errors: [`${pathPrefix} must be an object`] };
  }

  if (hasDangerousKeys(val)) {
    return { success: false, errors: [`${pathPrefix} contains dangerous prototype keys`] };
  }

  if (typeof val.id !== 'string' || !val.id.trim()) {
    errors.push(`${pathPrefix}.id must be a non-empty string`);
  }
  if (typeof val.name !== 'string' || !val.name.trim()) {
    errors.push(`${pathPrefix}.name must be a non-empty string`);
  }
  if (typeof val.description !== 'string') {
    errors.push(`${pathPrefix}.description must be a string`);
  }
  if (!Array.isArray(val.techStack) || !val.techStack.every(t => typeof t === 'string')) {
    errors.push(`${pathPrefix}.techStack must be an array of strings`);
  }
  const validStatuses = ['active', 'planning', 'completed'];
  if (typeof val.status !== 'string' || !validStatuses.includes(val.status)) {
    errors.push(`${pathPrefix}.status must be one of: ${validStatuses.join(', ')}`);
  }
  if (typeof val.updatedAt !== 'string') {
    errors.push(`${pathPrefix}.updatedAt must be a string`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      id: String(val.id),
      name: String(val.name),
      description: String(val.description),
      techStack: (val.techStack as string[]).slice(),
      status: val.status as 'active' | 'planning' | 'completed',
      updatedAt: String(val.updatedAt),
    },
    errors: [],
  };
}

/**
 * Validate BossHabits object.
 */
export function validateBossHabits(val: unknown): { success: boolean; data?: BossHabits; errors: string[] } {
  const errors: string[] = [];
  if (!isObject(val)) {
    return { success: false, errors: ['habits must be an object'] };
  }

  if (hasDangerousKeys(val)) {
    return { success: false, errors: ['habits contains dangerous prototype keys'] };
  }

  if (val.morningRoutine !== undefined && typeof val.morningRoutine !== 'string') {
    errors.push('habits.morningRoutine must be a string if provided');
  }
  if (val.preferredBeverage !== undefined && typeof val.preferredBeverage !== 'string') {
    errors.push('habits.preferredBeverage must be a string if provided');
  }
  if (val.workStartHour !== undefined && (typeof val.workStartHour !== 'number' || !Number.isFinite(val.workStartHour) || val.workStartHour < 0 || val.workStartHour > 24)) {
    errors.push('habits.workStartHour must be a finite number between 0 and 24 if provided');
  }
  if (typeof val.breakIntervalMinutes !== 'number' || !Number.isFinite(val.breakIntervalMinutes) || val.breakIntervalMinutes <= 0) {
    errors.push('habits.breakIntervalMinutes must be a positive number');
  }
  if (val.favoriteMusicGenre !== undefined && typeof val.favoriteMusicGenre !== 'string') {
    errors.push('habits.favoriteMusicGenre must be a string if provided');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      morningRoutine: val.morningRoutine !== undefined ? String(val.morningRoutine) : undefined,
      preferredBeverage: val.preferredBeverage !== undefined ? String(val.preferredBeverage) : undefined,
      workStartHour: val.workStartHour !== undefined ? Number(val.workStartHour) : undefined,
      breakIntervalMinutes: Number(val.breakIntervalMinutes),
      favoriteMusicGenre: val.favoriteMusicGenre !== undefined ? String(val.favoriteMusicGenre) : undefined,
    },
    errors: [],
  };
}

/**
 * Validate full BossProfile schema at runtime.
 */
export function validateBossProfile(data: unknown): ValidationResult<BossProfile> {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { success: false, errors: ['Root data must be an object'] };
  }

  if (hasDangerousKeys(data)) {
    return { success: false, errors: ['Root object contains dangerous prototype keys'] };
  }

  if (typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('name must be a non-empty string');
  }

  if (typeof data.title !== 'string') {
    errors.push('title must be a string');
  }

  const habitsRes = validateBossHabits(data.habits);
  if (!habitsRes.success) {
    errors.push(...habitsRes.errors);
  }

  if (!Array.isArray(data.projects)) {
    errors.push('projects must be an array');
  } else {
    data.projects.forEach((proj, idx) => {
      const projRes = validateBossProject(proj, `projects[${idx}]`);
      if (!projRes.success) {
        errors.push(...projRes.errors);
      }
    });
  }

  if (!Array.isArray(data.healthNotes) || !data.healthNotes.every(h => typeof h === 'string')) {
    errors.push('healthNotes must be an array of strings');
  }

  if (!Array.isArray(data.relationships)) {
    errors.push('relationships must be an array');
  } else {
    data.relationships.forEach((rel, idx) => {
      if (!isObject(rel)) {
        errors.push(`relationships[${idx}] must be an object`);
      } else {
        if (typeof rel.name !== 'string' || !rel.name.trim()) {
          errors.push(`relationships[${idx}].name must be a non-empty string`);
        }
        if (typeof rel.role !== 'string' || !rel.role.trim()) {
          errors.push(`relationships[${idx}].role must be a non-empty string`);
        }
        if (rel.notes !== undefined && typeof rel.notes !== 'string') {
          errors.push(`relationships[${idx}].notes must be a string if provided`);
        }
      }
    });
  }

  if (!isObject(data.customPreferences)) {
    errors.push('customPreferences must be an object map');
  } else {
    for (const [k, v] of Object.entries(data.customPreferences)) {
      if (typeof v !== 'string') {
        errors.push(`customPreferences.${k} must be a string`);
      }
    }
  }

  if (typeof data.lastInteractionTimestamp !== 'number' || !Number.isFinite(data.lastInteractionTimestamp)) {
    errors.push('lastInteractionTimestamp must be a finite number');
  }

  if (typeof data.lastBreakReminderTimestamp !== 'number' || !Number.isFinite(data.lastBreakReminderTimestamp)) {
    errors.push('lastBreakReminderTimestamp must be a finite number');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const validatedProjects: BossProject[] = (data.projects as any[]).map(
    (p, idx) => validateBossProject(p, `projects[${idx}]`).data!
  );

  return {
    success: true,
    data: {
      name: String(data.name),
      title: String(data.title),
      habits: habitsRes.data!,
      projects: validatedProjects,
      healthNotes: (data.healthNotes as string[]).slice(),
      relationships: (data.relationships as any[]).map(r => ({
        name: String(r.name),
        role: String(r.role),
        notes: r.notes !== undefined ? String(r.notes) : undefined,
      })),
      customPreferences: { ...(data.customPreferences as Record<string, string>) },
      lastInteractionTimestamp: Number(data.lastInteractionTimestamp),
      lastBreakReminderTimestamp: Number(data.lastBreakReminderTimestamp),
    },
  };
}

const VALID_CATEGORIES = new Set(['addressing', 'policy', 'behavior', 'shop_knowledge']);

/**
 * Validate a single BossRule object.
 */
export function validateBossRule(val: unknown, pathPrefix = 'rule'): { success: boolean; data?: BossRule; errors: string[] } {
  const errors: string[] = [];
  if (!isObject(val)) {
    return { success: false, errors: [`${pathPrefix} must be an object`] };
  }

  if (hasDangerousKeys(val)) {
    return { success: false, errors: [`${pathPrefix} contains dangerous prototype keys`] };
  }

  if (typeof val.id !== 'string' || !val.id.trim()) {
    errors.push(`${pathPrefix}.id must be a non-empty string`);
  }
  if (typeof val.pattern !== 'string') {
    errors.push(`${pathPrefix}.pattern must be a string`);
  }
  if (typeof val.instruction !== 'string' || !val.instruction.trim()) {
    errors.push(`${pathPrefix}.instruction must be a non-empty string`);
  }
  if (typeof val.category !== 'string' || !VALID_CATEGORIES.has(val.category)) {
    errors.push(`${pathPrefix}.category must be one of: addressing, policy, behavior, shop_knowledge`);
  }
  if (typeof val.createdAt !== 'string') {
    errors.push(`${pathPrefix}.createdAt must be a string`);
  }
  if (typeof val.updatedAt !== 'string') {
    errors.push(`${pathPrefix}.updatedAt must be a string`);
  }
  if (typeof val.enabled !== 'boolean') {
    errors.push(`${pathPrefix}.enabled must be a boolean`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      id: String(val.id),
      pattern: String(val.pattern),
      instruction: String(val.instruction),
      category: val.category as 'addressing' | 'policy' | 'behavior' | 'shop_knowledge',
      createdAt: String(val.createdAt),
      updatedAt: String(val.updatedAt),
      enabled: Boolean(val.enabled),
    },
    errors: [],
  };
}

/**
 * Validate full BossRule array schema at runtime.
 */
export function validateBossRules(data: unknown): ValidationResult<BossRule[]> {
  if (!Array.isArray(data)) {
    return { success: false, errors: ['Root data must be an array of BossRule'] };
  }

  const errors: string[] = [];
  const validatedRules: BossRule[] = [];

  data.forEach((rule, idx) => {
    const res = validateBossRule(rule, `rules[${idx}]`);
    if (!res.success) {
      errors.push(...res.errors);
    } else if (res.data) {
      validatedRules.push(res.data);
    }
  });

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: validatedRules,
  };
}
