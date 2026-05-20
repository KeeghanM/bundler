import { describe, expect, it } from "vitest";
import type { BundleRule } from "./bundle-types";
import { getBundleDiscountRuntimeConfig } from "./bundle-runtime-config";

const getRule = (overrides: Partial<BundleRule> = {}): BundleRule => ({
  id: "rule-1",
  shop: "test.myshopify.com",
  title: "Shorts and tee",
  status: "active",
  triggerProductIds: [],
  triggerCollectionIds: [],
  groups: [
    {
      id: "shorts",
      title: "shorts",
      minQuantity: 1,
      eligibility: [
        {
          type: "collection",
          collectionIds: ["gid://shopify/Collection/shorts"],
        },
      ],
    },
    {
      id: "tees",
      title: "tees",
      minQuantity: 1,
      eligibility: [
        {
          type: "collection",
          collectionIds: ["gid://shopify/Collection/tees"],
        },
        {
          type: "product",
          productIds: ["gid://shopify/Product/1"],
          variantIds: [],
        },
      ],
    },
  ],
  discount: { type: "percentage", value: 15, appliesTo: "bundle_items" },
  allowMultipleApplications: false,
  priority: 0,
  excludedProductIds: [],
  excludedCollectionIds: ["gid://shopify/Collection/sale"],
  widgetViews: 0,
  addToCartClicks: 0,
  successfulAddsToCart: 0,
  discountApplications: 0,
  createdAt: "2026-05-20T00:00:00.000Z",
  updatedAt: "2026-05-20T00:00:00.000Z",
  ...overrides,
});

describe("bundle discount runtime config", () => {
  it("includes active rules and the collection IDs required for Function input variables", () => {
    const config = getBundleDiscountRuntimeConfig([
      getRule({
        groups: [
          ...getRule().groups,
          {
            id: "duplicate",
            title: "duplicate",
            minQuantity: 1,
            eligibility: [
              {
                type: "collection",
                collectionIds: ["gid://shopify/Collection/tees"],
              },
            ],
          },
        ],
      }),
    ]);

    expect(config.rules).toHaveLength(1);
    expect(config.collectionIds).toEqual([
      "gid://shopify/Collection/sale",
      "gid://shopify/Collection/shorts",
      "gid://shopify/Collection/tees",
    ]);
  });
});
