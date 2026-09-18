// src/contracts/commerceProvider.ts
// BOWCON V4.0 — GENERIC COMMERCE & BUSINESS DOMAIN PROVIDER CONTRACT
//
// EN:
// Minimal generic interface that ANY business domain (e-commerce, CRM, SaaS billing,
// inventory, booking, etc.) can implement. The Agent Core interacts strictly through
// this abstract provider boundary, completely independent of retail products, pricing,
// or specific vendor databases.
//
// VI:
// Giao diện tổng quát tối thiểu mà BẤT KỲ domain nghiệp vụ nào (thương mại điện tử,
// CRM, thanh toán SaaS, kho hàng, đặt lịch, v.v.) đều có thể triển khai. Lõi Agent
// tương tác độc quyền qua ranh giới trừu tượng này, hoàn toàn không phụ thuộc vào
// sản phẩm bán lẻ, bảng giá, hay cơ sở dữ liệu của nhà cung cấp cụ thể.
export { registerCommerceProvider, getActiveCommerceProvider, resetCommerceProvider, NOOP_COMMERCE_PROVIDER, } from '../core/commerceRegistry.js';
