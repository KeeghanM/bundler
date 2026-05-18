(function () {
  const selector = ".bundler-widget";

  const parseJson = (value, fallback) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const toNumericId = (gid) => {
    const parts = String(gid || "").split("/");
    return parts[parts.length - 1];
  };

  const formatDiscount = (discount) => {
    if (discount.type === "percentage") {
      return `${discount.value}% off qualifying bundle items`;
    }

    return `${discount.value} off qualifying bundle items`;
  };

  const escapeHtml = (value) => {
    const escapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return String(value || "").replace(/[&<>"']/g, (character) => escapeMap[character]);
  };

  const groupMatchesProduct = (group, context) => {
    return group.eligibility.some((eligibility) => {
      if (eligibility.type === "collection") {
        return eligibility.collectionIds.some((id) => context.collectionIds.includes(id));
      }

      if (eligibility.type === "product") {
        return (
          eligibility.productIds.includes(context.productId) ||
          eligibility.variantIds.includes(context.variantId)
        );
      }

      return context.sku && eligibility.skus.includes(context.sku.toUpperCase());
    });
  };

  const getExactVariantSuggestion = (group) => {
    for (const eligibility of group.eligibility) {
      if (eligibility.type === "product" && eligibility.variantIds.length > 0) {
        return toNumericId(eligibility.variantIds[0]);
      }
    }

    return "";
  };

  const postEvent = (apiBase, shop, ruleId, event) => {
    fetch(`${apiBase}/bundle-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop, ruleId, event }),
    }).catch(function () {});
  };

  const addBundleToCart = async (block, rule, context) => {
    const selectedInputs = Array.from(block.querySelectorAll("[data-bundler-variant-input]"));
    const selectedVariants = selectedInputs.map((input) => input.value.trim()).filter(Boolean);
    const currentVariant = toNumericId(context.variantId);
    const collectionIds = JSON.stringify(context.collectionIds);
    const items = [currentVariant, ...selectedVariants].map((variantId) => ({
      id: variantId,
      quantity: 1,
      properties: {
        _bundle_rule_id: rule.id,
        _bundle_collection_ids: collectionIds,
      },
    }));

    postEvent(context.apiBase, context.shop, rule.id, "add_to_cart_clicked");

    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      throw new Error("Could not add the bundle to cart. Check selections and try again.");
    }

    postEvent(context.apiBase, context.shop, rule.id, "add_to_cart_succeeded");
  };

  const renderRule = (block, rule, context) => {
    const selectedGroups = rule.groups.filter((group) => groupMatchesProduct(group, context));
    const missingGroups = rule.groups.filter((group) => !groupMatchesProduct(group, context));
    const card = document.createElement("div");
    card.className = "bundler-widget__card";
    card.innerHTML = `
      <p class="bundler-widget__eyebrow">Bundle offer</p>
      <h3 class="bundler-widget__title">${escapeHtml(rule.title)}</h3>
      ${rule.description ? `<p class="bundler-widget__description">${escapeHtml(rule.description)}</p>` : ""}
      <p class="bundler-widget__discount">${escapeHtml(formatDiscount(rule.discount))}</p>
      <p class="bundler-widget__hint">Current product selected for ${escapeHtml(selectedGroups.map((group) => group.title).join(", ") || "this offer")}.</p>
      <div class="bundler-widget__groups"></div>
      <button class="bundler-widget__button" type="button">Add bundle to cart</button>
      <p class="bundler-widget__status" role="status"></p>
    `;
    const groupsContainer = card.querySelector(".bundler-widget__groups");
    const button = card.querySelector(".bundler-widget__button");
    const status = card.querySelector(".bundler-widget__status");

    missingGroups.forEach((group) => {
      const wrapper = document.createElement("label");
      wrapper.className = "bundler-widget__group";
      wrapper.innerHTML = `
        <span class="bundler-widget__group-title">Add ${escapeHtml(group.minQuantity)} from ${escapeHtml(group.title)}</span>
        <input class="bundler-widget__input" data-bundler-variant-input placeholder="Variant ID" value="${getExactVariantSuggestion(group)}" />
      `;
      groupsContainer.appendChild(wrapper);
    });

    const updateButton = () => {
      const inputs = Array.from(card.querySelectorAll("[data-bundler-variant-input]"));
      button.disabled = inputs.some((input) => !input.value.trim());
    };

    card.addEventListener("input", updateButton);
    button.addEventListener("click", async () => {
      button.disabled = true;
      status.textContent = "Adding bundle...";

      try {
        await addBundleToCart(card, rule, context);
        status.className = "bundler-widget__status bundler-widget__success";
        status.innerHTML = 'Bundle added. <a href="/cart">View cart</a>';
      } catch (error) {
        status.className = "bundler-widget__status bundler-widget__error";
        status.textContent =
          error instanceof Error ? error.message : "Could not add the bundle to cart.";
        updateButton();
      }
    });

    updateButton();
    return card;
  };

  const loadBlock = async (block) => {
    const context = {
      shop: block.dataset.shop,
      apiBase: block.dataset.apiBase || "/apps/bundler",
      productId: block.dataset.productId,
      variantId: block.dataset.variantId,
      sku: block.dataset.sku,
      collectionIds: parseJson(block.dataset.collectionIds || "[]", []),
    };
    const params = new URLSearchParams({
      shop: context.shop,
      productId: context.productId,
      variantId: context.variantId,
      sku: context.sku || "",
      collectionIds: context.collectionIds.join(","),
    });
    const response = await fetch(`${context.apiBase}/bundle-rules?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Could not load bundle offers.");
    }

    const payload = await response.json();
    const rules = Array.isArray(payload.rules) ? payload.rules : [];

    block.innerHTML = "";

    if (rules.length === 0) {
      return;
    }

    rules.forEach((rule) => block.appendChild(renderRule(block, rule, context)));
  };

  document.querySelectorAll(selector).forEach((block) => {
    loadBlock(block).catch((error) => {
      block.innerHTML = `<div class="bundler-widget__error">${escapeHtml(error instanceof Error ? error.message : "Could not load bundle offers.")}</div>`;
    });
  });
})();
