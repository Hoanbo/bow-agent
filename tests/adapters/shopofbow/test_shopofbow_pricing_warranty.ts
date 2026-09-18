import assert from 'node:assert';
import { extractShopDuration, matchPlanByDuration } from '../../../src/adapters/shopofbow/shopIntentResolver.js';
import { getMyWalletBalance, checkWarrantyPolicy } from '../../../src/adapters/shopofbow/shopTools.js';
import type { AgentContext } from '../../../src/core/types.js';

console.log('Running ShopOfBow Adapter Pricing & Warranty Invariant Suite...');

// 1. Domain duration & plan matching
const d1m = extractShopDuration('mua youtube 1 thang');
const d6m = extractShopDuration('mua youtube 6 thang');
const d12m = extractShopDuration('mua youtube 1 nam');
const dToken = extractShopDuration('mua 100m token');

assert(d1m === '1 tháng', 'Duration 1 month parsed as "1m"');
assert(d6m === '6 tháng', 'Duration 6 months parsed as "6m"');
assert(d12m === '1 năm', 'Duration 1 year parsed as "12m"');
assert(dToken === '100M Token', 'Token duration parsed as "100M Token"');

const mockPlans = [
  { id: 'yt-1m', name: '1 Thang', duration: '1 thang', price: 35000 },
  { id: 'yt-6m', name: '6 Thang', duration: '6 thang', price: 280000 },
  { id: 'yt-12m', name: '12 Thang', duration: '12 thang', price: 450000 },
];

const p1m = matchPlanByDuration(mockPlans as any, '1 tháng');
const p6m = matchPlanByDuration(mockPlans as any, '6 tháng');
const p12m = matchPlanByDuration(mockPlans as any, '1 năm');

assert(p1m?.price === 35000, 'YouTube 1m is immutable at 35.000đ');
assert(p6m?.price === 280000, 'YouTube 6m is immutable at 280.000đ');
assert(p12m?.price === 450000, 'YouTube 12m is immutable at 450.000đ');

// 2. Wallet & Warranty boundary
const anonContext: AgentContext = { role: 'anonymous' };
const walletRes = await getMyWalletBalance(anonContext);
assert(walletRes.success === false, 'getMyWalletBalance rejects unauthenticated user without error');

const warrantyRes = await checkWarrantyPolicy({ productName: 'YouTube Premium' });
assert(warrantyRes.success === true, 'checkWarrantyPolicy returns deterministic response');

console.log('ShopOfBow adapter pricing & warranty tests passed.');
