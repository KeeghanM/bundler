import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getBundleMessages } from "../lib/bundle-engine";
import type { CartLine } from "../lib/bundle-types";
import { listActiveBundleRules } from "../models/bundle-rule.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (payload: unknown, init?: ResponseInit): Response => {
  return Response.json(payload, { ...init, headers: { ...corsHeaders, ...init?.headers } });
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const parseLines = (value: unknown): CartLine[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((line) => {
    if (!isRecord(line)) {
      return [];
    }

    const id = typeof line.id === "string" ? line.id : undefined;
    const productId = typeof line.productId === "string" ? line.productId : undefined;
    const variantId = typeof line.variantId === "string" ? line.variantId : undefined;

    if (!id || !productId || !variantId) {
      return [];
    }

    return [
      {
        id,
        productId,
        variantId,
        sku: typeof line.sku === "string" ? line.sku : undefined,
        collectionIds: Array.isArray(line.collectionIds)
          ? line.collectionIds.filter((item): item is string => typeof item === "string")
          : [],
        quantity: Math.max(1, Number(line.quantity) || 1),
      },
    ];
  });
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return json({ error: "Use POST for cart messaging." }, { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const payload: unknown = await request.json().catch(() => undefined);

  if (!isRecord(payload) || typeof payload.shop !== "string") {
    return json({ error: "shop is required" }, { status: 400 });
  }

  const rules = await listActiveBundleRules(payload.shop);
  const lines = parseLines(payload.lines);

  return json({ messages: getBundleMessages(rules, lines) });
};
