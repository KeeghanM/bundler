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

const fieldStyle = {
  display: "grid",
  gap: "0.35rem",
} as const;

const inputStyle = {
  border: "1px solid #c9cccf",
  borderRadius: "0.5rem",
  font: "inherit",
  padding: "0.7rem 0.8rem",
  width: "100%",
  boxSizing: "border-box",
} as const;

const labelStyle = {
  fontSize: "0.85rem",
  fontWeight: 650,
} as const;

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
        <div style={{ display: "grid", gap: "1rem" }}>
          <label style={fieldStyle}>
            <span style={labelStyle}>Bundle name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              style={inputStyle}
            />
          </label>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <label style={fieldStyle}>
              <span style={labelStyle}>Status</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value === "active" ? "active" : "draft")
                }
                style={inputStyle}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Priority</span>
              <input
                type="number"
                value={priority}
                onChange={(event) => setPriority(Number(event.target.value))}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Start date</span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>End date</span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
        </div>
      </s-section>

      <s-section heading="Discount">
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label style={fieldStyle}>
            <span style={labelStyle}>Discount type</span>
            <select
              value={discountType}
              onChange={(event) =>
                setDiscountType(
                  event.target.value === "fixed_amount" ? "fixed_amount" : "percentage",
                )
              }
              style={inputStyle}
            >
              <option value="percentage">Percentage off bundle items</option>
              <option value="fixed_amount">Fixed amount off bundle items</option>
            </select>
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Discount value</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discountValue}
              onChange={(event) => setDiscountValue(Number(event.target.value))}
              style={inputStyle}
            />
          </label>

          <label style={{ ...fieldStyle, alignContent: "end" }}>
            <span style={labelStyle}>Multiple applications</span>
            <span>
              <input
                type="checkbox"
                checked={allowMultipleApplications}
                onChange={(event) => setAllowMultipleApplications(event.target.checked)}
              />{" "}
              Allow multiple qualifying sets per cart
            </span>
          </label>
        </div>
      </s-section>

      <s-section heading="Required groups">
        <s-stack direction="block" gap="base">
          {groups.map((group, groupIndex) => (
            <s-box key={group.id} padding="base" borderWidth="base" borderRadius="base">
              <div style={{ display: "grid", gap: "1rem" }}>
                <div
                  style={{
                    display: "grid",
                    gap: "1rem",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  }}
                >
                  <label style={fieldStyle}>
                    <span style={labelStyle}>Group name</span>
                    <input
                      value={group.title}
                      onChange={(event) => updateGroup(group.id, { title: event.target.value })}
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldStyle}>
                    <span style={labelStyle}>Minimum quantity</span>
                    <input
                      type="number"
                      min="1"
                      value={group.minQuantity}
                      onChange={(event) =>
                        updateGroup(group.id, { minQuantity: Number(event.target.value) })
                      }
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldStyle}>
                    <span style={labelStyle}>Maximum quantity</span>
                    <input
                      value={group.maxQuantity}
                      onChange={(event) =>
                        updateGroup(group.id, { maxQuantity: event.target.value })
                      }
                      style={inputStyle}
                      placeholder="Optional"
                    />
                  </label>
                </div>

                {group.eligibility.map((eligibility) => (
                  <div
                    key={eligibility.id}
                    style={{
                      display: "grid",
                      gap: "0.75rem",
                      gridTemplateColumns: "minmax(140px, 0.6fr) 1fr 1fr auto",
                    }}
                  >
                    <label style={fieldStyle}>
                      <span style={labelStyle}>Source type</span>
                      <select
                        value={eligibility.type}
                        onChange={(event) =>
                          updateEligibility(group.id, eligibility.id, {
                            type: event.target.value as EligibilityDraft["type"],
                          })
                        }
                        style={inputStyle}
                      >
                        <option value="collection">Collection IDs</option>
                        <option value="product">Product IDs</option>
                        <option value="sku">SKUs</option>
                      </select>
                    </label>
                    <label style={fieldStyle}>
                      <span style={labelStyle}>Sources</span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          value={eligibility.sourceIds}
                          onChange={(event) =>
                            updateEligibility(group.id, eligibility.id, {
                              sourceIds: event.target.value,
                            })
                          }
                          style={inputStyle}
                          placeholder="Comma-separated GIDs or SKUs"
                        />
                        {eligibility.type !== "sku" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleResourcePicker(
                                eligibility.type,
                                eligibility.sourceIds,
                                (val) => updateEligibility(group.id, eligibility.id, { sourceIds: val })
                              )
                            }
                          >
                            Browse
                          </button>
                        )}
                      </div>
                    </label>
                    <label style={fieldStyle}>
                      <span style={labelStyle}>Variant IDs</span>
                      <input
                        disabled={eligibility.type !== "product"}
                        value={eligibility.variantIds}
                        onChange={(event) =>
                          updateEligibility(group.id, eligibility.id, {
                            variantIds: event.target.value,
                          })
                        }
                        style={inputStyle}
                        placeholder="Optional for product sources"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateGroup(group.id, {
                          eligibility: group.eligibility.filter(
                            (item) => item.id !== eligibility.id,
                          ),
                        })
                      }
                      disabled={group.eligibility.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() =>
                      updateGroup(group.id, {
                        eligibility: [...group.eligibility, emptyEligibility()],
                      })
                    }
                  >
                    Add source rule
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGroups((currentGroups) =>
                        currentGroups.filter((item) => item.id !== group.id),
                      )
                    }
                    disabled={groups.length <= 2}
                  >
                    Remove group {groupIndex + 1}
                  </button>
                </div>
              </div>
            </s-box>
          ))}

          <button
            type="button"
            onClick={() =>
              setGroups((currentGroups) => [...currentGroups, emptyGroup(currentGroups.length + 1)])
            }
          >
            Add required group
          </button>
        </s-stack>
      </s-section>

      <s-section heading="Display and exclusions">
        <s-stack direction="block" gap="base">
          <label style={{ ...fieldStyle, alignContent: "end" }}>
            <span>
              <input
                type="checkbox"
                checked={showOnAllValid}
                onChange={(event) => setShowOnAllValid(event.target.checked)}
              />{" "}
              Show on all valid products (automatically infers triggers from required groups)
            </span>
          </label>

          {!showOnAllValid && (
            <div style={{ display: "grid", gap: "1rem" }}>
              <label style={fieldStyle}>
                <span style={labelStyle}>Trigger products</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    value={triggerProductIds}
                    onChange={(event) => setTriggerProductIds(event.target.value)}
                    style={inputStyle}
                    placeholder="Optional product GIDs for widget display"
                  />
                  <button type="button" onClick={() => handleResourcePicker('product', triggerProductIds, setTriggerProductIds)}>Browse</button>
                </div>
              </label>
              <label style={fieldStyle}>
                <span style={labelStyle}>Trigger collections</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    value={triggerCollectionIds}
                    onChange={(event) => setTriggerCollectionIds(event.target.value)}
                    style={inputStyle}
                    placeholder="Optional collection GIDs for widget display"
                  />
                  <button type="button" onClick={() => handleResourcePicker('collection', triggerCollectionIds, setTriggerCollectionIds)}>Browse</button>
                </div>
              </label>
            </div>
          )}

          <div style={{ display: "grid", gap: "1rem" }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Excluded products</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  value={excludedProductIds}
                  onChange={(event) => setExcludedProductIds(event.target.value)}
                  style={inputStyle}
                  placeholder="Optional product GIDs"
                />
                <button type="button" onClick={() => handleResourcePicker('product', excludedProductIds, setExcludedProductIds)}>Browse</button>
              </div>
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Excluded collections</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  value={excludedCollectionIds}
                  onChange={(event) => setExcludedCollectionIds(event.target.value)}
                  style={inputStyle}
                  placeholder="Optional collection GIDs"
                />
                <button type="button" onClick={() => handleResourcePicker('collection', excludedCollectionIds, setExcludedCollectionIds)}>Browse</button>
              </div>
            </label>
          </div>
        </s-stack>
      </s-section>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/app">Cancel</a>
        <button type="submit">{submitLabel}</button>
      </div>
    </s-stack>
  );
}
