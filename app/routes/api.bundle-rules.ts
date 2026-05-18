import type { LoaderFunctionArgs } from "react-router";
import { isRuleRelevantToProduct } from "../lib/bundle-engine";
import type { CartLine } from "../lib/bundle-types";
import { listActiveBundleRules, recordBundleMetric } from "../models/bundle-rule.server";

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "shop is required" }, { status: 400 });
  }

  const rules = await listActiveBundleRules(shop);
  const product = getCurrentProduct(url);
  const relevantRules = product.productId
    ? rules.filter((rule) => isRuleRelevantToProduct(rule, product))
    : rules;

  await Promise.all(relevantRules.map((rule) => recordBundleMetric(shop, rule.id, "widgetViews")));

  return json({ rules: relevantRules });
};
