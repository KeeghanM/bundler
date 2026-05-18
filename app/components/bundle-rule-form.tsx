import { useState, useEffect, useRef } from "react";
import type { BundleEligibility, BundleGroup, BundleRule } from "../lib/bundle-types";

type EligibilityDraft = {
  id: string;
  type: "collection" | "product" | "sku";
  sourceIds: string;
  variantIds: string;
};

type GroupDraft = {
  id: string;
  title: string;
  minQuantity: number;
  maxQuantity: string;
  eligibility: EligibilityDraft[];
};

type BundleRuleFormProps = {
  rule?: BundleRule;
  errors?: string[];
  submitLabel: string;
};

const emptyEligibility = (): EligibilityDraft => ({
  id: crypto.randomUUID(),
  type: "collection",
  sourceIds: "",
  variantIds: "",
});

const emptyGroup = (index: number): GroupDraft => ({
  id: crypto.randomUUID(),
  title: `Group ${index}`,
  minQuantity: 1,
  maxQuantity: "",
  eligibility: [emptyEligibility()],
});

const joinValues = (values: string[]): string => values.join(", ");

const splitValues = (value: string): string[] => {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const eligibilityToDraft = (eligibility: BundleEligibility): EligibilityDraft => {
  if (eligibility.type === "collection") {
    return {
      id: crypto.randomUUID(),
      type: "collection",
      sourceIds: joinValues(eligibility.collectionIds),
      variantIds: "",
    };
  }

  if (eligibility.type === "product") {
    return {
      id: crypto.randomUUID(),
      type: "product",
      sourceIds: joinValues(eligibility.productIds),
      variantIds: joinValues(eligibility.variantIds),
    };
  }

  return {
    id: crypto.randomUUID(),
    type: "sku",
    sourceIds: joinValues(eligibility.skus),
    variantIds: "",
  };
};

const groupToDraft = (group: BundleGroup): GroupDraft => ({
  id: group.id,
  title: group.title,
  minQuantity: group.minQuantity,
  maxQuantity: group.maxQuantity ? String(group.maxQuantity) : "",
  eligibility: group.eligibility.map(eligibilityToDraft),
});

const draftToEligibility = (draft: EligibilityDraft): BundleEligibility | undefined => {
  if (draft.type === "collection") {
    const collectionIds = splitValues(draft.sourceIds);
    return collectionIds.length > 0 ? { type: "collection", collectionIds } : undefined;
  }

  if (draft.type === "product") {
    const productIds = splitValues(draft.sourceIds);
    const variantIds = splitValues(draft.variantIds);
    return productIds.length > 0 || variantIds.length > 0
      ? { type: "product", productIds, variantIds }
      : undefined;
  }

  const skus = splitValues(draft.sourceIds).map((sku) => sku.toUpperCase());
  return skus.length > 0 ? { type: "sku", skus } : undefined;
};

const draftToGroup = (draft: GroupDraft): BundleGroup | undefined => {
  const eligibility = draft.eligibility.flatMap((item) => {
    const parsed = draftToEligibility(item);
    return parsed ? [parsed] : [];
  });

  if (eligibility.length === 0) {
    return undefined;
  }

  const maxQuantity = Number(draft.maxQuantity);

  return {
    id: draft.id,
    title: draft.title.trim() || "Required group",
    eligibility,
    minQuantity: Math.max(1, Math.floor(draft.minQuantity || 1)),
    ...(Number.isInteger(maxQuantity) && maxQuantity > 0 ? { maxQuantity } : {}),
  };
};







export default function BundleRuleForm({ rule, errors = [], submitLabel }: BundleRuleFormProps) {
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length > 0 && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [errors]);

  const [title, setTitle] = useState(rule?.title ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [status, setStatus] = useState<"draft" | "active">(rule?.status ?? "draft");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">(
    rule?.discount.type ?? "percentage",
  );
  const [discountValue, setDiscountValue] = useState(rule?.discount.value ?? 15);
  const [allowMultipleApplications, setAllowMultipleApplications] = useState(
    rule?.allowMultipleApplications ?? false,
  );
  const [priority, setPriority] = useState(rule?.priority ?? 0);
  const [startsAt, setStartsAt] = useState(rule?.startsAt?.slice(0, 16) ?? "");
  const [endsAt, setEndsAt] = useState(rule?.endsAt?.slice(0, 16) ?? "");
  const [triggerProductIds, setTriggerProductIds] = useState(
    joinValues(rule?.triggerProductIds ?? []),
  );
  const [triggerCollectionIds, setTriggerCollectionIds] = useState(
    joinValues(rule?.triggerCollectionIds ?? []),
  );
  const [excludedProductIds, setExcludedProductIds] = useState(
    joinValues(rule?.excludedProductIds ?? []),
  );
  const [excludedCollectionIds, setExcludedCollectionIds] = useState(
    joinValues(rule?.excludedCollectionIds ?? []),
  );
  const [showOnAllValid, setShowOnAllValid] = useState(
    rule ? (rule.triggerProductIds.length === 0 && rule.triggerCollectionIds.length === 0) : true
  );
  const [groups, setGroups] = useState<GroupDraft[]>(
    rule?.groups.length ? rule.groups.map(groupToDraft) : [emptyGroup(1), emptyGroup(2)],
  );

  const payload = JSON.stringify({
    title,
    description,
    status,
    triggerProductIds: showOnAllValid ? [] : splitValues(triggerProductIds),
    triggerCollectionIds: showOnAllValid ? [] : splitValues(triggerCollectionIds),
    groups: groups.flatMap((group) => {
      const parsed = draftToGroup(group);
      return parsed ? [parsed] : [];
    }),
    discount: {
      type: discountType,
      value: discountValue,
      appliesTo: "bundle_items",
    },
    startsAt,
    endsAt,
    allowMultipleApplications,
    priority,
    excludedProductIds: splitValues(excludedProductIds),
    excludedCollectionIds: splitValues(excludedCollectionIds),
  });

  const updateGroup = (id: string, nextGroup: Partial<GroupDraft>) => {
    setGroups((currentGroups) =>
      currentGroups.map((group) => (group.id === id ? { ...group, ...nextGroup } : group)),
    );
  };

  const updateEligibility = (
    groupId: string,
    eligibilityId: string,
    nextEligibility: Partial<EligibilityDraft>,
  ) => {
    setGroups((currentGroups) =>
      currentGroups.map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        return {
          ...group,
          eligibility: group.eligibility.map((eligibility) =>
            eligibility.id === eligibilityId ? { ...eligibility, ...nextEligibility } : eligibility,
          ),
        };
      }),
    );
  };

  const handleResourcePicker = async (type: "product" | "collection", current: string, setter: (val: string) => void) => {
    // @ts-ignore
    if (typeof window !== "undefined" && window.shopify) {
      // @ts-ignore
      const selected = await window.shopify.resourcePicker({ type, action: "select", multiple: true });
      if (selected && selected.length > 0) {
        const ids = selected.map((item: any) => item.id);
        const currentIds = current.split(",").map(s => s.trim()).filter(Boolean);
        const newIds = Array.from(new Set([...currentIds, ...ids]));
        setter(newIds.join(", "));
      }
    } else {
      alert("Resource picker is only available inside the Shopify Admin");
    }
  };

  return (
    <s-stack direction="block" gap="base">
      {errors.length > 0 && (
        <div ref={errorRef} style={{ scrollMarginTop: "2rem" }}>
          <s-section heading="Fix these issues">
            <s-unordered-list>
              {errors.map((error) => (
                <s-list-item key={error}>{error}</s-list-item>
              ))}
            </s-unordered-list>
          </s-section>
        </div>
      )}

      <input type="hidden" name="payload" value={payload} />

      <s-section heading="Bundle details">
        <s-stack direction="block" gap="base">
          <s-text-field
            label="Bundle name"
            value={title}
            onInput={(event: any) => setTitle(event.target.value)}
          />

          <s-text-area
            label="Description"
            value={description}
            onInput={(event: any) => setDescription(event.target.value)}
            rows={3}
          />

          <s-grid grid-template-columns="repeat(auto-fit, minmax(180px, 1fr))" gap="base">
            <s-select
              label="Status"
              value={status}
              onChange={(event: any) =>
                setStatus(event.target.value === "active" ? "active" : "draft")
              }
            >
              <s-option value="draft">Draft</s-option>
              <s-option value="active">Active</s-option>
            </s-select>

            <s-number-field
              label="Priority"
              value={String(priority)}
              onInput={(event: any) => setPriority(Number(event.target.value))}
            />

            <s-date-field
              label="Start date"
              include-time
              value={startsAt}
              onInput={(event: any) => setStartsAt(event.target.value)}
            />

            <s-date-field
              label="End date"
              include-time
              value={endsAt}
              onInput={(event: any) => setEndsAt(event.target.value)}
            />
          </s-grid>
        </s-stack>
      </s-section>

      <s-section heading="Discount">
        <s-grid grid-template-columns="repeat(auto-fit, minmax(220px, 1fr))" gap="base">
          <s-select
            label="Discount type"
            value={discountType}
            onChange={(event: any) =>
              setDiscountType(
                event.target.value === "fixed_amount" ? "fixed_amount" : "percentage",
              )
            }
          >
            <s-option value="percentage">Percentage off bundle items</s-option>
            <s-option value="fixed_amount">Fixed amount off bundle items</s-option>
          </s-select>

          <s-number-field
            label="Discount value"
            min={0}
            step={0.01}
            value={String(discountValue)}
            onInput={(event: any) => setDiscountValue(Number(event.target.value))}
          />

          <s-checkbox
            label="Allow multiple qualifying sets per cart"
            checked={allowMultipleApplications}
            onChange={(event: any) => setAllowMultipleApplications(event.target.checked)}
          />
        </s-grid>
      </s-section>

      <s-section heading="Required groups">
        <s-stack direction="block" gap="base">
          {groups.map((group, groupIndex) => (
            <s-box key={group.id} padding="base" border="base" border-radius="base">
              <s-stack direction="block" gap="base">
                <s-grid grid-template-columns="repeat(auto-fit, minmax(180px, 1fr))" gap="base">
                  <s-text-field
                    label="Group name"
                    value={group.title}
                    onInput={(event: any) => updateGroup(group.id, { title: event.target.value })}
                  />
                  <s-number-field
                    label="Minimum quantity"
                    min={1}
                    value={String(group.minQuantity)}
                    onInput={(event: any) =>
                      updateGroup(group.id, { minQuantity: Number(event.target.value) })
                    }
                  />
                  <s-text-field
                    label="Maximum quantity"
                    value={group.maxQuantity}
                    onInput={(event: any) =>
                      updateGroup(group.id, { maxQuantity: event.target.value })
                    }
                    placeholder="Optional"
                  />
                </s-grid>

                {group.eligibility.map((eligibility) => (
                  <s-box key={eligibility.id} padding="base" background="subdued" border-radius="base">
                    <s-stack direction="block" gap="base">
                      <s-grid grid-template-columns="repeat(auto-fit, minmax(150px, 1fr))" gap="base">
                        <s-select
                          label="Source type"
                          value={eligibility.type}
                          onChange={(event: any) =>
                            updateEligibility(group.id, eligibility.id, {
                              type: event.target.value as EligibilityDraft["type"],
                            })
                          }
                        >
                          <s-option value="collection">Collection IDs</s-option>
                          <s-option value="product">Product IDs</s-option>
                          <s-option value="sku">SKUs</s-option>
                        </s-select>
                        <s-text-field
                          label="Sources"
                          value={eligibility.sourceIds}
                          onInput={(event: any) =>
                            updateEligibility(group.id, eligibility.id, {
                              sourceIds: event.target.value,
                            })
                          }
                          placeholder="Comma-separated GIDs or SKUs"
                        />
                        <s-text-field
                          label="Variant IDs"
                          disabled={eligibility.type !== "product"}
                          value={eligibility.variantIds}
                          onInput={(event: any) =>
                            updateEligibility(group.id, eligibility.id, {
                              variantIds: event.target.value,
                            })
                          }
                          placeholder="Optional for product sources"
                        />
                      </s-grid>
                      <s-stack direction="inline" gap="base" align-items="center">
                        {eligibility.type !== "sku" && (
                          <s-button
                            variant="secondary"
                            onClick={() =>
                              handleResourcePicker(
                                eligibility.type,
                                eligibility.sourceIds,
                                (val) => updateEligibility(group.id, eligibility.id, { sourceIds: val })
                              )
                            }
                          >
                            Browse sources
                          </s-button>
                        )}
                        <s-button
                          variant="tertiary"
                          tone="critical"
                          onClick={() =>
                            updateGroup(group.id, {
                              eligibility: group.eligibility.filter(
                                (item) => item.id !== eligibility.id,
                              ),
                            })
                          }
                          disabled={group.eligibility.length === 1}
                        >
                          Remove rule
                        </s-button>
                      </s-stack>
                    </s-stack>
                  </s-box>
                ))}

                <s-stack direction="inline" gap="base">
                  <s-button
                    variant="secondary"
                    onClick={() =>
                      updateGroup(group.id, {
                        eligibility: [...group.eligibility, emptyEligibility()],
                      })
                    }
                  >
                    Add source rule
                  </s-button>
                  <s-button
                    variant="tertiary"
                    tone="critical"
                    onClick={() =>
                      setGroups((currentGroups) =>
                        currentGroups.filter((item) => item.id !== group.id),
                      )
                    }
                    disabled={groups.length <= 2}
                  >
                    Remove group {groupIndex + 1}
                  </s-button>
                </s-stack>
              </s-stack>
            </s-box>
          ))}

          <s-stack direction="inline">
            <s-button
              onClick={() =>
                setGroups((currentGroups) => [...currentGroups, emptyGroup(currentGroups.length + 1)])
              }
            >
              Add required group
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section heading="Display and exclusions">
        <s-stack direction="block" gap="base">
          <s-checkbox
            label="Show on all valid products (automatically infers triggers from required groups)"
            checked={showOnAllValid}
            onChange={(event: any) => setShowOnAllValid(event.target.checked)}
          />

          {!showOnAllValid && (
            <s-grid grid-template-columns="1fr 1fr" gap="base">
              <s-stack direction="block" gap="base">
                <s-text-field
                  label="Trigger products"
                  value={triggerProductIds}
                  onInput={(event: any) => setTriggerProductIds(event.target.value)}
                  placeholder="Optional product GIDs for widget display"
                />
                <s-button variant="secondary" onClick={() => handleResourcePicker('product', triggerProductIds, setTriggerProductIds)}>Browse products</s-button>
              </s-stack>
              <s-stack direction="block" gap="base">
                <s-text-field
                  label="Trigger collections"
                  value={triggerCollectionIds}
                  onInput={(event: any) => setTriggerCollectionIds(event.target.value)}
                  placeholder="Optional collection GIDs for widget display"
                />
                <s-button variant="secondary" onClick={() => handleResourcePicker('collection', triggerCollectionIds, setTriggerCollectionIds)}>Browse collections</s-button>
              </s-stack>
            </s-grid>
          )}

          <s-grid grid-template-columns="1fr 1fr" gap="base">
            <s-stack direction="block" gap="base">
              <s-text-field
                label="Excluded products"
                value={excludedProductIds}
                onInput={(event: any) => setExcludedProductIds(event.target.value)}
                placeholder="Optional product GIDs"
              />
              <s-button variant="secondary" onClick={() => handleResourcePicker('product', excludedProductIds, setExcludedProductIds)}>Browse products</s-button>
            </s-stack>
            <s-stack direction="block" gap="base">
              <s-text-field
                label="Excluded collections"
                value={excludedCollectionIds}
                onInput={(event: any) => setExcludedCollectionIds(event.target.value)}
                placeholder="Optional collection GIDs"
              />
              <s-button variant="secondary" onClick={() => handleResourcePicker('collection', excludedCollectionIds, setExcludedCollectionIds)}>Browse collections</s-button>
            </s-stack>
          </s-grid>
        </s-stack>
      </s-section>

      <s-divider direction="inline" color="base"></s-divider>
      
      <s-stack direction="inline" gap="base" align-items="center">
        <s-button variant="secondary" href="/app">Cancel</s-button>
        <s-button variant="primary" type="submit">{submitLabel}</s-button>
      </s-stack>
    </s-stack>
  );
}
