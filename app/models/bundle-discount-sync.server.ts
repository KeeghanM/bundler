import prisma from "../db.server";
import {
  collectBundleRuleCollectionIds,
  getBundleDiscountRuntimeConfig,
} from "../lib/bundle-runtime-config";
import type { BundleRule } from "../lib/bundle-types";

const BUNDLE_DISCOUNT_TITLE = "Bundler automatic bundle discounts";
const BUNDLE_DISCOUNT_METAFIELD_NAMESPACE = "$app:bundler";
const BUNDLE_DISCOUNT_METAFIELD_KEY = "bundle_rules";
const COLLECTION_VARIABLE_LIMIT = 100;

type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<{ json: () => Promise<unknown> }>;
};

type BundleDiscountSyncState = {
  shop: string;
  automaticDiscountId?: string;
  functionId: string;
  lastSyncedAt: string;
};

export type BundleDiscountSyncResult =
  | { success: true; sync: BundleDiscountSyncState }
  | { success: false; errors: string[] };

const CREATE_AUTOMATIC_DISCOUNT_MUTATION = `#graphql
  mutation CreateBundlerAutomaticDiscount($automaticAppDiscount: DiscountAutomaticAppInput!) {
    discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
      userErrors {
        field
        message
      }
      automaticAppDiscount {
        discountId
        title
        status
        appDiscountType {
          appKey
          functionId
        }
      }
    }
  }
`;

const UPDATE_AUTOMATIC_DISCOUNT_MUTATION = `#graphql
  mutation UpdateBundlerAutomaticDiscount($id: ID!, $automaticAppDiscount: DiscountAutomaticAppInput!) {
    discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
      userErrors {
        field
        message
      }
      automaticAppDiscount {
        discountId
        title
        status
        appDiscountType {
          appKey
          functionId
        }
      }
    }
  }
`;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getFunctionId = (): string | undefined => {
  const id = process.env.SHOPIFY_BUNDLE_DISCOUNT_FUNCTION_ID?.trim();
  return id || undefined;
};

const getUserErrors = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((error) => {
    if (!isRecord(error) || typeof error.message !== "string") {
      return [];
    }

    if (Array.isArray(error.field) && error.field.length > 0) {
      return [`${error.field.join(".")}: ${error.message}`];
    }

    return [error.message];
  });
};

const getAutomaticDiscountId = (payload: unknown, operation: string): string | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const data = payload.data;
  if (!isRecord(data)) {
    return undefined;
  }

  const result = data[operation];
  if (!isRecord(result)) {
    return undefined;
  }

  const automaticAppDiscount = result.automaticAppDiscount;
  if (!isRecord(automaticAppDiscount)) {
    return undefined;
  }

  return typeof automaticAppDiscount.discountId === "string"
    ? automaticAppDiscount.discountId
    : undefined;
};

const getMutationErrors = (payload: unknown, operation: string): string[] => {
  if (!isRecord(payload)) {
    return ["Shopify returned an invalid discount sync response."];
  }

  const graphQLErrors = getUserErrors(payload.errors);
  if (graphQLErrors.length > 0) {
    return graphQLErrors;
  }

  const data = payload.data;
  if (!isRecord(data)) {
    return ["Shopify returned an invalid discount sync payload."];
  }

  const result = data[operation];
  if (!isRecord(result)) {
    return ["Shopify returned an invalid discount sync result."];
  }

  return getUserErrors(result.userErrors);
};

const getAutomaticDiscountInput = (rules: BundleRule[], functionId: string) => {
  const collectionIds = collectBundleRuleCollectionIds(rules);

  if (collectionIds.length > COLLECTION_VARIABLE_LIMIT) {
    return {
      success: false as const,
      errors: [
        `Bundle rules reference ${collectionIds.length} collections, but Shopify Function input variables support up to ${COLLECTION_VARIABLE_LIMIT}. Reduce the active collection sources before syncing discounts.`,
      ],
    };
  }

  return {
    success: true as const,
    input: {
      title: BUNDLE_DISCOUNT_TITLE,
      functionId,
      startsAt: new Date().toISOString(),
      metafields: [
        {
          namespace: BUNDLE_DISCOUNT_METAFIELD_NAMESPACE,
          key: BUNDLE_DISCOUNT_METAFIELD_KEY,
          type: "json",
          value: JSON.stringify(getBundleDiscountRuntimeConfig(rules)),
        },
      ],
    },
  };
};

const runAutomaticDiscountMutation = async ({
  admin,
  automaticDiscountId,
  automaticAppDiscount,
}: {
  admin: AdminGraphqlClient;
  automaticDiscountId?: string;
  automaticAppDiscount: Record<string, unknown>;
}): Promise<{ automaticDiscountId?: string; errors: string[] }> => {
  const operation = automaticDiscountId
    ? "discountAutomaticAppUpdate"
    : "discountAutomaticAppCreate";
  const response = await admin.graphql(
    automaticDiscountId
      ? UPDATE_AUTOMATIC_DISCOUNT_MUTATION
      : CREATE_AUTOMATIC_DISCOUNT_MUTATION,
    {
      variables: automaticDiscountId
        ? { id: automaticDiscountId, automaticAppDiscount }
        : { automaticAppDiscount },
    },
  );
  const payload = await response.json();
  const errors = getMutationErrors(payload, operation);

  if (errors.length > 0) {
    return { errors };
  }

  return {
    automaticDiscountId: getAutomaticDiscountId(payload, operation),
    errors: [],
  };
};

export const getBundleDiscountSync = async (
  shop: string,
): Promise<BundleDiscountSyncState | undefined> => {
  const record = await prisma.bundleDiscountSync.findUnique({ where: { shop } });

  if (!record) {
    return undefined;
  }

  return {
    shop: record.shop,
    automaticDiscountId: record.automaticDiscountId ?? undefined,
    functionId: record.functionId,
    lastSyncedAt: record.lastSyncedAt.toISOString(),
  };
};

export const syncBundleDiscount = async ({
  shop,
  admin,
  activeRules,
}: {
  shop: string;
  admin: AdminGraphqlClient;
  activeRules: BundleRule[];
}): Promise<BundleDiscountSyncResult> => {
  const functionId = getFunctionId();

  if (!functionId) {
    return {
      success: false,
      errors: [
        "SHOPIFY_BUNDLE_DISCOUNT_FUNCTION_ID is not configured, so Bundler cannot create the automatic discount.",
      ],
    };
  }

  const existingSync = await prisma.bundleDiscountSync.findUnique({ where: { shop } });

  if (!existingSync && activeRules.length === 0) {
    const record = await prisma.bundleDiscountSync.upsert({
      where: { shop },
      create: { shop, functionId, lastSyncedAt: new Date() },
      update: { functionId, lastSyncedAt: new Date() },
    });

    return {
      success: true,
      sync: {
        shop: record.shop,
        automaticDiscountId: record.automaticDiscountId ?? undefined,
        functionId: record.functionId,
        lastSyncedAt: record.lastSyncedAt.toISOString(),
      },
    };
  }

  const discountInput = getAutomaticDiscountInput(activeRules, functionId);

  if (!discountInput.success) {
    return { success: false, errors: discountInput.errors };
  }

  const mutationResult = await runAutomaticDiscountMutation({
    admin,
    automaticDiscountId: existingSync?.automaticDiscountId ?? undefined,
    automaticAppDiscount: discountInput.input,
  });

  if (mutationResult.errors.length > 0) {
    return { success: false, errors: mutationResult.errors };
  }

  const automaticDiscountId =
    mutationResult.automaticDiscountId ?? existingSync?.automaticDiscountId;

  if (!automaticDiscountId) {
    return {
      success: false,
      errors: ["Shopify did not return an automatic discount ID."],
    };
  }

  const record = await prisma.bundleDiscountSync.upsert({
    where: { shop },
    create: {
      shop,
      automaticDiscountId,
      functionId,
      lastSyncedAt: new Date(),
    },
    update: {
      automaticDiscountId,
      functionId,
      lastSyncedAt: new Date(),
    },
  });

  return {
    success: true,
    sync: {
      shop: record.shop,
      automaticDiscountId: record.automaticDiscountId ?? undefined,
      functionId: record.functionId,
      lastSyncedAt: record.lastSyncedAt.toISOString(),
    },
  };
};

export const isBundleDiscountFunctionConfigured = (): boolean => {
  return Boolean(getFunctionId());
};
