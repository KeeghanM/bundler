import type { BundleRule } from "./bundle-types";

export const collectBundleRuleCollectionIds = (rules: BundleRule[]): string[] => {
  const collectionIds = new Set<string>();

  for (const rule of rules) {
    rule.excludedCollectionIds.forEach((id) => collectionIds.add(id));

    for (const group of rule.groups) {
      for (const eligibility of group.eligibility) {
        if (eligibility.type === "collection") {
          eligibility.collectionIds.forEach((id) => collectionIds.add(id));
        }
      }
    }
  }

  return Array.from(collectionIds);
};

export const getBundleDiscountRuntimeConfig = (rules: BundleRule[]) => {
  return {
    rules,
    collectionIds: collectBundleRuleCollectionIds(rules),
  };
};
