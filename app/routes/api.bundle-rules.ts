import type { LoaderFunctionArgs } from "react-router";
import { isRuleRelevantToProduct } from "../lib/bundle-engine";
import type { CartLine, BundleGroup } from "../lib/bundle-types";
import { listActiveBundleRules, recordBundleMetric } from "../models/bundle-rule.server";
import { unauthenticated } from "../shopify.server";

type AdminGraphqlClient = {
  graphql: (
    query: string,
    options: { variables: Record<string, unknown> },
  ) => Promise<{ json: () => Promise<unknown> }>;
};

type ImageNode = {
  url?: string | null;
};

type ProductNode = {
  id?: string | null;
  title?: string | null;
  featuredImage?: ImageNode | null;
};

type ShopifyVariantNode = {
  id: string;
  title: string;
  price: string;
  image?: ImageNode | null;
  product?: ProductNode | null;
  bundleCollectionIds: string[];
};

type WidgetVariant = {
  id: string;
  productId: string | null;
  title: string;
  productTitle: string;
  price: string;
  image: string | null;
  productImage: string | null;
  collectionIds: string[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (payload: unknown, init?: ResponseInit): Response => {
  return Response.json(payload, { ...init, headers: { ...corsHeaders, ...init?.headers } });
};

const splitQueryValues = (value: string | null): string[] => {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getString = (value: unknown): string | undefined => {
  return typeof value === "string" ? value : undefined;
};

const parseImageNode = (value: unknown): ImageNode | null => {
  if (!isRecord(value)) {
    return null;
  }

  return { url: getString(value.url) ?? null };
};

const parseProductNode = (value: unknown): ProductNode | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: getString(value.id) ?? null,
    title: getString(value.title) ?? null,
    featuredImage: parseImageNode(value.featuredImage),
  };
};

const parseVariantNode = (
  value: unknown,
  bundleCollectionIds: string[] = [],
): ShopifyVariantNode | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = getString(value.id);
  const title = getString(value.title);
  const price = getString(value.price);

  if (!id || !title || !price) {
    return undefined;
  }

  return {
    id,
    title,
    price,
    image: parseImageNode(value.image),
    product: parseProductNode(value.product),
    bundleCollectionIds,
  };
};

const getPayloadData = (payload: unknown): Record<string, unknown> | undefined => {
  return isRecord(payload) && isRecord(payload.data) ? payload.data : undefined;
};

const getNodeList = (payload: unknown): unknown[] => {
  const data = getPayloadData(payload);
  return Array.isArray(data?.nodes) ? data.nodes : [];
};

const getVariantNodes = (product: unknown): unknown[] => {
  if (!isRecord(product) || !isRecord(product.variants)) {
    return [];
  }

  return Array.isArray(product.variants.nodes) ? product.variants.nodes : [];
};

const getCollectionProductNodes = (payload: unknown): unknown[] => {
  const data = getPayloadData(payload);

  if (!data || !isRecord(data.collection) || !isRecord(data.collection.products)) {
    return [];
  }

  return Array.isArray(data.collection.products.nodes) ? data.collection.products.nodes : [];
};

const getCurrentProduct = (
  url: URL,
): Pick<CartLine, "productId" | "variantId" | "sku" | "collectionIds"> => {
  return {
    productId: url.searchParams.get("productId") ?? "",
    variantId: url.searchParams.get("variantId") ?? "",
    sku: url.searchParams.get("sku") ?? undefined,
    collectionIds: splitQueryValues(url.searchParams.get("collectionIds")),
  };
};

async function fetchVariantsForGroup(
  admin: AdminGraphqlClient,
  group: BundleGroup,
  limit: number = 20,
): Promise<WidgetVariant[]> {
  const eligibleVariantGids = new Set<string>();
  const eligibleProductGids = new Set<string>();
  const collectionGids = new Set<string>();

  for (const el of group.eligibility) {
    if (el.type === 'product') {
      el.variantIds.forEach(id => eligibleVariantGids.add(id));
      el.productIds.forEach(id => eligibleProductGids.add(id));
    } else if (el.type === 'collection') {
      el.collectionIds.forEach(id => collectionGids.add(id));
    }
  }

  const resultVariants: ShopifyVariantNode[] = [];

  // If there are explicit variants
  if (eligibleVariantGids.size > 0) {
    const ids = Array.from(eligibleVariantGids).slice(0, limit);
    const res = await admin.graphql(`
      query getVariants($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            title
            price
            image { url }
            product { 
              id
              title 
              featuredImage { url }
            }
          }
        }
      }
    `, { variables: { ids } });
    const data = await res.json();
    for (const node of getNodeList(data)) {
      const variant = parseVariantNode(node);

      if (variant) {
        resultVariants.push(variant);
      }
    }
  }

  // If there are products, fetch their first variants
  if (eligibleProductGids.size > 0 && resultVariants.length < limit) {
    const ids = Array.from(eligibleProductGids).slice(0, limit - resultVariants.length);
    const res = await admin.graphql(`
      query getProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            title
            featuredImage { url }
            variants(first: 50) {
              nodes {
                id
                title
                price
                image { url }
                product { 
                  id
                  title
                  featuredImage { url }
                }
              }
            }
          }
        }
      }
    `, { variables: { ids } });
    const data = await res.json();
    for (const node of getNodeList(data)) {
      for (const variantNode of getVariantNodes(node)) {
        const variant = parseVariantNode(variantNode);

        if (variant) {
          resultVariants.push(variant);
        }
      }
    }
  }

  // If there are collections, fetch their products and first variants
  if (collectionGids.size > 0 && resultVariants.length < limit) {
    const ids = Array.from(collectionGids).slice(0, 3); // check first few collections
    for (const id of ids) {
      if (resultVariants.length >= limit) break;
      const res = await admin.graphql(`
        query getCollection($id: ID!, $first: Int!) {
          collection(id: $id) {
            products(first: $first) {
              nodes {
                title
                featuredImage { url }
                variants(first: 50) {
                  nodes {
                    id
                    title
                    price
                    image { url }
                    product { 
                      id
                      title 
                      featuredImage { url }
                    }
                  }
                }
              }
            }
          }
        }
      `, { variables: { id, first: limit - resultVariants.length } });
      const data = await res.json();
      for (const product of getCollectionProductNodes(data)) {
        for (const variantNode of getVariantNodes(product)) {
          const variant = parseVariantNode(variantNode, [id]);

          if (variant) {
            resultVariants.push(variant);
          }
        }
      }
    }
  }

  const variantsById = new Map<string, ShopifyVariantNode>();

  for (const variant of resultVariants) {
    const existing = variantsById.get(variant.id);
    const collectionIds = Array.from(
      new Set([
        ...(existing?.bundleCollectionIds ?? []),
        ...(variant.bundleCollectionIds ?? []),
      ]),
    );

    variantsById.set(variant.id, {
      ...existing,
      ...variant,
      bundleCollectionIds: collectionIds,
    });
  }

  return Array.from(variantsById.values()).slice(0, limit).map((v) => ({
    id: v.id,
    productId: v.product?.id || null,
    title: v.title,
    productTitle: v.product?.title || '',
    price: v.price,
    image: v.image?.url || null,
    productImage: v.product?.featuredImage?.url || null,
    collectionIds: v.bundleCollectionIds,
  }));
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const mode = url.searchParams.get("mode") || "dropdowns";
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);

  if (!shop) {
    return json({ error: "shop is required" }, { status: 400 });
  }

  const rules = await listActiveBundleRules(shop);
  const product = getCurrentProduct(url);
  const relevantRules = product.productId
    ? rules.filter((rule) => isRuleRelevantToProduct(rule, product))
    : rules;

  await Promise.all(relevantRules.map((rule) => recordBundleMetric(shop, rule.id, "widgetViews")));

  // If dropdowns mode is enabled, resolve variants for all groups
  const enrichedRules = [];
  let adminClient = null;

  if (["dropdowns", "carousel"].includes(mode) && relevantRules.length > 0) {
    const { admin } = await unauthenticated.admin(shop);
    adminClient = admin;
  }

  for (const rule of relevantRules) {
    const enrichedGroups = [];
    for (const group of rule.groups) {
      let variants: WidgetVariant[] = [];
      if (adminClient) {
        variants = await fetchVariantsForGroup(adminClient, group, limit);
      }
      enrichedGroups.push({
        ...group,
        variants
      });
    }
    enrichedRules.push({
      ...rule,
      groups: enrichedGroups
    });
  }

  return json({ rules: enrichedRules });
};
