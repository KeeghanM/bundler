import type {
  BundleDiscountApplication,
  BundleEligibility,
  BundleGroup,
  BundleMessage,
  BundleRule,
  CartLine,
  DiscountTarget,
} from "./bundle-types";

type LineQuantityMap = Map<string, number>;

type Allocation = {
  groupId: string;
  targets: DiscountTarget[];
};

const getAvailableQuantity = (
  line: CartLine,
  consumed: LineQuantityMap,
  localConsumed: LineQuantityMap,
): number => {
  return Math.max(
    0,
    line.quantity - (consumed.get(line.id) ?? 0) - (localConsumed.get(line.id) ?? 0),
  );
};

const addConsumed = (target: DiscountTarget, consumed: LineQuantityMap): void => {
  consumed.set(target.lineId, (consumed.get(target.lineId) ?? 0) + target.quantity);
};

const hasOverlap = (left: string[], right: string[]): boolean => {
  return left.some((item) => right.includes(item));
};

const matchesEligibility = (line: CartLine, eligibility: BundleEligibility): boolean => {
  if (eligibility.type === "collection") {
    return hasOverlap(line.collectionIds, eligibility.collectionIds);
  }

  if (eligibility.type === "sku") {
    return line.sku ? eligibility.skus.includes(line.sku.toUpperCase()) : false;
  }

  if (eligibility.variantIds.length > 0 && eligibility.variantIds.includes(line.variantId)) {
    return true;
  }

  return eligibility.productIds.includes(line.productId);
};

export const matchesGroup = (line: CartLine, group: BundleGroup): boolean => {
  return group.eligibility.some((eligibility) => matchesEligibility(line, eligibility));
};

const isExcluded = (line: CartLine, rule: BundleRule): boolean => {
  if (rule.excludedProductIds.includes(line.productId)) {
    return true;
  }

  return hasOverlap(line.collectionIds, rule.excludedCollectionIds);
};

const isRuleInDateWindow = (rule: BundleRule, now?: Date): boolean => {
  if (rule.status !== "active") {
    return false;
  }

  if (!now) {
    return true;
  }

  if (rule.startsAt && new Date(rule.startsAt) > now) {
    return false;
  }

  if (rule.endsAt && new Date(rule.endsAt) < now) {
    return false;
  }

  return true;
};

export const isRuleRelevantToProduct = (
  rule: BundleRule,
  product: Pick<CartLine, "productId" | "variantId" | "sku" | "collectionIds">,
): boolean => {
  if (rule.triggerProductIds.includes(product.productId)) {
    return true;
  }

  if (hasOverlap(product.collectionIds, rule.triggerCollectionIds)) {
    return true;
  }

  return rule.groups.some((group) =>
    matchesGroup({ ...product, id: "current-product", quantity: 1 }, group),
  );
};

const allocateGroup = (
  group: BundleGroup,
  lines: CartLine[],
  consumed: LineQuantityMap,
  localConsumed: LineQuantityMap,
): Allocation | undefined => {
  let remaining = group.minQuantity;
  const targets: DiscountTarget[] = [];

  for (const line of lines) {
    if (!matchesGroup(line, group)) {
      continue;
    }

    const available = getAvailableQuantity(line, consumed, localConsumed);

    if (available < 1) {
      continue;
    }

    const quantity = Math.min(available, remaining);
    targets.push({ lineId: line.id, quantity });
    localConsumed.set(line.id, (localConsumed.get(line.id) ?? 0) + quantity);
    remaining -= quantity;

    if (remaining === 0) {
      return { groupId: group.id, targets };
    }
  }

  return undefined;
};

const mergeTargets = (allocations: Allocation[]): DiscountTarget[] => {
  const targetMap = new Map<string, number>();

  for (const allocation of allocations) {
    for (const target of allocation.targets) {
      targetMap.set(target.lineId, (targetMap.get(target.lineId) ?? 0) + target.quantity);
    }
  }

  return Array.from(targetMap.entries()).map(([lineId, quantity]) => ({ lineId, quantity }));
};

const allocateRuleSet = (
  rule: BundleRule,
  lines: CartLine[],
  consumed: LineQuantityMap,
): DiscountTarget[] | undefined => {
  const localConsumed: LineQuantityMap = new Map();
  const eligibleLines = lines.filter((line) => !isExcluded(line, rule));
  const allocations: Allocation[] = [];

  for (const group of rule.groups) {
    const allocation = allocateGroup(group, eligibleLines, consumed, localConsumed);

    if (!allocation) {
      return undefined;
    }

    allocations.push(allocation);
  }

  return mergeTargets(allocations);
};

export const calculateBundleDiscounts = (
  rules: BundleRule[],
  lines: CartLine[],
  now?: Date,
): BundleDiscountApplication[] => {
  const consumed: LineQuantityMap = new Map();
  const sortedRules = [...rules]
    .filter((rule) => isRuleInDateWindow(rule, now))
    .sort(
      (left, right) =>
        right.priority - left.priority || left.createdAt.localeCompare(right.createdAt),
    );
  const applications: BundleDiscountApplication[] = [];

  for (const rule of sortedRules) {
    let appliedCount = 0;

    while (appliedCount === 0 || rule.allowMultipleApplications) {
      const targets = allocateRuleSet(rule, lines, consumed);

      if (!targets || targets.length === 0) {
        break;
      }

      for (const target of targets) {
        addConsumed(target, consumed);
      }

      applications.push({
        ruleId: rule.id,
        ruleTitle: rule.title,
        discount: rule.discount,
        targets,
      });
      appliedCount += 1;
    }
  }

  return applications;
};

const getMissingGroups = (rule: BundleRule, lines: CartLine[]): string[] => {
  return rule.groups
    .filter(
      (group) =>
        !allocateGroup(
          group,
          lines.filter((line) => !isExcluded(line, rule)),
          new Map(),
          new Map(),
        ),
    )
    .map((group) => group.title);
};

export const getBundleMessages = (
  rules: BundleRule[],
  lines: CartLine[],
  now?: Date,
): BundleMessage[] => {
  return rules
    .filter((rule) => isRuleInDateWindow(rule, now))
    .map((rule) => {
      const missingGroups = getMissingGroups(rule, lines);

      if (missingGroups.length === 0) {
        return {
          ruleId: rule.id,
          ruleTitle: rule.title,
          status: "complete",
          message: `Bundle complete. ${rule.title} will discount qualifying items at checkout.`,
          missingGroups,
        };
      }

      return {
        ruleId: rule.id,
        ruleTitle: rule.title,
        status: "missing",
        message: `Add ${missingGroups.join(", ")} to unlock ${rule.title}.`,
        missingGroups,
      };
    });
};
