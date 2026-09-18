// src/contracts/catalogProvider.ts
// Pure domain contract for Catalog & Product retrieval

import type { ProductItemResult, CategoryInfo, PlanItemResult } from '../core/types.js';

export interface ProductPlanOption {
  id: string;
  name: string;
  price: number;
  duration?: string;
}

export interface CatalogProvider {
  getAllProducts(): Promise<ProductItemResult[]>;
  findProductsByKeyword(keyword: string): Promise<ProductItemResult[]>;
  findProductBySlug(slug: string): Promise<ProductItemResult | null>;
  getCategories(): Promise<CategoryInfo[]>;
  getPlanById(planId: string): Promise<PlanItemResult | null>;
  getPlanPrice(planId: string): Promise<number | null>;
}
