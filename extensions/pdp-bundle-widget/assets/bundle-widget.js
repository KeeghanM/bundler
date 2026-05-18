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

  const formatDiscount = (discount, context) => {
    if (discount.type === "percentage") {
      const template = context.discountPercentageText || "{discount}% off qualifying bundle items";
      return template.replace("{discount}", discount.value);
    }
    const template = context.discountFixedText || "{discount} off qualifying bundle items";
    return template.replace("{discount}", discount.value);
  };

  
  const formatMoney = (amount) => {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: window.Shopify?.currency?.active || "USD" }).format(amount);
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

  const calculateAllocation = (rule, context) => {
    let currentQty = 1;
    const selected = [];
    const missing = [];

    for (const group of rule.groups) {
      let requiredQty = group.minQuantity;

      if (currentQty > 0 && groupMatchesProduct(group, context)) {
        selected.push(group);
        requiredQty -= 1;
        currentQty -= 1;
      }

      if (requiredQty > 0) {
        missing.push({ ...group, missingQuantity: requiredQty });
      }
    }

    return { selectedGroups: selected, missingGroups: missing };
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
    const { selectedGroups, missingGroups } = calculateAllocation(rule, context);
    const mode = context.mode; // dropdowns or message_only
    
    const card = document.createElement("div");
    card.className = "bundler-widget__card";
    
    let html = `
      <p class="bundler-widget__eyebrow">${escapeHtml(context.eyebrow)}</p>
      <h3 class="bundler-widget__title">${escapeHtml(rule.title)}</h3>
      ${rule.description ? `<p class="bundler-widget__description">${escapeHtml(rule.description)}</p>` : ""}
      <p class="bundler-widget__discount">${escapeHtml(formatDiscount(rule.discount, context))}</p>
    `;

    if (missingGroups.length === 0) {
      const unlockedText = (context.unlockedText || "{title} offers unlocked!").replace("{title}", rule.title);
      html += `<p class="bundler-widget__hint">${escapeHtml(unlockedText)}</p>`;
    } else {
      if (selectedGroups.length > 0) {
        const groupsString = selectedGroups.map((g) => g.title).join(", ");
        const currentProductText = (context.currentProductText || "Current product selected for {groups}.").replace("{groups}", groupsString);
        html += `<p class="bundler-widget__hint">${escapeHtml(currentProductText)}</p>`;
      }
    }

    if ((mode === "dropdowns" || mode === "carousel") && missingGroups.length > 0) {
      html += `<div class="bundler-widget__groups"></div>`;
    }

    if (mode === "dropdowns" || mode === "carousel" || missingGroups.length === 0) {
      html += `<button class="bundler-widget__button" type="button">${escapeHtml(context.buttonText)}</button>`;
    } else if (mode === "message_only" && missingGroups.length > 0) {
      const msgs = missingGroups.map(g => `${g.missingQuantity} from ${g.title}`).join(" and ");
      const addToUnlockText = (context.addToUnlockText || "Add {missing} to unlock.").replace("{missing}", msgs);
      html += `<p class="bundler-widget__hint">${escapeHtml(addToUnlockText)}</p>`;
    }

    html += `<p class="bundler-widget__status" role="status"></p>`;
    card.innerHTML = html;

    const button = card.querySelector(".bundler-widget__button");
    const status = card.querySelector(".bundler-widget__status");

    if ((mode === "dropdowns" || mode === "carousel") && missingGroups.length > 0) {
      const groupsContainer = card.querySelector(".bundler-widget__groups");
      
      missingGroups.forEach((group) => {
        for (let i = 0; i < group.missingQuantity; i++) {
          const wrapper = document.createElement("div");
          
          if (mode === "dropdowns") {
            wrapper.className = "bundler-widget__group";
            let selectHtml = `<select class="bundler-widget__input" data-bundler-variant-input>`;
            selectHtml += `<option value="">Select ${escapeHtml(group.title)}...</option>`;
            if (group.variants && group.variants.length > 0) {
              group.variants.forEach(v => {
                selectHtml += `<option value="${escapeHtml(toNumericId(v.id))}">${escapeHtml(v.title)}</option>`;
              });
            }
            selectHtml += `</select>`;

            wrapper.innerHTML = `
              <span class="bundler-widget__group-title">Add 1 ${escapeHtml(group.title)}</span>
              ${selectHtml}
            `;
            groupsContainer.appendChild(wrapper);
            
          } else if (mode === "carousel") {
            wrapper.className = "bundler-widget__carousel-wrapper";
            wrapper.innerHTML = `<span class="bundler-widget__group-title">Add 1 ${escapeHtml(group.title)}</span>`;
            
            // Hidden input to hold the selected variant for this carousel
            const hiddenInput = document.createElement("input");
            hiddenInput.type = "hidden";
            hiddenInput.setAttribute("data-bundler-variant-input", "true");
            hiddenInput.value = "";
            wrapper.appendChild(hiddenInput);

            const carousel = document.createElement("div");
            carousel.className = "bundler-widget__carousel";
            
            if (group.variants && group.variants.length > 0) {
              group.variants.forEach(v => {
                const item = document.createElement("div");
                item.className = "bundler-widget__carousel-item";
                
                let cardHtml = "";
                if (context.customCardHtml) {
                  cardHtml = context.customCardHtml
                    .replace(/{image}/g, `<img class="bundler-widget__carousel-image" src="${escapeHtml(v.image || '')}" alt="${escapeHtml(v.title)}" />`)
                    .replace(/{title}/g, escapeHtml(v.title))
                    .replace(/{price}/g, formatMoney(v.price))
                    .replace(/{button}/g, `<button type="button" class="bundler-widget__carousel-btn">Select</button>`);
                } else {
                  cardHtml = `
                    <img class="bundler-widget__carousel-image" src="${escapeHtml(v.image || '')}" alt="${escapeHtml(v.title)}" />
                    <div class="bundler-widget__carousel-content">
                      <p class="bundler-widget__carousel-title">${escapeHtml(v.title)}</p>
                      <p class="bundler-widget__carousel-price">${formatMoney(v.price)}</p>
                      <button type="button" class="bundler-widget__carousel-btn">Select</button>
                    </div>
                  `;
                }
                item.innerHTML = cardHtml;

                const btn = item.querySelector(".bundler-widget__carousel-btn");
                if (btn) {
                  btn.addEventListener("click", () => {
                    // clear others
                    carousel.querySelectorAll(".bundler-widget__carousel-item").forEach(el => el.classList.remove("is-selected"));
                    carousel.querySelectorAll(".bundler-widget__carousel-btn").forEach(el => el.textContent = "Select");
                    
                    item.classList.add("is-selected");
                    btn.textContent = "Selected";
                    hiddenInput.value = toNumericId(v.id);
                    hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
                  });
                }
                
                carousel.appendChild(item);
              });
            } else {
              carousel.innerHTML = `<p class="bundler-widget__hint">No eligible products found.</p>`;
            }

            wrapper.appendChild(carousel);
            groupsContainer.appendChild(wrapper);
          }
        }
      });
    }

    const updateButton = () => {
      if (!button) return;
      const inputs = Array.from(card.querySelectorAll("[data-bundler-variant-input]"));
      button.disabled = inputs.some((input) => !input.value.trim());
    };

    if (mode === "dropdowns" || mode === "carousel") {
      card.addEventListener("input", updateButton);
    }

    if (button) {
      button.addEventListener("click", async () => {
        button.disabled = true;
        status.textContent = context.loadingText || "Adding bundle...";

        try {
          await addBundleToCart(card, rule, context);
          status.className = "bundler-widget__status bundler-widget__success";
          status.innerHTML = 'Bundle added. <a href="/cart">View cart</a>';
        } catch (error) {
          status.className = "bundler-widget__status bundler-widget__error";
          status.textContent = error instanceof Error ? error.message : "Could not add the bundle to cart.";
          updateButton();
        }
      });
      updateButton();
    }

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
      mode: block.dataset.mode || "dropdowns",
      customCardHtml: block.dataset.customCardHtml || "",
      eyebrow: block.dataset.eyebrow || "Bundle offer",
      buttonText: block.dataset.buttonText || "Add bundle to cart",
      currentProductText: block.dataset.currentProductText,
      addToUnlockText: block.dataset.addToUnlockText,
      unlockedText: block.dataset.unlockedText,
      discountPercentageText: block.dataset.discountPercentageText,
      discountFixedText: block.dataset.discountFixedText,
      loadingText: block.dataset.loadingText
    };
    
    const params = new URLSearchParams({
      shop: context.shop,
      productId: context.productId,
      variantId: context.variantId,
      sku: context.sku || "",
      collectionIds: context.collectionIds.join(","),
      mode: context.mode,
      limit: "100"
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
    loadBlock(block).catch(() => {
      block.innerHTML = "";
    });
  });
})();
