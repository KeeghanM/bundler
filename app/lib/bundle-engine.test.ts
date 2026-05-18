import { describe, expect, it } from "vitest";
import { calculateBundleDiscounts, getBundleMessages } from "./bundle-engine";
import type { BundleRule, CartLine } from "./bundle-types";

const now = new Date("2026-05-18T12:00:00.000Z");

const getRule = (overrides: Partial<BundleRule> = {}): BundleRule => ({
  id: "rule-1",
  shop: "test.myshopify.com",
  title: "Hero tee bundle",
  status: "active",
  triggerProductIds: [],
  triggerCollectionIds: [],
  groups: [
    {
      id: "group-sku",
      title: "Hero SKU",
      minQuantity: 1,
      eligibility: [{ type: "sku", skus: ["SKU-1234"] }],
    },
    {
      id: "group-collection",
      title: "T-shirts",
      minQuantity: 1,
      eligibility: [{ type: "collection", collectionIds: ["gid://shopify/Collection/1"] }],
    },
  ],
  discount: { type: "percentage", value: 15, appliesTo: "bundle_items" },
  allowMultipleApplications: false,
  priority: 0,
  excludedProductIds: [],
  excludedCollectionIds: [],
  widgetViews: 0,
  addToCartClicks: 0,
  successfulAddsToCart: 0,
  discountApplications: 0,
  createdAt: "2026-05-18T00:00:00.000Z",
  updatedAt: "2026-05-18T00:00:00.000Z",
  ...overrides,
});

const getLine = (overrides: Partial<CartLine> = {}): CartLine => ({
  id: "line-1",
  productId: "gid://shopify/Product/1",
  variantId: "gid://shopify/ProductVariant/1",
  sku: "SKU-1234",
  collectionIds: [],
  quantity: 1,
  ...overrides,
});

describe("bundle discount qualification", () => {
  it("applies a discount to exact SKU and collection-based bundle items", () => {
    const applications = calculateBundleDiscounts(
      [getRule()],
      [
        getLine(),
        getLine({
          id: "line-2",
          productId: "gid://shopify/Product/2",
          variantId: "gid://shopify/ProductVariant/2",
          sku: "TEE-1",
          collectionIds: ["gid://shopify/Collection/1"],
        }),
      ],
      now,
    );

    expect(applications).toHaveLength(1);
    expect(applications[0]?.discount).toEqual({
      type: "percentage",
      value: 15,
      appliesTo: "bundle_items",
    });
    expect(applications[0]?.targets).toEqual([
      { lineId: "line-1", quantity: 1 },
      { lineId: "line-2", quantity: 1 },
    ]);
  });

  it("does not discount when the exact SKU requirement is missing", () => {
    const applications = calculateBundleDiscounts(
      [getRule()],
      [
        getLine({
          id: "line-2",
          productId: "gid://shopify/Product/2",
          variantId: "gid://shopify/ProductVariant/2",
          sku: "TEE-1",
          collectionIds: ["gid://shopify/Collection/1"],
        }),
      ],
      now,
    );

    expect(applications).toEqual([]);
  });

  it("handles multiple bundle sets when multiple applications are allowed", () => {
    const applications = calculateBundleDiscounts(
      [getRule({ allowMultipleApplications: true })],
      [
        getLine({ quantity: 2 }),
        getLine({
          id: "line-2",
          productId: "gid://shopify/Product/2",
          variantId: "gid://shopify/ProductVariant/2",
          sku: "TEE-1",
          collectionIds: ["gid://shopify/Collection/1"],
          quantity: 2,
        }),
      ],
      now,
    );

    expect(applications).toHaveLength(2);
    expect(applications.flatMap((application) => application.targets)).toEqual([
      { lineId: "line-1", quantity: 1 },
      { lineId: "line-2", quantity: 1 },
      { lineId: "line-1", quantity: 1 },
      { lineId: "line-2", quantity: 1 },
    ]);
  });

  it("does not double-discount the same line across competing rules", () => {
    const lowerPriorityRule = getRule({ id: "rule-2", priority: 0 });
    const higherPriorityRule = getRule({ id: "rule-1", priority: 10 });
    const applications = calculateBundleDiscounts(
      [lowerPriorityRule, higherPriorityRule],
      [
        getLine(),
        getLine({
          id: "line-2",
          productId: "gid://shopify/Product/2",
          variantId: "gid://shopify/ProductVariant/2",
          sku: "TEE-1",
          collectionIds: ["gid://shopify/Collection/1"],
        }),
      ],
      now,
    );

    expect(applications).toHaveLength(1);
    expect(applications[0]?.ruleId).toBe("rule-1");
  });

  it("reports missing groups for cart messaging", () => {
    const messages = getBundleMessages([getRule()], [getLine()], now);

    expect(messages).toEqual([
      {
        ruleId: "rule-1",
        ruleTitle: "Hero tee bundle",
        status: "missing",
        message: "Add T-shirts to unlock Hero tee bundle.",
        missingGroups: ["T-shirts"],
      },
    ]);
  });
});
