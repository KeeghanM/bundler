export type BundleStatus = "draft" | "active";

export type BundleEligibility =
  | {
      type: "collection";
      collectionIds: string[];
    }
  | {
      type: "product";
      productIds: string[];
      variantIds: string[];
    }
  | {
      type: "sku";
      skus: string[];
    };

export type BundleGroup = {
  id: string;
  title: string;
  eligibility: BundleEligibility[];
  minQuantity: number;
  maxQuantity?: number;
};

export type BundleDiscount = {
  type: "percentage" | "fixed_amount";
  value: number;
  appliesTo: "bundle_items";
};

export type BundleRule = {
  id: string;
  shop: string;
  title: string;
  description?: string;
  status: BundleStatus;
  triggerProductIds: string[];
  triggerCollectionIds: string[];
  groups: BundleGroup[];
  discount: BundleDiscount;
  startsAt?: string;
  endsAt?: string;
  allowMultipleApplications: boolean;
  priority: number;
  excludedProductIds: string[];
  excludedCollectionIds: string[];
  widgetViews: number;
  addToCartClicks: number;
  successfulAddsToCart: number;
  discountApplications: number;
  createdAt: string;
  updatedAt: string;
};

export type CartLine = {
  id: string;
  productId: string;
  variantId: string;
  sku?: string;
  collectionIds: string[];
  quantity: number;
};

export type DiscountTarget = {
  lineId: string;
  quantity: number;
};

export type BundleDiscountApplication = {
  ruleId: string;
  ruleTitle: string;
  discount: BundleDiscount;
  targets: DiscountTarget[];
};

export type BundleMessage = {
  ruleId: string;
  ruleTitle: string;
  status: "complete" | "missing";
  message: string;
  missingGroups: string[];
};
