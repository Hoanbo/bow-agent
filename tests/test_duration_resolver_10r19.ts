import assert from 'node:assert/strict';
import { extractDuration } from '../src/core/intentResolver.js';

const months = (value: string | undefined): number | undefined => {
  const match = value?.match(/^(\d+)\s+tháng$/);
  if (match) return Number(match[1]);
  if (value === '1 năm') return 12;
  return undefined;
};

const cases: Array<[string, number]> = [
  ['Mua YouTube Premium 1 tháng', 1],
  ['Mua YouTube Premium 1 thang', 1],
  ['Mua YouTube Premium 3 tháng', 3],
  ['Mua YouTube Premium 3 thang', 3],
  ['Mua YouTube Premium 6 tháng', 6],
  ['Mua YouTube Premium 6 thang', 6],
  ['Mua YouTube Premium 12 tháng', 12],
  ['Mua YouTube Premium 1 năm', 12],
  ['Mua YouTube Premium 24 tháng', 24],
  ['Mua YouTube Premium 24 thang', 24],
  ['Mua Netflix 24 tháng', 24],
  ['Mua ChatGPT 24 tháng', 24],
  ['Mua một sản phẩm khác 24 tháng', 24],
];

for (const [input, expected] of cases) {
  const parsed = extractDuration(input);
  assert.equal(months(parsed), expected, `${input} should resolve to ${expected} months`);
}

for (const input of ['24 tháng', '18 tháng', '15 tháng', '9 tháng', '7 tháng']) {
  const parsed = extractDuration(input);
  assert.notEqual(months(parsed), 1, `${input} must never downgrade to one month`);
  assert.equal(months(parsed), Number(input.split(' ')[0]));
}

console.log(`STEP_10R19_DURATION_PASS=${cases.length + 5}`);
