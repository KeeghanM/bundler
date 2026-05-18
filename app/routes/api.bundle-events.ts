import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { recordBundleMetric } from "../models/bundle-rule.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (payload: unknown, init?: ResponseInit): Response => {
  return Response.json(payload, { ...init, headers: { ...corsHeaders, ...init?.headers } });
};

const eventMetricMap = {
  add_to_cart_clicked: "addToCartClicks",
  add_to_cart_succeeded: "successfulAddsToCart",
  discount_applied: "discountApplications",
  widget_viewed: "widgetViews",
} as const;

type BundleEventName = keyof typeof eventMetricMap;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isBundleEventName = (value: unknown): value is BundleEventName => {
  return typeof value === "string" && value in eventMetricMap;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return json({ error: "Use POST for bundle events." }, { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const payload: unknown = await request.json().catch(() => undefined);

  if (
    !isRecord(payload) ||
    typeof payload.shop !== "string" ||
    typeof payload.ruleId !== "string"
  ) {
    return json({ error: "shop and ruleId are required" }, { status: 400 });
  }

  if (!isBundleEventName(payload.event)) {
    return json({ error: "event is not supported" }, { status: 400 });
  }

  await recordBundleMetric(payload.shop, payload.ruleId, eventMetricMap[payload.event]);
  return json({ ok: true });
};
