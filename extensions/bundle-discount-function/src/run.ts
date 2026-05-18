import { calculateBundleDiscounts } from "../../../app/lib/bundle-engine";
import type { BundleRule, CartLine } from "../../../app/lib/bundle-types";

type FunctionInput = {
  cart?: {
    lines?: FunctionCartLine[];
  };
  discount?: {
    metafield?: {
      jsonValue?: unknown;
    } | null;
  } | null;
};

type FunctionCartLine = {
  id: string;
  quantity: number;
  bundleCollectionIds?: {
    value?: string | null;
  } | null;
  merchandise?: {
    __typename?: string;
    id?: string;
    sku?: string | null;
    product?: { id?: string } | null;
  } | null;
};

type ProductVariantMerchandise = {
  __typename: "ProductVariant";
  id: string;
  sku?: string | null;
  product: { id?: string };
};

type FunctionTarget = {
  cartLine: {
    id: string;
    quantity: number;
  };
};

type ProductDiscountCandidate = {
  message: string;
  targets: FunctionTarget[];
  value:
    | { percentage: { value: string } }
    | { fixedAmount: { amount: string; appliesToEachItem: boolean } };
};

type FunctionResult = {
  operations: Array<{
    productDiscountsAdd: {
      candidates: ProductDiscountCandidate[];
      selectionStrategy: "ALL" | "FIRST" | "MAXIMUM";
    };
  }>;
};

const emptyDiscount: FunctionResult = {
  operations: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const parseCollectionIds = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const parseRules = (value: unknown): BundleRule[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((rule): rule is BundleRule => {
    if (!isRecord(rule)) {
      return false;
    }

    return (
      typeof rule.id === "string" &&
      typeof rule.title === "string" &&
      Array.isArray(rule.groups) &&
      isRecord(rule.discount)
    );
  });
};

const isProductVariantMerchandise = (
  value: FunctionCartLine["merchandise"],
): value is ProductVariantMerchandise => {
  if (!isRecord(value) || value.__typename !== "ProductVariant") {
    return false;
  }

  return typeof value.id === "string" && isRecord(value.product);
};

const toCartLine = (line: FunctionCartLine): CartLine | undefined => {
  const merchandise = line.merchandise;

  if (!isProductVariantMerchandise(merchandise)) {
    return undefined;
  }

  const productId = merchandise.product.id;

  if (typeof productId !== "string") {
    return undefined;
  }

  return {
    id: line.id,
    productId,
    variantId: merchandise.id,
    sku: typeof merchandise.sku === "string" ? merchandise.sku : undefined,
    collectionIds: parseCollectionIds(line.bundleCollectionIds?.value),
    quantity: line.quantity,
  };
};

const toProductDiscountCandidate = ({
  ruleTitle,
  discount,
  targets,
}: ReturnType<typeof calculateBundleDiscounts>[number]): ProductDiscountCandidate => {
  return {
    message: `${ruleTitle} bundle discount`,
    targets: targets.map((target) => ({
      cartLine: { id: target.lineId, quantity: target.quantity },
    })),
    value:
      discount.type === "percentage"
        ? { percentage: { value: String(discount.value) } }
        : { fixedAmount: { amount: String(discount.value), appliesToEachItem: false } },
  };
};

export function cartLinesDiscountsGenerateRun(input: FunctionInput): FunctionResult {
  const rules = parseRules(input.discount?.metafield?.jsonValue);

  if (rules.length === 0) {
    return emptyDiscount;
  }

  const lines = (input.cart?.lines ?? []).flatMap((line) => {
    const parsed = toCartLine(line);
    return parsed ? [parsed] : [];
  });

  if (lines.length === 0) {
    return emptyDiscount;
  }

  const applications = calculateBundleDiscounts(rules, lines);

  if (applications.length === 0) {
    return emptyDiscount;
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: applications.map(toProductDiscountCandidate),
          selectionStrategy: "ALL",
        },
      },
    ],
  };
}
