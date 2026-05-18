import prisma from "../db.server";
import type { BundleRule } from "../lib/bundle-types";
import { parseJsonArray, parseJsonGroups, validateBundleRuleInput } from "../lib/bundle-validation";

type BundleRuleRecord = {
  id: string;
  shop: string;
  title: string;
  description: string | null;
  status: string;
  triggerProductIdsJson: string;
  triggerCollectionIdsJson: string;
  groupsJson: string;
  discountType: string;
  discountValue: number;
  discountAppliesTo: string;
  startsAt: Date | null;
  endsAt: Date | null;
  allowMultipleApplications: boolean;
  priority: number;
  excludedProductIdsJson: string;
  excludedCollectionIdsJson: string;
  widgetViews: number;
  addToCartClicks: number;
  successfulAddsToCart: number;
  discountApplications: number;
  createdAt: Date;
  updatedAt: Date;
};

export type BundleRuleMutationResult =
  | { success: true; rule: BundleRule }
  | { success: false; errors: string[] };

const serializeDate = (date: Date | null): string | undefined => {
  return date ? date.toISOString() : undefined;
};

const toBundleRule = (record: BundleRuleRecord): BundleRule => {
  return {
    id: record.id,
    shop: record.shop,
    title: record.title,
    ...(record.description ? { description: record.description } : {}),
    status: record.status === "active" ? "active" : "draft",
    triggerProductIds: parseJsonArray(record.triggerProductIdsJson),
    triggerCollectionIds: parseJsonArray(record.triggerCollectionIdsJson),
    groups: parseJsonGroups(record.groupsJson),
    discount: {
      type: record.discountType === "fixed_amount" ? "fixed_amount" : "percentage",
      value: record.discountValue,
      appliesTo: "bundle_items",
    },
    startsAt: serializeDate(record.startsAt),
    endsAt: serializeDate(record.endsAt),
    allowMultipleApplications: record.allowMultipleApplications,
    priority: record.priority,
    excludedProductIds: parseJsonArray(record.excludedProductIdsJson),
    excludedCollectionIds: parseJsonArray(record.excludedCollectionIdsJson),
    widgetViews: record.widgetViews,
    addToCartClicks: record.addToCartClicks,
    successfulAddsToCart: record.successfulAddsToCart,
    discountApplications: record.discountApplications,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};

const toRecordData = (
  rule: Omit<
    BundleRule,
    | "id"
    | "shop"
    | "widgetViews"
    | "addToCartClicks"
    | "successfulAddsToCart"
    | "discountApplications"
    | "createdAt"
    | "updatedAt"
  >,
) => {
  return {
    title: rule.title,
    description: rule.description ?? null,
    status: rule.status,
    triggerProductIdsJson: JSON.stringify(rule.triggerProductIds),
    triggerCollectionIdsJson: JSON.stringify(rule.triggerCollectionIds),
    groupsJson: JSON.stringify(rule.groups),
    discountType: rule.discount.type,
    discountValue: rule.discount.value,
    discountAppliesTo: rule.discount.appliesTo,
    startsAt: rule.startsAt ? new Date(rule.startsAt) : null,
    endsAt: rule.endsAt ? new Date(rule.endsAt) : null,
    allowMultipleApplications: rule.allowMultipleApplications,
    priority: rule.priority,
    excludedProductIdsJson: JSON.stringify(rule.excludedProductIds),
    excludedCollectionIdsJson: JSON.stringify(rule.excludedCollectionIds),
  };
};

const parsePayload = (value: FormDataEntryValue | null): unknown => {
  if (typeof value !== "string") {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

export const parseBundleRuleFormData = async (request: Request): Promise<unknown> => {
  const formData = await request.formData();
  return parsePayload(formData.get("payload"));
};

export const listBundleRules = async (shop: string): Promise<BundleRule[]> => {
  const records = await prisma.bundleRule.findMany({
    where: { shop },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return records.map(toBundleRule);
};

export const listActiveBundleRules = async (shop: string): Promise<BundleRule[]> => {
  const records = await prisma.bundleRule.findMany({
    where: { shop, status: "active" },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return records.map(toBundleRule);
};

export const getBundleRule = async (shop: string, id: string): Promise<BundleRule | undefined> => {
  const record = await prisma.bundleRule.findFirst({ where: { id, shop } });
  return record ? toBundleRule(record) : undefined;
};

export const createBundleRule = async (
  shop: string,
  input: unknown,
): Promise<BundleRuleMutationResult> => {
  const validation = validateBundleRuleInput(input);

  if (!validation.success) {
    return validation;
  }

  const record = await prisma.bundleRule.create({
    data: { shop, ...toRecordData(validation.data) },
  });

  return { success: true, rule: toBundleRule(record) };
};

export const updateBundleRule = async (
  shop: string,
  id: string,
  input: unknown,
): Promise<BundleRuleMutationResult> => {
  const validation = validateBundleRuleInput(input);

  if (!validation.success) {
    return validation;
  }

  const existingRule = await getBundleRule(shop, id);

  if (!existingRule) {
    return { success: false, errors: ["Bundle rule was not found."] };
  }

  const record = await prisma.bundleRule.update({
    where: { id },
    data: toRecordData(validation.data),
  });

  return { success: true, rule: toBundleRule(record) };
};

export const deleteBundleRule = async (shop: string, id: string): Promise<boolean> => {
  const existingRule = await getBundleRule(shop, id);

  if (!existingRule) {
    return false;
  }

  await prisma.bundleRule.delete({ where: { id } });
  return true;
};

export const setBundleRuleStatus = async (
  shop: string,
  id: string,
  status: "draft" | "active",
): Promise<BundleRuleMutationResult> => {
  const existingRule = await getBundleRule(shop, id);

  if (!existingRule) {
    return { success: false, errors: ["Bundle rule was not found."] };
  }

  const validation = validateBundleRuleInput({ ...existingRule, status });

  if (!validation.success) {
    return validation;
  }

  const record = await prisma.bundleRule.update({ where: { id }, data: { status } });
  return { success: true, rule: toBundleRule(record) };
};

export const recordBundleMetric = async (
  shop: string,
  id: string,
  metric: "widgetViews" | "addToCartClicks" | "successfulAddsToCart" | "discountApplications",
): Promise<void> => {
  const existingRule = await getBundleRule(shop, id);

  if (!existingRule) {
    return;
  }

  await prisma.bundleRule.update({ where: { id }, data: { [metric]: { increment: 1 } } });
};
