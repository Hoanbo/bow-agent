// src/core/verification/postconditionEvaluator.ts
// BOWCON V4.0 — MILESTONE 1.3.14: SAFE POSTCONDITION EVALUATION ENGINE
//
// EN:
// Authoritative evaluation engine for postcondition contracts.
// Guarantees deterministic, safe nested property traversal and pure data predicate matching without dynamic code execution.
//
// VI:
// Động cơ đánh giá có thẩm quyền cho các hợp đồng postcondition.
// Bảo đảm duyệt thuộc tính lồng nhau an toàn, tất định và so khớp vị từ thuần dữ liệu mà không thực thi mã động.

import type { Postcondition, PostconditionResult, PredicateOperator, PostconditionEvaluationStatus } from './postconditionTypes.js';
import { validateSafePath } from './verificationValidator.js';

/**
 * EN: Deep equality comparison for safe JSON-compatible values.
 * VI: So sánh bằng sâu cho các giá trị tương thích JSON an toàn.
 */
function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);

  if (keysA.length !== keysB.length) return false;

  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEquals((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }

  return true;
}

/**
 * EN: Safely resolves a nested property path from an arbitrary object without prototype pollution.
 * VI: Phân giải an toàn đường dẫn thuộc tính lồng nhau từ đối tượng bất kỳ mà không bị ô nhiễm prototype.
 */
export function resolveSafePath(target: unknown, path: string): { exists: boolean; value: unknown } {
  if (!validateSafePath(path)) {
    return { exists: false, value: undefined };
  }

  if (target === null || target === undefined || typeof target !== 'object') {
    return { exists: false, value: undefined };
  }

  const segments = path.split('.');
  let current: any = target;

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return { exists: false, value: undefined };
    }

    if (Array.isArray(current)) {
      const idx = Number(segment);
      if (Number.isInteger(idx) && idx >= 0 && idx < current.length) {
        current = current[idx];
      } else {
        return { exists: false, value: undefined };
      }
    } else if (Object.prototype.hasOwnProperty.call(current, segment)) {
      current = current[segment];
    } else {
      return { exists: false, value: undefined };
    }
  }

  return { exists: true, value: current };
}

/**
 * EN: Evaluates a supported safe predicate operator against observed and expected values.
 * VI: Đánh giá một toán tử vị từ an toàn được hỗ trợ dựa trên giá trị quan sát và giá trị kỳ vọng.
 */
export function evaluatePredicate(
  operator: PredicateOperator,
  observedValue: unknown,
  expectedValue: unknown,
  exists: boolean,
): { passed: boolean; status: PostconditionEvaluationStatus; message: string } {
  switch (operator) {
    case 'EQUALS': {
      const matched = deepEquals(observedValue, expectedValue);
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `Value strictly matched expected: ${JSON.stringify(expectedValue)}`
          : `Observed value ${JSON.stringify(observedValue)} did not match expected ${JSON.stringify(expectedValue)}`,
      };
    }

    case 'NOT_EQUALS': {
      const matched = !deepEquals(observedValue, expectedValue);
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `Value successfully differed from: ${JSON.stringify(expectedValue)}`
          : `Observed value equaled disallowed value ${JSON.stringify(expectedValue)}`,
      };
    }

    case 'EXISTS': {
      const matched = exists && observedValue !== undefined && observedValue !== null;
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `Target property exists in observed state`
          : `Target property does not exist or is null/undefined`,
      };
    }

    case 'NOT_EXISTS': {
      const matched = !exists || observedValue === undefined || observedValue === null;
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `Target property correctly absent from observed state`
          : `Target property unexpectedly exists: ${JSON.stringify(observedValue)}`,
      };
    }

    case 'GREATER_THAN': {
      if (typeof observedValue !== 'number' || typeof expectedValue !== 'number') {
        return {
          passed: false,
          status: 'FAILED',
          message: `GREATER_THAN requires numeric operands, received observed: ${typeof observedValue}, expected: ${typeof expectedValue}`,
        };
      }
      const matched = observedValue > expectedValue;
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `Observed ${observedValue} is greater than ${expectedValue}`
          : `Observed ${observedValue} is not greater than ${expectedValue}`,
      };
    }

    case 'LESS_THAN': {
      if (typeof observedValue !== 'number' || typeof expectedValue !== 'number') {
        return {
          passed: false,
          status: 'FAILED',
          message: `LESS_THAN requires numeric operands, received observed: ${typeof observedValue}, expected: ${typeof expectedValue}`,
        };
      }
      const matched = observedValue < expectedValue;
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `Observed ${observedValue} is less than ${expectedValue}`
          : `Observed ${observedValue} is not less than ${expectedValue}`,
      };
    }

    case 'GREATER_OR_EQUAL': {
      if (typeof observedValue !== 'number' || typeof expectedValue !== 'number') {
        return {
          passed: false,
          status: 'FAILED',
          message: `GREATER_OR_EQUAL requires numeric operands, received observed: ${typeof observedValue}, expected: ${typeof expectedValue}`,
        };
      }
      const matched = observedValue >= expectedValue;
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `Observed ${observedValue} is greater than or equal to ${expectedValue}`
          : `Observed ${observedValue} is less than ${expectedValue}`,
      };
    }

    case 'LESS_OR_EQUAL': {
      if (typeof observedValue !== 'number' || typeof expectedValue !== 'number') {
        return {
          passed: false,
          status: 'FAILED',
          message: `LESS_OR_EQUAL requires numeric operands, received observed: ${typeof observedValue}, expected: ${typeof expectedValue}`,
        };
      }
      const matched = observedValue <= expectedValue;
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `Observed ${observedValue} is less than or equal to ${expectedValue}`
          : `Observed ${observedValue} is greater than ${expectedValue}`,
      };
    }

    case 'IN': {
      if (!Array.isArray(expectedValue)) {
        return {
          passed: false,
          status: 'FAILED',
          message: `IN operator requires an array for expectedValue, received: ${typeof expectedValue}`,
        };
      }
      const matched = expectedValue.some(item => deepEquals(item, observedValue));
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `Observed value is present in expected array`
          : `Observed value ${JSON.stringify(observedValue)} was not in expected array ${JSON.stringify(expectedValue)}`,
      };
    }

    case 'NOT_IN': {
      if (!Array.isArray(expectedValue)) {
        return {
          passed: false,
          status: 'FAILED',
          message: `NOT_IN operator requires an array for expectedValue, received: ${typeof expectedValue}`,
        };
      }
      const matched = !expectedValue.some(item => deepEquals(item, observedValue));
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `Observed value is absent from disallowed array`
          : `Observed value ${JSON.stringify(observedValue)} unexpectedly found in disallowed array ${JSON.stringify(expectedValue)}`,
      };
    }

    case 'BOOLEAN_TRUE': {
      const matched = observedValue === true;
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `Observed value is true`
          : `Observed value ${JSON.stringify(observedValue)} is not true`,
      };
    }

    case 'BOOLEAN_FALSE': {
      const matched = observedValue === false;
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `Observed value is false`
          : `Observed value ${JSON.stringify(observedValue)} is not false`,
      };
    }

    case 'ALL': {
      if (!Array.isArray(observedValue)) {
        return {
          passed: false,
          status: 'FAILED',
          message: `ALL operator requires an array for observedValue, received: ${typeof observedValue}`,
        };
      }
      const matched = observedValue.every(item => deepEquals(item, expectedValue));
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `All elements match expected value`
          : `Not all elements in observed array matched expected value`,
      };
    }

    case 'ANY': {
      if (!Array.isArray(observedValue)) {
        return {
          passed: false,
          status: 'FAILED',
          message: `ANY operator requires an array for observedValue, received: ${typeof observedValue}`,
        };
      }
      const matched = observedValue.some(item => deepEquals(item, expectedValue));
      return {
        passed: matched,
        status: matched ? 'PASSED' : 'FAILED',
        message: matched
          ? `At least one element matched expected value`
          : `No element in observed array matched expected value`,
      };
    }

    default:
      return {
        passed: false,
        status: 'FAILED',
        message: `Unsupported predicate operator: ${operator as string}`,
      };
  }
}

/**
 * EN: Evaluates an individual postcondition against the observed execution state.
 * VI: Đánh giá một postcondition riêng lẻ dựa trên trạng thái thực thi quan sát được.
 */
export function evaluatePostcondition(
  postcondition: Postcondition,
  observedState: unknown,
): PostconditionResult {
  if (!validateSafePath(postcondition.targetPath)) {
    return Object.freeze({
      postconditionId: postcondition.id,
      status: 'FAILED',
      operator: postcondition.operator,
      targetPath: postcondition.targetPath,
      expectedValue: postcondition.expectedValue,
      observedValue: undefined,
      required: postcondition.required ?? true,
      priority: postcondition.priority ?? 'HIGH',
      message: `UNSAFE_PATH: Target path "${postcondition.targetPath}" violates security constraints`,
    });
  }

  const { exists, value } = resolveSafePath(observedState, postcondition.targetPath);

  // If path does not exist and operator requires observed value, classify as UNKNOWN / missing evidence
  if (!exists && postcondition.operator !== 'EXISTS' && postcondition.operator !== 'NOT_EXISTS') {
    return Object.freeze({
      postconditionId: postcondition.id,
      status: 'UNKNOWN',
      operator: postcondition.operator,
      targetPath: postcondition.targetPath,
      expectedValue: postcondition.expectedValue,
      observedValue: undefined,
      required: postcondition.required ?? true,
      priority: postcondition.priority ?? 'HIGH',
      message: `MISSING_EVIDENCE: Property "${postcondition.targetPath}" not found in observed execution state`,
    });
  }

  const evalResult = evaluatePredicate(postcondition.operator, value, postcondition.expectedValue, exists);

  return Object.freeze({
    postconditionId: postcondition.id,
    status: evalResult.status,
    operator: postcondition.operator,
    targetPath: postcondition.targetPath,
    expectedValue: postcondition.expectedValue,
    observedValue: value,
    required: postcondition.required ?? true,
    priority: postcondition.priority ?? 'HIGH',
    message: evalResult.message,
  });
}
