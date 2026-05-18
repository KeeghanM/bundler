import type { LoaderFunctionArgs } from "react-router";
import { isRuleRelevantToProduct } from "../lib/bundle-engine";
import type { CartLine, BundleGroup } from "../lib/bundle-types";
import { listActiveBundleRules, recordBundleMetric } from "../models/bundle-rule.server";
import { unauthenticated } from "../shopify.server";

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

async function fetchVariantsForGroup(admin: any, group: BundleGroup, limit: number = 20) {
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

  const resultVariants = [];

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
            product { title }
          }
        }
      }
    `, { variables: { ids } });
    const data = await res.json();
    if (data.data?.nodes) {
      for (const node of data.data.nodes) {
        if (node) resultVariants.push(node);
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
            variants(first: 5) {
              nodes {
                id
                title
                price
                product { title }
              }
            }
          }
        }
      }
    `, { variables: { ids } });
    const data = await res.json();
    if (data.data?.nodes) {
      for (const node of data.data.nodes) {
        if (node?.variants?.nodes) {
          resultVariants.push(...node.variants.nodes);
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
                variants(first: 5) {
                  nodes {
                    id
                    title
                    price
                    product { title }
                  }
                }
              }
            }
          }
        }
      `, { variables: { id, first: limit - resultVariants.length } });
      const data = await res.json();
      if (data.data?.collection?.products?.nodes) {
        for (const product of data.data.collection.products.nodes) {
          if (product?.variants?.nodes) {
            resultVariants.push(...product.variants.nodes);
          }
        }
      }
    }
  }

  return resultVariants.slice(0, limit).map(v => ({
    id: v.id,
    title: v.product?.title ? `${v.product.title} - ${v.title}` : v.title,
    price: v.price
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

  if (mode === "dropdowns" && relevantRules.length > 0) {
    const { admin } = await unauthenticated.admin(shop);
    adminClient = admin;
  }

  for (const rule of relevantRules) {
    const enrichedGroups = [];
    for (const group of rule.groups) {
      let variants = [];
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
