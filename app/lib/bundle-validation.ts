import type {
  BundleDiscount,
  BundleEligibility,
  BundleGroup,
  BundleRule,
  BundleStatus,
} from "./bundle-types";

type BundleRuleInput = Omit<
  BundleRule,
  | "id"
  | "shop"
  | "widgetViews"
  | "addToCartClicks"
  | "successfulAddsToCart"
  | "discountApplications"
  | "createdAt"
  | "updatedAt"
>;

type ValidationResult =
  | { success: true; data: BundleRuleInput }
  | { success: false; errors: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const getOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const getPositiveInteger = (value: unknown, fallback: number): number => {
  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(numeric) || numeric < 1) {
    return fallback;
  }

  return numeric;
};

const parseStatus = (value: unknown): BundleStatus => {
  return value === "active" ? "active" : "draft";
};

const parseEligibility = (value: unknown): BundleEligibility | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  if (value.type === "collection") {
    const collectionIds = getStringArray(value.collectionIds);
    return collectionIds.length > 0 ? { type: "collection", collectionIds } : undefined;
  }

  if (value.type === "product") {
    const productIds = getStringArray(value.productIds);
    const variantIds = getStringArray(value.variantIds);
    return productIds.length > 0 || variantIds.length > 0
      ? { type: "product", productIds, variantIds }
      : undefined;
  }

  if (value.type === "sku") {
    const skus = getStringArray(value.skus).map((sku) => sku.toUpperCase());
    return skus.length > 0 ? { type: "sku", skus } : undefined;
  }

  return undefined;
};

const parseGroups = (value: unknown): BundleGroup[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((groupValue, index) => {
    if (!isRecord(groupValue)) {
      return [];
    }

    const title = getOptionalString(groupValue.title) ?? `Group ${index + 1}`;
    const eligibility = Array.isArray(groupValue.eligibility)
      ? groupValue.eligibility.flatMap((item) => {
          const parsed = parseEligibility(item);
          return parsed ? [parsed] : [];
        })
      : [];

    if (eligibility.length === 0) {
      return [];
    }

    const maxQuantity = groupValue.maxQuantity
      ? getPositiveInteger(groupValue.maxQuantity, 1)
      : undefined;

    return [
      {
        id: getOptionalString(groupValue.id) ?? crypto.randomUUID(),
        title,
        eligibility,
        minQuantity: getPositiveInteger(groupValue.minQuantity, 1),
        ...(maxQuantity ? { maxQuantity } : {}),
      },
    ];
  });
};

const parseDiscount = (value: unknown): BundleDiscount | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const type = value.type === "fixed_amount" ? "fixed_amount" : "percentage";
  const discountValue = Number(value.value);

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return undefined;
  }

  if (type === "percentage" && discountValue > 100) {
    return undefined;
  }

  return { type, value: discountValue, appliesTo: "bundle_items" };
};

const getIsoDate = (value: unknown): string | undefined => {
  const date = getOptionalString(value);

  if (!date) {
    return undefined;
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

export const validateBundleRuleInput = (input: unknown): ValidationResult => {
  if (!isRecord(input)) {
    return { success: false, errors: ["Bundle rule payload is invalid."] };
  }

  const title = getOptionalString(input.title);
  const groups = parseGroups(input.groups);
  const discount = parseDiscount(input.discount);
  const errors: string[] = [];

  if (!title) {
    errors.push("Bundle name is required.");
  }

  if (groups.length < 2) {
    errors.push("Add at least two required groups with eligible sources.");
  }

  if (!discount) {
    errors.push("Add a percentage or fixed amount discount greater than zero.");
  }

  if (errors.length > 0 || !title || !discount) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      title,
      status: parseStatus(input.status),
      description: getOptionalString(input.description),
      triggerProductIds: getStringArray(input.triggerProductIds),
      triggerCollectionIds: getStringArray(input.triggerCollectionIds),
      groups,
      discount,
      startsAt: getIsoDate(input.startsAt),
      endsAt: getIsoDate(input.endsAt),
      allowMultipleApplications: input.allowMultipleApplications === true,
      priority: Number.isInteger(Number(input.priority)) ? Number(input.priority) : 0,
      excludedProductIds: getStringArray(input.excludedProductIds),
      excludedCollectionIds: getStringArray(input.excludedCollectionIds),
    },
  };
};

export const parseJsonArray = (value: string): string[] => {
  try {
    return getStringArray(JSON.parse(value));
  } catch {
    return [];
  }
};

export const parseJsonGroups = (value: string): BundleGroup[] => {
  try {
    return parseGroups(JSON.parse(value));
  } catch {
    return [];
  }
};
